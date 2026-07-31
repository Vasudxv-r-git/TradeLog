import { ColumnDef } from '@/types';

export const WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
] as const;

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const;

export interface PairGroup {
  category: string;
  pairs: string[];
}

export const DEFAULT_PAIR_GROUPS: PairGroup[] = [
  {
    category: 'Commodities',
    pairs: ['XAU/USD'],
  },
  {
    category: 'Currencies',
    pairs: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD'],
  },
  {
    category: 'Futures',
    pairs: ['US30', 'NAS100'],
  },
];

export const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'tradeNumber', label: 'No. of Trades', type: 'text', width: '120px', isDefault: true },
  { key: 'date', label: 'Date', type: 'date', width: '130px', isDefault: true },
  { key: 'day', label: 'Day', type: 'day', width: '110px', isDefault: true },
  { key: 'pair', label: 'Pairs', type: 'pair', width: '130px', isDefault: true },
  { key: 'direction', label: 'Direction', type: 'direction', width: '110px', isDefault: true },
  { key: 'entryPrice', label: 'Entry Price', type: 'price', width: '120px', isDefault: true },
  { key: 'takeProfitPrice', label: 'TP Price', type: 'price', width: '120px', isDefault: true },
  { key: 'stopLossPrice', label: 'SL Price', type: 'price', width: '120px', isDefault: true },
  { key: 'outcome', label: 'Outcome', type: 'outcome', width: '110px', isDefault: true },
  { key: 'reward', label: 'Rewards ($)', type: 'numeric', width: '120px', isDefault: true },
  { key: 'commission', label: 'Commission ($)', type: 'commission', width: '140px', isDefault: true },
  { key: 'entryModel', label: 'Entry Model', type: 'text', width: '140px', isDefault: true },
  { key: 'images', label: "IMAGE'S LINK", type: 'images', width: '150px', isDefault: true },
  { key: 'remarks', label: 'Remarks', type: 'remarks', width: '200px', isDefault: true },
];

export function createEmptyTrade(): Omit<import('@/types').Trade, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    tradeNumber: '',
    date: '',
    day: '',
    pair: '',
    direction: '',
    outcome: '',
    entryPrice: 0,
    takeProfitPrice: null,
    stopLossPrice: null,
    reward: null,
    commission: null,
    entryModel: '',
    images: [],
    remarks: '',
    customFields: {},
  };
}
