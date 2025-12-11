"""
FastAPI Backend for PremiumHatStore Telegram Bot Integration
Handles Telegram Bot API, payments, slot spins, and user management
"""

from fastapi import FastAPI, HTTPException, Request, Header, Depends
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import httpx
import json
import os
from pathlib import Path
from datetime import datetime
import hmac
import hashlib
from urllib.parse import parse_qs
import logging
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="PremiumHatStore API",
    description="Telegram Bot API integration for slot game with Telegram Stars payments",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment variables
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
CHANNEL_ID = os.getenv("CHANNEL_ID", "")
WEBHOOK_SECRET = os.getenv("TELEGRAM_WEBHOOK_SECRET", os.getenv("WEBHOOK_SECRET", ""))
PORT = int(os.getenv("PORT", "5174"))

# Paths
BASE_DIR = Path(__file__).parent
MAPPING_FILE = BASE_DIR / "mapping.json"
SESSIONS_FILE = BASE_DIR / "sessions.json"
LAST_SPIN_FILE = BASE_DIR / "last-spin.json"
STATIC_DIR = BASE_DIR.parent / "app" / "static"

# Telegram API URL
TELEGRAM_API = f"https://api.telegram.org/bot{BOT_TOKEN}"

# ==================== Pydantic Models ====================

class TelegramProfile(BaseModel):
    id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    language_code: Optional[str] = None


class TelegramAuthRequest(BaseModel):
    profile: TelegramProfile
    init_data: Optional[str] = None


class SpinRequest(BaseModel):
    userId: Optional[int] = None
    betAmount: Optional[int] = 0


class InvoiceRequest(BaseModel):
    bet_amount: int = Field(ge=1)
    user_id: Optional[int] = None


class SpinResult(BaseModel):
    symbols: List[str]
    diceValue: int
    isWin: bool
    isJackpot: bool
    text: Optional[str] = None
    diceMessageId: Optional[int] = None


class User(BaseModel):
    id: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None


# ==================== Dice Mapping ====================

def load_dice_mapping() -> Dict[int, List[str]]:
    """Load dice value to symbols mapping from JSON file"""
    try:
        if MAPPING_FILE.exists():
            with open(MAPPING_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            mapping = {}
            for entry in data:
                value = entry["value"]
                first = entry["first"].lower()
                second = entry["second"].lower()
                third = entry["third"].lower()
                
                # Normalize "seven" to "777"
                normalize = lambda s: "777" if s == "seven" else s
                mapping[value] = [normalize(first), normalize(second), normalize(third)]
            
            if len(mapping) != 64:
                logger.error(f"Mapping file does not contain 64 values (found {len(mapping)})")
                raise ValueError("Invalid mapping file")
            
            logger.info(f"Dice mapping loaded: {len(mapping)} values")
            return mapping
        else:
            logger.warning(f"Mapping file not found: {MAPPING_FILE}")
            # Fallback mapping
            return {
                1: ["bar", "bar", "bar"],
                22: ["grape", "grape", "grape"],
                43: ["lemon", "lemon", "lemon"],
                64: ["777", "777", "777"],
            }
    except Exception as e:
        logger.error(f"Failed to load mapping: {e}")
        return {
            1: ["bar", "bar", "bar"],
            22: ["grape", "grape", "grape"],
            43: ["lemon", "lemon", "lemon"],
            64: ["777", "777", "777"],
        }


DICE_MAPPING = load_dice_mapping()


def dice_value_to_symbols(value: int) -> List[str]:
    """Convert dice value to slot symbols"""
    if value not in DICE_MAPPING:
        logger.warning(f"Missing dice value mapping for {value}")
        return ["bar", "lemon", "grape"]
    return DICE_MAPPING[value]


# ==================== Telegram Bot Functions ====================

async def send_dice_to_telegram() -> Dict[str, Any]:
    """Send slot machine dice to Telegram channel"""
    if not BOT_TOKEN or not CHANNEL_ID:
        raise HTTPException(status_code=500, detail="Telegram bot not configured")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{TELEGRAM_API}/sendDice",
            json={"chat_id": CHANNEL_ID, "emoji": "🎰"},
            timeout=30.0
        )
        data = response.json()
        
        if not data.get("ok"):
            raise HTTPException(status_code=500, detail=f"Telegram failed to send dice: {data}")
        
        return data["result"]


async def send_result_message(dice_message_id: int, text: str):
    """Send result message to Telegram channel"""
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{TELEGRAM_API}/sendMessage",
                json={
                    "chat_id": CHANNEL_ID,
                    "text": text,
                    "reply_to_message_id": dice_message_id
                },
                timeout=30.0
            )
    except Exception as e:
        logger.warning(f"Failed to send result message: {e}")


