export interface ImageEntry {
  type: 'file' | 'url';
  url: string;
  name?: string;
}

export interface Trade {
  id: string;
  tradeNumber: string;
  date: string;               // ISO date string (YYYY-MM-DD)
  day: string;                // Weekday name
  pair: string;
  direction: 'Long' | 'Short' | '';
  outcome: 'Profit' | 'Loss' | '';
  reward: number | null;
  commission: number | null;
  entryModel: string;
  images: ImageEntry[];
  remarks: string;
  customFields: Record<string, string | number>;
  createdAt: string | null;   // ISO timestamp from Supabase
  updatedAt: string | null;   // ISO timestamp from Supabase
}

export interface CustomPair {
  symbol: string;
  category: string;
}

export interface CustomColumn {
  key: string;
  name: string;
  type: 'text' | 'number' | 'dropdown';
  options?: string[];
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  theme: 'light' | 'dark';
  customPairs: CustomPair[];
  customColumns: CustomColumn[];
}

export interface MonthYear {
  year: number;
  month: number; // 1-12
}

export type ColumnDef = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'day' | 'pair' | 'direction' | 'outcome' | 'numeric' | 'commission' | 'images' | 'remarks' | 'dropdown';
  width?: string;
  options?: string[];
  isDefault?: boolean;
};


