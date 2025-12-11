export interface SpinResult {
  symbols: string[];
  diceValue: number;
  isWin: boolean;
  isJackpot: boolean;
  text?: string;
  diceMessageId?: number;
  win_amount?: number;
}

export interface Spin {
  id: number;
  userId: number;
  betAmount: number;
  result: SpinResult;
  createdAt: string;
}

export interface User {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}