async def perform_spin(user_id: Any, bet_amount: Any) -> SpinResult:
    """
    Perform a complete spin:
    1. Send dice to Telegram
    2. Map dice value to symbols
    3. Send result message
    4. Return spin result
    """
    # 1. Send dice
    dice_result = await send_dice_to_telegram()
    dice_value = dice_result["dice"]["value"]
    dice_message_id = dice_result["message_id"]
    
    # 2. Convert using mapping
    symbols = dice_value_to_symbols(dice_value)
    is_win = len(set(symbols)) == 1
    is_jackpot = dice_value == 64
    
    # 3. Format message
    emoji_map = {
        "777": "7️⃣",
        "lemon": "🍋",
        "grape": "🍇",
        "bar": "🎰",
    }
    
    pretty = " ".join([emoji_map.get(s, s) for s in symbols])
    status = "🎰💰 JACKPOT! 💰🎰" if is_jackpot else ("✅ WIN" if is_win else "❌ Lose")
    
    text = (
        "━━━━━━━━━━━━━━\n"
        f"👤 User: {user_id}\n"
        f"💰 Bet: {bet_amount}\n"
        "━━━━━━━━━━━━━━\n"
        f"🎲 Value: {dice_value}/64\n"
        f"🎯 Result: {pretty}\n"
        "━━━━━━━━━━━━━━\n"
        f"{status}\n"
        "━━━━━━━━━━━━━━"
    )
    
    # 4. Send result message
    await send_result_message(dice_message_id, text)
    
    # 5. Persist last spin
    result = SpinResult(
        symbols=symbols,
        diceValue=dice_value,
        isWin=is_win,
        isJackpot=is_jackpot,
        text=text,
        diceMessageId=dice_message_id
    )
    
    try:
        with open(LAST_SPIN_FILE, 'w', encoding='utf-8') as f:
            json.dump({
                "ts": datetime.now().isoformat(),
                "userId": str(user_id),
                "betAmount": bet_amount,
                "result": result.dict()
            }, f, indent=2)
    except Exception as e:
        logger.warning(f"Failed to persist last spin: {e}")
    
    return result


# ==================== Session Management ====================

