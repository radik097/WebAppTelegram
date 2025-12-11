import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

dotenv.config();

// __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json());

// Basic health / root route so GET / doesn't return 'Cannot GET /'
app.get('/', (req: Request, res: Response) => {
  res.send(`
    <html>
      <head><meta charset="utf-8"><title>PremiumHatStore Backend</title></head>
      <body style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;line-height:1.6;padding:24px;">
        <h1>PremiumHatStore Backend</h1>
        <p>Server is running. Available endpoints:</p>
        <ul>
          <li><a href="/api/send-slot-dice">/api/send-slot-dice</a> (POST)</li>
          <li><a href="/api/telegram-webhook">/api/telegram-webhook</a> (POST webhook endpoint)</li>
          <li><a href="/api/auth/telegram">/api/auth/telegram</a> (POST)</li>
        </ul>
        <p>Client (dev) is usually served by Vite at <a href="https://localhost:5173">https://localhost:5173</a>.</p>
      </body>
    </html>
  `);
});

app.get('/status', (req: Request, res: Response) => {
  res.json({ ok: true, ts: Date.now(), env: { port: process.env.PORT || null } });
});

// Serve built client static files if present (app/static created by `vite build`)
const builtClientPath = path.join(__dirname, '..', 'app', 'static');
if (fs.existsSync(builtClientPath)) {
  console.log('Serving built client from', builtClientPath);
  app.use(express.static(builtClientPath));

  // Fallback to index.html for SPA routes
  app.get('*', (req: Request, res: Response) => {
    const indexPath = path.join(builtClientPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Not found');
    }
  });
} else {
  console.log('Built client not found at', builtClientPath, '- visit / to see API info.');
}

// -------------------------
// Telegram Config
// -------------------------
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

if (!BOT_TOKEN) console.warn("TELEGRAM_BOT_TOKEN is missing");
if (!CHANNEL_ID) console.warn("CHANNEL_ID is missing");

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || null;

// -------------------------
// Dice Mapping Loader
// -------------------------

interface DiceMappingEntry {
  value: number;
  first: string;
  second: string;
  third: string;
}

type DiceMapType = Record<number, string[]>;

let DICE_MAPPING: DiceMapType = {};

function loadDiceMapping(): DiceMapType {
  const mappingPath = path.join(__dirname, "maping.json");

  try {
    const raw = fs.readFileSync(mappingPath, "utf-8");
    const data: DiceMappingEntry[] = JSON.parse(raw);

    const mapping: DiceMapType = {};

    for (const entry of data) {
      const normalize = (s: string) =>
        s.toLowerCase() === "seven" ? "777" : s;

      mapping[entry.value] = [
        normalize(entry.first),
        normalize(entry.second),
        normalize(entry.third),
      ];
    }

    if (Object.keys(mapping).length !== 64) {
      console.error("Mapping file does not contain 64 values");
      throw new Error("Invalid mapping file");
    }

    console.log("Dice mapping loaded:", Object.keys(mapping).length, "values");
    return mapping;
  } catch (err) {
    console.error("Failed to load maping.json:", err);

    return {
      1: ["bar", "bar", "bar"],
      22: ["grape", "grape", "grape"],
      43: ["lemon", "lemon", "lemon"],
      64: ["777", "777", "777"],
    };
  }
}

DICE_MAPPING = loadDiceMapping();

function diceValueToSymbols(value: number): string[] {
  if (!DICE_MAPPING[value]) {
    console.warn("Missing dice value mapping for", value);
    return ["bar", "lemon", "grape"];
  }
  return DICE_MAPPING[value];
}

