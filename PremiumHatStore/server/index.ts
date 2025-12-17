import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { Telegraf, Markup } from "telegraf";
import { message } from "telegraf/filters";
import { v4 as uuidv4 } from 'uuid';
import dns from 'node:dns';

// Force IPv4 to avoid timeouts on some networks
dns.setDefaultResultOrder('ipv4first');

dotenv.config();

// __dirname implementation
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIG ---
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID; // ID канала для дайсов
const PORT = Number(process.env.PORT || 5174);
const PROVIDER_TOKEN = ""; // Оставь пустым для Telegram Stars

if (!BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is missing");
  process.exit(1);
}

// --- BOT SETUP ---
const bot = new Telegraf(BOT_TOKEN);

// --- EXPRESS SETUP ---
const app = express();
app.use(bodyParser.json());
app.use(cors());

// --- DATABASE MOCK (Sessions & Inventory) ---
// В реальном проекте используй SQLite/Postgres (Prisma/Drizzle)
const sessionsPath = path.join(__dirname, 'sessions.json');
const GIFTS_FILE = path.join(__dirname, 'gifts.json');

// Helper to read/write JSON
const readJSON = (file: string) => {
    try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : []; } 
    catch { return []; }
};
const writeJSON = (file: string, data: any) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// Initial Gift Seed (Заглушка, если файла нет)
if (!fs.existsSync(GIFTS_FILE)) {
    const initialGifts = [
        { id: "g1", name: "Green Star", price: 950, status: "available", ownerId: null, image: "🌟" },
        { id: "g2", name: "Delicious Cake", price: 750, status: "available", ownerId: null, image: "🎂" },
        { id: "g3", name: "Magic Potion", price: 420, status: "available", ownerId: null, image: "🧪" },
        { id: "g4", name: "Golden Cup", price: 300, status: "available", ownerId: null, image: "🏆" },
        // ... добавьте больше подарков для разных диапазонов
    ];
    writeJSON(GIFTS_FILE, initialGifts);
}

const getSession = (userId: number) => {
    try {
        if (!fs.existsSync(sessionsPath)) return null;
        const data = JSON.parse(fs.readFileSync(sessionsPath, 'utf-8'));
        return data[String(userId)] || null;
    } catch (e) { return null; }
};

interface SpinSession {
  id: string;          // Уникальный ID транзакции (uuid)
  userId: number;
  betAmount: number;
  status: 'CREATED' | 'PAID' | 'COMPLETED' | 'FAILED';
  result?: {
    diceValue: number;
    symbols: string[];
    isWin: boolean;
    winAmount: number;
    wonGift?: any;
  };
  createdAt: number;
}

// Хранилище сессий (в реальном проекте - Redis или SQL)
const spinSessions: Record<string, SpinSession> = {};

// --- LOGIC: Prize Ranges ---
// ТЗ: 50 Stars -> 777 (900-1000), Lemon (700-800), Grape (400-450), Bar (290-330)
const PRIZE_RANGES: any = {
    50: {
        "777": [900, 1000],
        "lemon": [700, 800],
        "grape": [400, 450],
        "bar": [290, 330]
    },
    100: {
        "777": [1200, 1400],
        "lemon": [800, 900],
        "grape": [400, 600],
        "bar": [290, 330]
    },
    // ... для 200
};

// --- DATABASE HELPERS ---
const readGifts = () => readJSON(GIFTS_FILE);
const writeGifts = (data: any) => writeJSON(GIFTS_FILE, data);

// --- НОВАЯ ЛОГИКА: Вывод подарков ---
async function processWithdrawal(userId: number, giftIds: string[]) {
    const gifts = readGifts();
    const giftsToSend = [];

    // Проверяем и обновляем статус
    for (const id of giftIds) {
        const gift = gifts.find((g: any) => g.id === id && g.ownerId == userId && g.status === 'owned');
        if (gift) {
            gift.status = 'withdrawn';
            giftsToSend.push(gift);
        }
    }

    if (giftsToSend.length > 0) {
        writeGifts(gifts);
        // Здесь логика отправки реального Gift (через API Telegram)
        // Пока просто уведомляем
        return giftsToSend;
    }
    return [];
}

// Find a gift in DB
function assignGift(userId: number | string, bet: number, symbolType: string) {
    const range = PRIZE_RANGES[bet]?.[symbolType];
    if (!range) return null; // Нет приза для этой комбинации/ставки

    const [min, max] = range;
    const gifts = readJSON(GIFTS_FILE);
    
    // Ищем доступный подарок в диапазоне
    const giftIndex = gifts.findIndex((g: any) => 
        g.status === 'available' && g.price >= min && g.price <= max
    );

    if (giftIndex !== -1) {
        // Выдаем подарок
        gifts[giftIndex].status = 'owned';
        gifts[giftIndex].ownerId = userId;
        writeJSON(GIFTS_FILE, gifts);
        return gifts[giftIndex];
    } else {
        // TODO: Если подарка нет, выдаем "аналогичный" или начисляем баланс (fallback)
        console.warn(`No gift found for range ${min}-${max}`);
        return null;
    }
}

