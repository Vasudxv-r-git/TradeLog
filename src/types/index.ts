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
  entryPrice: number;
  takeProfitPrice: number | null;
  stopLossPrice: number | null;
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
  type: 'text' | 'number' | 'date' | 'day' | 'pair' | 'direction' | 'outcome' | 'numeric' | 'commission' | 'images' | 'remarks' | 'dropdown' | 'price';
  width?: string;
  options?: string[];
  isDefault?: boolean;
};

export type Role = 'owner' | 'admin' | 'editor' | 'commenter' | 'viewer';
export type InviteStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled' | 'revoked';

export interface Collaborator {
  id: string;
  ownerUid: string;
  email: string;
  role: Exclude<Role, 'owner'>;
  status: InviteStatus;
  collaboratorUid: string | null;
  token?: string;
  expiresAt?: string;
  message?: string;
  createdAt: string;
}

export interface SharedJournal {
  ownerUid: string;
  ownerName: string;
  ownerEmail: string;
  role: Exclude<Role, 'owner'>;
}

export interface Comment {
  id: string;
  tradeId: string;
  userId: string;
  message: string;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
  user?: UserProfile; // Joined data
}

export interface ActivityLog {
  id: string;
  journalOwnerUid: string;
  userId: string;
  action: string;
  metadata: Record<string, any>;
  createdAt: string;
  user?: UserProfile; // Joined data
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}