def load_sessions() -> Dict[str, Any]:
    """Load user sessions from file"""
    try:
        if SESSIONS_FILE.exists():
            with open(SESSIONS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        logger.warning(f"Failed to read sessions file: {e}")
    return {}


def save_sessions(sessions: Dict[str, Any]):
    """Save user sessions to file"""
    try:
        with open(SESSIONS_FILE, 'w', encoding='utf-8') as f:
            json.dump(sessions, f, indent=2)
    except Exception as e:
        logger.warning(f"Failed to write sessions file: {e}")


# ==================== Authentication ====================

def verify_telegram_init_data(init_data: str) -> Optional[Dict[str, Any]]:
    """
    Verify Telegram WebApp init data signature
    Returns parsed data if valid, None otherwise
    """
    if not BOT_TOKEN or not init_data:
        return None
    
    try:
        # Parse init data
        parsed = parse_qs(init_data)
        hash_value = parsed.get('hash', [None])[0]
        
        if not hash_value:
            return None
        
        # Create data check string
        data_check_arr = []
        for key, values in parsed.items():
            if key != 'hash':
                data_check_arr.append(f"{key}={values[0]}")
        data_check_arr.sort()
        data_check_string = '\n'.join(data_check_arr)
        
        # Compute hash
        secret_key = hmac.new(
            "WebAppData".encode(),
            BOT_TOKEN.encode(),
            hashlib.sha256
        ).digest()
        
        computed_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if computed_hash == hash_value:
            return dict(parsed)
        
    except Exception as e:
        logger.error(f"Error verifying init data: {e}")
    
    return None


async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[User]:
    """Extract user from Telegram init data in Authorization header"""
    if not authorization or not authorization.startswith("tma "):
        return None
    
    init_data = authorization[4:]  # Remove "tma " prefix
    verified = verify_telegram_init_data(init_data)
    
    if verified and 'user' in verified:
        try:
            user_data = json.loads(verified['user'][0])
            return User(
                id=str(user_data.get('id')),
                first_name=user_data.get('first_name'),
                last_name=user_data.get('last_name'),
                username=user_data.get('username'),
                photo_url=user_data.get('photo_url')
            )
        except Exception as e:
            logger.error(f"Error parsing user data: {e}")
    
    return None


# ==================== API Routes ====================

@app.get("/", response_class=HTMLResponse)
async def root():
    """Root endpoint - serves frontend if available, else API info"""
    index_path = STATIC_DIR / "index.html"
    if index_path.exists():
        return HTMLResponse(content=index_path.read_text(encoding='utf-8'), status_code=200)
    
    return """
    <html>
      <head><meta charset="utf-8"><title>PremiumHatStore Backend (FastAPI)</title></head>
      <body style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;line-height:1.6;padding:24px;">
        <h1>🎰 PremiumHatStore Backend (FastAPI)</h1>
        <p>Server is running. Available endpoints:</p>
        <ul>
          <li><a href="/docs">/docs</a> - Interactive API documentation (Swagger UI)</li>
          <li><a href="/redoc">/redoc</a> - Alternative API documentation (ReDoc)</li>
          <li><a href="/status">/status</a> - Server status</li>
          <li>/api/send-slot-dice (POST) - Send slot dice</li>
          <li>/api/telegram-webhook (POST) - Telegram webhook endpoint</li>
          <li>/api/auth/telegram (POST) - Telegram authentication</li>
          <li>/slots/create-invoice (POST) - Create payment invoice</li>
          <li>/slots/spin (POST) - Perform spin after payment</li>
        </ul>
        <p>Client (dev) is usually served by Vite at <a href="http://localhost:5173">http://localhost:5173</a>.</p>
        <p><strong>Note:</strong> Built client not found at <code>app/static/index.html</code>.</p>
      </body>
    </html>
    """


@app.get("/status")
async def status():
    """Server status endpoint"""
    return {
        "ok": True,
        "ts": datetime.now().isoformat(),
        "env": {
            "port": PORT,
            "bot_configured": bool(BOT_TOKEN),
            "channel_configured": bool(CHANNEL_ID)
        }
    }


@app.post("/api/send-slot-dice")
async def send_slot_dice(request: SpinRequest):
    """
    Send slot machine dice to Telegram channel
    Returns the spin result with symbols
    """
    if not BOT_TOKEN or not CHANNEL_ID:
        raise HTTPException(status_code=500, detail="Telegram bot not configured")
    
    try:
        result = await perform_spin(
            request.userId or "unknown",
            request.betAmount or 0
        )
        return result.dict(exclude={'text', 'diceMessageId'})
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Slot dice send error: {e}")
        raise HTTPException(status_code=500, detail=f"Dice send failed: {str(e)}")


@app.post("/api/auth/telegram")
async def telegram_auth(auth_request: TelegramAuthRequest):
    """
    Authenticate user via Telegram WebApp
    Stores session information in file-based storage
    """
    if not auth_request.profile or not auth_request.profile.id:
        raise HTTPException(status_code=400, detail="profile.id is required")
    
    sessions = load_sessions()
    
    # Store user session
    user_id = str(auth_request.profile.id)
    sessions[user_id] = {
        "id": auth_request.profile.id,
        "first_name": auth_request.profile.first_name,
        "last_name": auth_request.profile.last_name,
        "username": auth_request.profile.username,
        "photo_url": auth_request.profile.photo_url,
        "language_code": auth_request.profile.language_code,
        "received_at": datetime.now().isoformat(),
        "init_data": auth_request.init_data
    }
    
    save_sessions(sessions)
    
    return {"ok": True, "userId": auth_request.profile.id}


@app.post("/slots/create-invoice")
async def create_slot_invoice(invoice_request: InvoiceRequest):
    """
    Create Telegram Stars payment invoice for slot game
    Returns invoice URL for Telegram payment
    """
    if not BOT_TOKEN:
        raise HTTPException(status_code=500, detail="Telegram bot not configured")
    
    bet_amount = invoice_request.bet_amount
    user_id = invoice_request.user_id or "unknown"
    
    # Create invoice payload
    payload = json.dumps({"userId": user_id, "betAmount": bet_amount})
    
    # Telegram invoice parameters
    invoice_params = {
        "title": f"🎰 Slot Spin - {bet_amount} Stars",
        "description": f"Spin the slot machine for {bet_amount} Telegram Stars",
        "payload": payload,
        "provider_token": "",  # Empty for Stars
        "currency": "XTR",  # Telegram Stars currency
        "prices": [{"label": f"Spin for {bet_amount} Stars", "amount": bet_amount}]
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{TELEGRAM_API}/createInvoiceLink",
                json=invoice_params,
                timeout=30.0
            )
            data = response.json()
            
            if not data.get("ok"):
                raise HTTPException(status_code=500, detail=f"Failed to create invoice: {data}")
            
            invoice_url = data["result"]
            return {"invoice_url": invoice_url}
            
    except httpx.HTTPError as e:
        logger.error(f"HTTP error creating invoice: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create invoice: {str(e)}")


@app.post("/slots/spin")
async def slots_spin(request: SpinRequest):
    """
    Perform slot spin (usually called after successful payment)
    Returns spin result
    """
    try:
        result = await perform_spin(
            request.userId or "unknown",
            request.betAmount or 0
        )
        return result.dict()
    except Exception as e:
        logger.error(f"Spin error: {e}")
        raise HTTPException(status_code=500, detail=f"Spin failed: {str(e)}")


@app.post("/api/telegram-webhook")
async def telegram_webhook(request: Request):
    """
    Telegram bot webhook endpoint
    Handles pre_checkout_query and successful_payment events
    """
    # Verify webhook secret if configured
    if WEBHOOK_SECRET:
        received_secret = request.headers.get("x-telegram-bot-api-secret-token")
        if not received_secret or received_secret != WEBHOOK_SECRET:
            logger.warning(f"Webhook secret mismatch: {received_secret}")
            raise HTTPException(status_code=401, detail="Unauthorized")
    
    update = await request.json()
    
    # Handle pre_checkout_query
    if "pre_checkout_query" in update:
        query = update["pre_checkout_query"]
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{TELEGRAM_API}/answerPreCheckoutQuery",
                    json={"pre_checkout_query_id": query["id"], "ok": True},
                    timeout=30.0
                )
        except Exception as e:
            logger.error(f"Failed to answer pre_checkout_query: {e}")
    
    # Handle successful payment
    if "message" in update and "successful_payment" in update["message"]:
        msg = update["message"]
        payment = msg["successful_payment"]
        chat_id = msg["chat"]["id"]
        payload = payment.get("invoice_payload", "")
        
        # Extract userId and betAmount from payload
        user_id = msg.get("from", {}).get("id", chat_id)
        bet_amount = 0
        
        if payload:
            try:
                if payload.strip().startswith('{'):
                    parsed = json.loads(payload)
                    user_id = parsed.get("userId", user_id)
                    bet_amount = parsed.get("betAmount", 0)
                else:
                    # Parse naive key:value format
                    parts = payload.replace(',', '|').replace(';', '|').split('|')
                    for part in parts:
                        if ':' in part:
                            key, value = part.split(':', 1)
                            key = key.strip()
                            value = value.strip()
                            if key in ['userId', 'uid']:
                                user_id = int(value) if value.isdigit() else value
                            elif key in ['betAmount', 'bet']:
                                bet_amount = int(value) if value.isdigit() else 0
            except Exception as e:
                logger.warning(f"Failed to parse invoice payload: {e}")
        
        # Perform spin
        try:
            spin_result = await perform_spin(user_id, bet_amount)
            
            # Send private notification to payer
            try:
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"{TELEGRAM_API}/sendMessage",
                        json={
                            "chat_id": chat_id,
                            "text": f"Your spin result:\n{spin_result.text}"
                        },
                        timeout=30.0
                    )
            except Exception as e:
                logger.warning(f"Failed to send private notification: {e}")
                
        except Exception as e:
            logger.error(f"Error performing spin after successful payment: {e}")
    
    return {"ok": True}