// --- LOGIC: DICE MAPPING ---
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
        normalize(entry.first.toLowerCase()),
        normalize(entry.second.toLowerCase()),
        normalize(entry.third.toLowerCase()),
      ];
    }

    if (Object.keys(mapping).length !== 64) {
      console.error(`Mapping file does not contain 64 values (found ${Object.keys(mapping).length})`);
      throw new Error("Invalid mapping file");
    }

    console.log(`Dice mapping loaded: ${Object.keys(mapping).length} values`);
    return mapping;
  } catch (e) {
    console.error("Failed to load mapping:", e);
    // Fallback
    return {
      1: ["bar", "bar", "bar"],
      22: ["grape", "grape", "grape"],
      43: ["lemon", "lemon", "lemon"],
      64: ["777", "777", "777"],
    };
  }
}

DICE_MAPPING = loadDiceMapping();

function diceValueToSymbols(val: number) { return DICE_MAPPING[val] || ["bar", "lemon", "grape"]; }

function getSymbolType(diceValue: number): string | null {
    if (diceValue === 64) return "777";
    // Упрощенная логика для примера. Вставь сюда полную проверку по DICE_MAPPING
    // Если 3 одинаковых символа
    // return "lemon" | "grape" | "bar"
    return null; 
}

// --- BOT LOGIC ---

// 1. Обработка команды /start
bot.start((ctx) => ctx.reply("Welcome to Battles! Open the Mini App to play."));

// 2. Обработка Pre-Checkout (обязательно для Stars)
bot.on("pre_checkout_query", async (ctx) => {
    // Здесь можно проверить наличие товара или валидность суммы
    await ctx.answerPreCheckoutQuery(true);
});

// 3. Обработка успешной оплаты (Successful Payment)
bot.on(message("successful_payment"), async (ctx) => {
    const payment = ctx.message.successful_payment;
    
    try {
        const payload = JSON.parse(payment.invoice_payload);
        const { sessionId, type, giftIds } = payload;
        
        const session = spinSessions[sessionId];
        if (!session && type === 'spin') { 
             console.error("Spin session missing"); return; 
        }

        // === SCENARIO 1: SPIN ===
        if (type === 'spin' && session) {
            session.status = 'PAID';

            // --- ЗАПУСК ИГРОВОЙ ЛОГИКИ ---
            
            // 1. Кидаем дайс в канал
            if (!CHANNEL_ID) throw new Error("No Channel ID");
            const diceMsg = await ctx.telegram.sendDice(CHANNEL_ID, { emoji: "🎰" });
            const diceValue = diceMsg.dice.value;

            // 2. Считаем выигрыш (твоя логика маппинга)
            const symbols = diceValueToSymbols(diceValue); 
            // Пример простой проверки:
            const isWin = new Set(symbols).size === 1; 
            const winAmount = isWin ? session.betAmount * 10 : 0; // Тут твоя логика коэффициентов

            let wonGift = null;
            if (isWin) {
                // Пытаемся выдать подарок
                // Предположим, что 64 это '777'
                // Для теста используем "777" если выиграл, или определяем тип символа
                const symbolType = getSymbolType(diceValue) || "777"; // Fallback to 777 for test if win
                wonGift = assignGift(session.userId, session.betAmount, symbolType);
            }

            // 4. Финализируем сессию
            session.result = {
                diceValue,
                symbols,
                isWin,
                winAmount,
                wonGift
            };
            session.status = 'COMPLETED';

            console.log(`Spin ${sessionId} completed. Value: ${diceValue}`);
            
            // Отвечаем в канал (реплай на дайс)
            const resultText = `User ${session.userId} rolled ${diceValue}! Result: ${symbols.join(" ")}. Win: ${wonGift ? wonGift.name : (isWin ? 'Cash Prize' : 'No')}`;
            await ctx.telegram.sendMessage(CHANNEL_ID, resultText, { 
                reply_parameters: { message_id: diceMsg.message_id } 
            });
        }
        // === SCENARIO 2: WITHDRAWAL ===
        else if (type === 'withdrawal' && giftIds) {
            const withdrawnGifts = await processWithdrawal(payload.userId, giftIds);
            
            if (withdrawnGifts.length > 0) {
                const names = withdrawnGifts.map((g: any) => g.name).join(", ");
                await ctx.reply(`✅ Withdrawal successful! Sent: ${names}`);
                // Тут можно отправить отдельное сообщение "Вот ваш подарок"
            } else {
                await ctx.reply("❌ Error processing withdrawal. Gifts not found or already withdrawn.");
            }
        }

    } catch (err) {
        console.error("Payment processing error:", err);
        // Важно: если упало здесь, статус останется PAID, но не COMPLETED.
        // Клиент зависнет. Нужно предусмотреть обработку ошибок.
    }
});


// --- API ENDPOINTS FOR CLIENT ---

