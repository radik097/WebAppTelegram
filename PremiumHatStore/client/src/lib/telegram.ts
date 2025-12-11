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
  
  // Set theme params
  document.documentElement.style.setProperty('--tg-theme-bg-color', tg.backgroundColor);
  document.documentElement.style.setProperty('--tg-theme-text-color', tg.textColor);
  document.documentElement.style.setProperty('--tg-theme-button-color', tg.buttonColor);
  document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.buttonTextColor);
  document.documentElement.style.setProperty('--tg-theme-hint-color', tg.hintColor);
  document.documentElement.style.setProperty('--tg-theme-link-color', tg.linkColor);
  document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', tg.secondaryBackgroundColor);
  
  return tg;
}

export function getInitData() {
  return window.Telegram.WebApp.initData;
}

export interface InvoiceResponse {
  invoiceUrl: string;
  sessionId: string;
}

export async function createInvoice(userId: number, amount: number, type: 'spin' | 'item' = 'spin', itemData?: any): Promise<InvoiceResponse> {
  const response = await fetch(`${BACKEND_URL}/api/create-invoice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      amount,
      type,
      itemData
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to create invoice');
  }

  return response.json();
}

export async function openInvoice(invoiceUrl: string) {
    const tg = window.Telegram.WebApp;
    return new Promise((resolve) => {
        tg.openInvoice(invoiceUrl, (status: string) => {
            resolve(status);
        });
    });
}