@app.get("/api/spins")
async def get_spins(
    my: Optional[bool] = False,
    limit: Optional[int] = 10,
    user: Optional[User] = Depends(get_current_user)
):
    """
    Get recent spins (placeholder - implement with database)
    """
    # This is a placeholder. In production, implement with a database
    if my and not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    return []


@app.get("/slots/history")
async def slots_history(
    user_id: Optional[int] = None,
    limit: int = 10,
    user: Optional[User] = Depends(get_current_user)
):
    """
    Get spin history for user (placeholder - implement with database)
    """
    # This is a placeholder. In production, implement with a database
    if not user_id and not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    return {"history": []}


@app.get("/api/users/me")
async def get_current_user_info(user: Optional[User] = Depends(get_current_user)):
    """Get current authenticated user information"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


# ==================== Static Files ====================

# Serve built client if available
if STATIC_DIR.exists():
    logger.info(f"Serving built client from {STATIC_DIR}")
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve SPA for all unmatched routes"""
        index_path = STATIC_DIR / "index.html"
        if index_path.exists():
            return HTMLResponse(content=index_path.read_text(), status_code=200)
        raise HTTPException(status_code=404, detail="Not found")
else:
    logger.info(f"Built client not found at {STATIC_DIR}")


# ==================== Main ====================

if __name__ == "__main__":
    import uvicorn
    
    if not BOT_TOKEN:
        logger.warning("⚠️  TELEGRAM_BOT_TOKEN is missing!")
    if not CHANNEL_ID:
        logger.warning("⚠️  CHANNEL_ID is missing!")
    
    logger.info(f"🚀 Starting FastAPI server on http://localhost:{PORT}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
