import WebApp from '@twa-dev/sdk';

declare global {
  interface Window {
    Telegram: {
      WebApp: any;
    };
  }
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export function initTelegram() {
  const tg = window.Telegram.WebApp;
  tg.ready();
  tg.expand();
  
  // Set theme params if needed
  document.documentElement.style.setProperty('--tg-theme-bg-color', tg.backgroundColor);
  document.documentElement.style.setProperty('--tg-theme-text-color', tg.textColor);
  document.documentElement.style.setProperty('--tg-theme-button-color', tg.buttonColor);
  document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.buttonTextColor);
  
  return tg;
}

export function getInitData() {
  return window.Telegram.WebApp.initData;
}

export interface InvoiceResponse {
  invoice_url: string;
}

export async function createSlotInvoice(betAmount: number, userId?: number): Promise<InvoiceResponse> {
  const response = await fetch(`${BACKEND_URL}/slots/create-invoice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bet_amount: betAmount,
      user_id: userId,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create invoice');
  }

  return response.json();
}

export function openInvoiceUrl(invoiceUrl: string, onStatus?: (status: string) => void) {
  const tg = window.Telegram.WebApp;
  
  if (tg.openInvoice) {
    tg.openInvoice(invoiceUrl, (status: string) => {
      if (onStatus) onStatus(status);
    });
  } else {
    // Fallback for development / non-Telegram environment
    window.open(invoiceUrl, '_blank');
    if (onStatus) onStatus('opened_in_browser');
  }
}

export async function createAndOpenInvoice(betAmount: number, userId?: number, onStatus?: (status: string) => void) {
  try {
    const { invoice_url } = await createSlotInvoice(betAmount, userId);
    openInvoiceUrl(invoice_url, onStatus);
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
}
