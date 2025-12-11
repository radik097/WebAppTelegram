# Telegram WebApp Integration (PremiumHatStore client)

This file explains how the PremiumHatStore React/Vite client can connect to your Telegram bot and backend using the built-in Telegram WebApp API.

Files added:

- `client/src/lib/telegram.ts` — lightweight helper that wraps Telegram.WebApp, creates invoices by calling the backend, and opens invoices in the native Telegram payment dialog.

How it works

The helper uses Vite env var `VITE_BACKEND_URL` (falls back to current origin if not set).

The helper exposes functions:

- `initTelegram()` — initializes Telegram.WebApp (calls `ready()` and `expand()`), applies theme.
- `createSlotInvoice(betAmount, userId?)` — POST /slots/create-invoice and returns the invoice URL.
- `openInvoiceUrl(invoiceUrl, onStatus?)` — opens invoice using `tg.openInvoice()` if available, otherwise opens a new tab.
- `createAndOpenInvoice(betAmount, userId?, onStatus?)` — convenience to create and open in one step.

Usage

- Set `VITE_BACKEND_URL` in your `.env` for the client, e.g.:

```env
VITE_BACKEND_URL=http://localhost:5000
```

- App initialization (already wired): `client/src/App.tsx` lazy-loads the helper and calls `initTelegram()` on mount. For convenience the helper is exposed on `window.__TG_HELPER__` in the browser console.

- Example console usage in Telegram WebApp context:

```js
// create and open a 50-star invoice
window.__TG_HELPER__.createAndOpenInvoice(50);

// create invoice but open later
window.__TG_HELPER__.createSlotInvoice(100).then(data => console.log(data.invoice_url))
```

Integration details

- The helper calls `POST ${VITE_BACKEND_URL}/slots/create-invoice` with `{ bet_amount, user_id? }`.
- The backend (your Flask app) must return JSON `{ invoice_url: string }`.
- When opened in Telegram, the user will pay with Stars. The bot receives `successful_payment` and should trigger `/slots/spin` (this is already implemented in your `telbot/bot.py`).

Notes & next steps

- The helper is intentionally small and framework-agnostic. You can import it into specific pages (for example `client/src/pages/Slot.tsx`) and wire a UI button to call `createAndOpenInvoice()`.
- If you want tighter integration (e.g. automatically call `/slots/spin` from the client after payment), prefer relying on the bot's `successful_payment` handler which already triggers the backend spin.
- For local development without Telegram (desktop browser), `openInvoiceUrl` falls back to opening the invoice link in a new tab.

If you want, I can:

- Wire the `createAndOpenInvoice()` call directly into `client/src/pages/Slot.tsx` so the UI "Spin" button opens payment and then animates the slot on success.
- Add TypeScript types for the helper and adjust the Vite config to expose `VITE_BACKEND_URL`.

Tell me which of the two you'd like next (wire UI, or add types + env guidance) and I'll implement it.