// Reusable performSpin: sends dice, maps symbols, posts result, and returns the result object.
async function performSpin(userId: number | string, betAmount: number | string) {
  // 1. Send dice
  const diceResp = await axios.post(`${TELEGRAM_API}/sendDice`, {
    chat_id: CHANNEL_ID,
    emoji: "🎰",
  });

  if (!diceResp.data?.ok) {
    throw new Error(`Telegram failed to send dice: ${JSON.stringify(diceResp.data)}`);
  }

  const diceValue = diceResp.data.result.dice.value as number;
  const diceMessageId = diceResp.data.result.message_id as number;

  // 2. Convert using mapping.json
  const symbols = diceValueToSymbols(diceValue);
  const isWin = new Set(symbols).size === 1;
  const isJackpot = diceValue === 64;

  const emojiMap: Record<string, string> = {
    "777": "7️⃣",
    lemon: "🍋",
    grape: "🍇",
    bar: "🎰",
  };

  const pretty = symbols.map((s) => emojiMap[s] ?? s).join(" ");

  const status = isJackpot ? "🎰💰 JACKPOT! 💰🎰" : isWin ? "✅ WIN" : "❌ Lose";

  const text =
    `━━━━━━━━━━━━━━\n` +
    `👤 User: ${userId}\n` +
    `💰 Bet: ${betAmount}\n` +
    `━━━━━━━━━━━━━━\n` +
    `🎲 Value: ${diceValue}/64\n` +
    `🎯 Result: ${pretty}\n` +
    `━━━━━━━━━━━━━━\n` +
    `${status}\n` +
    `━━━━━━━━━━━━━━`;

  // 3. Send result message (reply to dice)
  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: CHANNEL_ID,
      text,
      reply_to_message_id: diceMessageId,
    });
  } catch (err) {
    console.warn("Failed to send result message:", err);
  }

  const result = { symbols, diceValue, isWin, isJackpot, text, diceMessageId };

  // persist last spin for audit/debug
  try {
    const outPath = path.join(__dirname, "last-spin.json");
    fs.writeFileSync(outPath, JSON.stringify({ ts: Date.now(), userId, betAmount, result }, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to persist last spin:", err);
  }

  return result;
}

// -------------------------
// Slot Dice Sender
// -------------------------

app.post("/api/send-slot-dice", async (req: Request, res: Response) => {
  const { userId, betAmount } = req.body;

  if (!BOT_TOKEN || !CHANNEL_ID) {
    return res.status(500).json({ error: "Telegram bot not configured" });
  }

  try {
    const result = await performSpin(userId ?? "unknown", betAmount ?? 0);
    return res.json({ symbols: result.symbols, diceValue: result.diceValue, isWin: result.isWin, isJackpot: result.isJackpot });
  } catch (err: any) {
    console.error("Slot dice send error:", err?.response?.data || err?.message || err);
    return res.status(500).json({ error: "Dice send failed", details: err?.message ?? err });
  }
});

// -------------------------
// Telegram auth endpoint (simple file-backed sessions)
// -------------------------

app.post('/api/auth/telegram', async (req: Request, res: Response) => {
  const body = req.body as any;
  const profile = body?.profile ?? null;
  const initData = body?.init_data ?? null;

  if (!profile || !profile.id) {
    return res.status(400).json({ error: 'profile.id is required' });
  }

  const sessionsPath = path.join(__dirname, 'sessions.json');
  let sessions: Record<string, any> = {};
  try {
    if (fs.existsSync(sessionsPath)) {
      const raw = fs.readFileSync(sessionsPath, 'utf-8');
      sessions = JSON.parse(raw || '{}');
    }
  } catch (err) {
    console.warn('Failed to read sessions file', err);
  }

  // Store minimal public profile and received initData (not verified)
  sessions[String(profile.id)] = {
    id: profile.id,
    first_name: profile.first_name ?? null,
    last_name: profile.last_name ?? null,
    username: profile.username ?? null,
    photo_url: profile.photo_url ?? null,
    language_code: profile.language_code ?? null,
    received_at: Date.now(),
    init_data: initData ?? null,
  };

  try {
    fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to write sessions file', err);
  }

  return res.json({ ok: true, userId: profile.id });
});

// -------------------------
// Start Server
// -------------------------

const SERVER_PORT = Number(process.env.PORT || 5174);
app.listen(SERVER_PORT, () =>
  console.log(`Server running at http://localhost:${SERVER_PORT}`)
);

export default app;

// -------------------------
// Telegram webhook handler
// -------------------------

app.post('/api/telegram-webhook', async (req: Request, res: Response) => {
  const update = req.body as any;

  // If a webhook secret is configured, verify the header
  if (TELEGRAM_WEBHOOK_SECRET) {
    const received = (req.headers['x-telegram-bot-api-secret-token'] || req.headers['X-Telegram-Bot-Api-Secret-Token']) as string | undefined;
    if (!received || received !== TELEGRAM_WEBHOOK_SECRET) {
      console.warn('Webhook secret mismatch', { received });
      return res.sendStatus(401);
    }
  }

  // Handle pre_checkout_query
  if (update.pre_checkout_query) {
    const query = update.pre_checkout_query;
    try {
      await axios.post(`${TELEGRAM_API}/answerPreCheckoutQuery`, {
        pre_checkout_query_id: query.id,
        ok: true,
      });
    } catch (err) {
      console.error('Failed to answer pre_checkout_query', err);
    }
  }

  // Handle successful payment
  if (update.message && update.message.successful_payment) {
    const msg = update.message;
    const payment = msg.successful_payment;
    const chatId = msg.chat.id;
    const payload = payment.invoice_payload as string | undefined;

    // Try to extract userId and betAmount from payload. Support JSON or key1=val|key2=val format.
    let userId: number | string = msg.from?.id ?? chatId;
    let betAmount: number | string = 0;

    if (payload) {
      try {
        if (payload.trim().startsWith('{')) {
          const parsed = JSON.parse(payload);
          if (parsed.userId) userId = parsed.userId;
          if (parsed.betAmount) betAmount = parsed.betAmount;
        } else {
          // parse naive key=value pairs separated by | or ,
          const parts = payload.split(/[|,;]/);
          for (const p of parts) {
            const [k, v] = p.split(':').map(s => s.trim());
            if (!k || v === undefined) continue;
            if (k === 'userId' || k === 'uid') userId = isNaN(Number(v)) ? v : Number(v);
            if (k === 'betAmount' || k === 'bet') betAmount = isNaN(Number(v)) ? v : Number(v);
          }
        }
      } catch (err) {
        console.warn('Failed to parse invoice payload:', err);
      }
    }

    try {
      const spinResult = await performSpin(userId, betAmount);
      // Notify payer privately too (optional)
      try {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `Your spin result: ${spinResult.text}`,
        });
      } catch (err) {
        // not fatal
      }
    } catch (err) {
      console.error('Error performing spin after successful payment', err);
    }
  }

  // Acknowledge webhook
  res.sendStatus(200);
});
