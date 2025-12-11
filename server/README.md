# PremiumHatStore FastAPI Backend

FastAPI backend for PremiumHatStore Telegram Mini App with slot game and Telegram Stars payments.

## 🎰 Features

- **Telegram Bot API Integration**: Send slot dice and receive results
- **Telegram Stars Payments**: Create invoices and handle payments
- **Webhook Handler**: Process payment events and pre-checkout queries
- **User Authentication**: Telegram WebApp init data verification
- **Dice Mapping**: 64 unique slot outcomes with symbols (bar, lemon, grape, 777)
- **Session Management**: File-based user session storage
- **CORS Enabled**: Ready for frontend integration

## 📋 Prerequisites

- Python 3.8+
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- Telegram Channel/Group for posting results

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd server
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:
```env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
CHANNEL_ID=@your_channel
TELEGRAM_WEBHOOK_SECRET=your_secret_key
PORT=5174
```

### 3. Prepare Mapping File

Copy the dice mapping from PremiumHatStore:
```bash
cp ../PremiumHatStore/server/maping.json ./mapping.json
```

Or create your own `mapping.json` with 64 entries mapping dice values (1-64) to slot symbols.

### 4. Run the Server

```bash
python main.py
```

Or with uvicorn directly:
```bash
uvicorn main:app --host 0.0.0.0 --port 5174 --reload
```

The server will start at `http://localhost:5174`

## 📚 API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:5174/docs
- **ReDoc**: http://localhost:5174/redoc

## 🔌 API Endpoints

### Core Endpoints

- `GET /` - Server info page
- `GET /status` - Health check
- `GET /docs` - Interactive API documentation

### Slot Game

- `POST /api/send-slot-dice` - Send dice and get result
  ```json
  {
    "userId": 123456789,
    "betAmount": 50
  }
  ```

- `POST /slots/create-invoice` - Create payment invoice
  ```json
  {
    "bet_amount": 50,
    "user_id": 123456789
  }
  ```

- `POST /slots/spin` - Perform spin (after payment)

### Authentication

- `POST /api/auth/telegram` - Authenticate via Telegram
  ```json
  {
    "profile": {
      "id": 123456789,
      "first_name": "John",
      "username": "johndoe"
    },
    "init_data": "telegram_init_data_string"
  }
  ```

### Telegram Webhook

- `POST /api/telegram-webhook` - Telegram webhook endpoint
  - Handles `pre_checkout_query`
  - Handles `successful_payment`

### User Endpoints

- `GET /api/users/me` - Get current user (requires auth)
- `GET /api/spins` - Get recent spins
- `GET /slots/history` - Get user spin history

## 🔒 Setting Up Telegram Webhook

To receive payment notifications, set up a webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/api/telegram-webhook",
    "secret_token": "your_webhook_secret"
  }'
```

For local development, use [ngrok](https://ngrok.com/):
```bash
ngrok http 5174
# Use the ngrok URL for webhook
```

## 🎲 How It Works

1. **User initiates payment**: Frontend calls `/slots/create-invoice`
2. **Invoice created**: Backend generates Telegram Stars invoice
3. **User pays**: Opens invoice in Telegram and completes payment
4. **Webhook notification**: Telegram sends `successful_payment` to webhook
5. **Spin performed**: Backend sends dice to channel, maps result, sends notification
6. **Result displayed**: Frontend polls for result or receives via Telegram

## 🗂️ File Structure

```
server/
├── main.py              # FastAPI application
├── requirements.txt     # Python dependencies
├── .env.example        # Environment variables template
├── mapping.json        # Dice value to symbols mapping (64 entries)
├── sessions.json       # User sessions (auto-created)
├── last-spin.json      # Last spin result (auto-created)
└── README.md           # This file
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | Bot token from @BotFather |
| `CHANNEL_ID` | Yes | Channel/group ID for posting results |
| `TELEGRAM_WEBHOOK_SECRET` | Recommended | Secret for webhook verification |
| `PORT` | No | Server port (default: 5174) |

### Dice Mapping Format

The `mapping.json` should contain 64 entries:

```json
[
  {
    "value": 1,
    "first": "bar",
    "second": "bar",
    "third": "bar"
  },
  ...
  {
    "value": 64,
    "first": "seven",
    "second": "seven",
    "third": "seven"
  }
]
```

Supported symbols: `bar`, `grape`, `lemon`, `seven` (converted to `777`)

## 🧪 Testing

Test the API with curl:

```bash
# Health check
curl http://localhost:5174/status

# Send test spin (requires bot configured)
curl -X POST http://localhost:5174/api/send-slot-dice \
  -H "Content-Type: application/json" \
  -d '{"userId": 123456789, "betAmount": 50}'

# Create invoice
curl -X POST http://localhost:5174/slots/create-invoice \
  -H "Content-Type: application/json" \
  -d '{"bet_amount": 50, "user_id": 123456789}'
```

## 🔐 Security Notes

- **Webhook Secret**: Always use a webhook secret in production
- **Init Data Verification**: The backend verifies Telegram WebApp init data signatures
- **CORS**: Configure `allow_origins` for production (currently set to `*` for development)
- **HTTPS**: Use HTTPS in production for webhooks

## 📈 Future Enhancements

- [ ] Add database support (PostgreSQL/SQLite)
- [ ] Implement user balance tracking
- [ ] Add spin history persistence
- [ ] Create leaderboard system
- [ ] Add multiple game modes (Jackpot, Double, Battles)
- [ ] Implement gift system
- [ ] Add admin panel

## 🐛 Troubleshooting

### Bot not configured error
- Check that `TELEGRAM_BOT_TOKEN` and `CHANNEL_ID` are set in `.env`

### Mapping file errors
- Ensure `mapping.json` exists with 64 entries
- Verify JSON format is valid

### Webhook not receiving events
- Verify webhook is set correctly with Telegram
- Check webhook secret matches
- Ensure server is accessible from internet (use ngrok for local dev)

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! This FastAPI backend is compatible with the PremiumHatStore React frontend.

## 📧 Support

For issues related to:
- **Telegram Bot API**: https://core.telegram.org/bots/api
- **FastAPI**: https://fastapi.tiangolo.com/
- **Telegram Stars**: https://core.telegram.org/bots/payments#stars