// 1. Создание инвойса (Create Invoice Link)
app.post("/api/create-invoice", async (req: Request, res: Response) => {
    const { userId, amount, type, itemData } = req.body; 
    // itemData = массив giftIds для вывода

    if (!userId || !amount) return res.status(400).json({ error: "Missing data" });

    const sessionId = uuidv4();
    
    // Если это спин - сохраняем сессию
    if (type === 'spin') {
        spinSessions[sessionId] = {
            id: sessionId, userId, betAmount: amount, status: 'CREATED', createdAt: Date.now()
        };
    }

    try {
        const title = type === 'spin' ? "Spin Slot Machine" : "Withdraw Gifts";
        const description = type === 'spin' ? `Bet: ${amount} Stars` : `Shipping fee for gifts`;
        
        // В payload добавляем type и giftIds
        const payload = JSON.stringify({ sessionId, userId, type, giftIds: itemData });

        const invoiceLink = await bot.telegram.createInvoiceLink({
            title,
            description,
            payload,
            provider_token: PROVIDER_TOKEN, // Пусто для Stars
            currency: "XTR",
            prices: [{ label: title, amount: amount }],
        });

        // Возвращаем клиенту ссылку и ID сессии для отслеживания
        res.json({ invoiceUrl: invoiceLink, sessionId });
    } catch (err: any) {
        console.error("Create invoice error:", err);
        res.status(500).json({ error: "Failed to create invoice", details: err.message });
    }
});

// 2. GET MY GIFTS
app.get("/api/my-gifts/:userId", (req: Request, res: Response) => {
    const userId = req.params.userId;
    const gifts = readGifts();
    
    // Фильтруем подарки пользователя
    const myGifts = gifts.filter((g: any) => g.ownerId == userId && g.status === 'owned');

    // Группируем для фронтенда (как требует GiftCard: { gift: ..., quantity: ... })
    // Или отправляем плоским списком, а фронт группирует. 
    // Сделаем группировку здесь для удобства:
    const grouped: Record<string, any> = {};
    
    for (const g of myGifts) {
        // Группируем по имени или уникальному типу подарка
        const key = g.name; 
        if (!grouped[key]) {
            grouped[key] = { 
                id: g.id, // ID первого попавшегося (для ключа)
                gift: { name: g.name, image: g.image, price: g.price }, 
                quantity: 0,
                ids: [] // Собираем все ID этой группы для вывода
            };
        }
        grouped[key].quantity++;
        grouped[key].ids.push(g.id);
    }

    res.json(Object.values(grouped));
});

// 3. Получение статуса/истории (Polling для фронтенда)
// Клиент будет опрашивать этот эндпоинт, чтобы узнать результат спина после оплаты
app.get("/api/user-spins/:userId", (req, res) => {
    // В реальной БД нужно вернуть последние спины пользователя
    // Пока вернем заглушку или чтение из файла
    res.json({ spins: [] }); 
});

// 3. Эндпоинт проверки статуса (Long Polling)
app.get("/api/spin-status/:sessionId", (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = spinSessions[sessionId];

  if (!session) return res.status(404).json({ error: "Session not found" });

  // Если готово - отдаем результат
  if (session.status === 'COMPLETED') {
    return res.json({ 
      status: 'COMPLETED', 
      result: session.result 
    });
  }

  // Если еще ждем оплаты или прокрутки
  res.json({ status: session.status });
});

app.get('/', (req: Request, res: Response) => {
  res.send(`
    <html>
      <head><meta charset="utf-8"><title>PremiumHatStore Backend</title></head>
      <body style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;line-height:1.6;padding:24px;">
        <h1>PremiumHatStore Backend (Node.js + Telegraf)</h1>
        <p>Server is running. Available endpoints:</p>
        <ul>
          <li><a href="/api/create-invoice">/api/create-invoice</a> (POST)</li>
          <li><a href="/api/user-spins/123">/api/user-spins/:userId</a> (GET)</li>
        </ul>
        <p>Client (dev) is usually served by Vite at <a href="http://localhost:5173">http://localhost:5173</a>.</p>
      </body>
    </html>
  `);
});

app.get('/status', (req: Request, res: Response) => {
  res.json({ ok: true, ts: Date.now(), env: { port: process.env.PORT || null } });
});

// Serve built client static files if present (app/static created by `vite build`)
const builtClientPath = path.join(__dirname, '..', '..', 'app', 'static');
if (fs.existsSync(builtClientPath)) {
  console.log('Serving built client from', builtClientPath);
  app.use(express.static(builtClientPath));

  // Fallback to index.html for SPA routes
  app.get(/(.*)/, (req: Request, res: Response) => {
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


// --- SERVER STARTUP ---

// Запуск бота (Polling для разработки, Webhook для продакшена)
// Для продакшена лучше использовать webhook через app.use(bot.webhookCallback(...))
bot.launch().then(() => {
    console.log("Bot started!");
}).catch((err) => {
    console.error("Bot launch failed:", err.message);
    console.error("HINT: If you are in a region where Telegram is blocked, please use a VPN or Proxy.");
    // Don't crash the server if bot fails to launch (e.g. network issue)
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

export default app;