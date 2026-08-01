import { getSupabase } from './supabase';
import { Trade, UserProfile, CustomPair, CustomColumn } from '@/types';

// --- Helper: year_month key ---
function yearMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

// ============================================
// TRADES CRUD
// ============================================

export async function fetchTrades(uid: string, year: number, month: number): Promise<Trade[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', uid)
    .eq('year_month', yearMonthKey(year, month))
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching trades:', error);
    return [];
  }

  return (data || []).map(mapDbToTrade);
}

export async function fetchTradesForDateRange(
  uid: string,
  startDate: string,
  endDate: string
): Promise<Trade[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', uid)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching trades for date range:', error);
    return [];
  }

  return (data || []).map(mapDbToTrade);
}

export async function fetchAvailableYears(uid: string): Promise<number[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('trades')
    .select('year_month, date')
    .eq('user_id', uid);

  if (error || !data || data.length === 0) {
    return [new Date().getFullYear()];
  }

  const yearsSet = new Set<number>();
  data.forEach((row) => {
    if (row.year_month) {
      const y = parseInt(row.year_month.split('-')[0], 10);
      if (!isNaN(y)) yearsSet.add(y);
    }
    if (row.date) {
      const y = parseInt(row.date.split('-')[0], 10);
      if (!isNaN(y)) yearsSet.add(y);
    }
  });

  const currentYear = new Date().getFullYear();
  yearsSet.add(currentYear);

  return Array.from(yearsSet).sort((a, b) => b - a);
}

export async function addTrade(
  uid: string,
  year: number,
  month: number,
  trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('trades')
    .insert({
      user_id: uid,
      year_month: yearMonthKey(year, month),
      trade_number: trade.tradeNumber,
      date: trade.date,
      day: trade.day,
      pair: trade.pair,
      direction: trade.direction || '',
      outcome: trade.outcome || '',

      reward: trade.reward,
      commission: trade.commission,
      entry_model: trade.entryModel,
      images: trade.images,
      remarks: trade.remarks,
      custom_fields: trade.customFields,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error adding trade:', error);
    return null;
  }

  return data?.id || null;
}

export async function updateTrade(
  uid: string,
  year: number,
  month: number,
  tradeId: string,
  updates: Partial<Trade>
): Promise<void> {
  const supabase = getSupabase();

  // Map Trade field names to DB column names
  const dbUpdates: Record<string, any> = {};
  if (updates.tradeNumber !== undefined) dbUpdates.trade_number = updates.tradeNumber;
  if (updates.date !== undefined) dbUpdates.date = updates.date;
  if (updates.day !== undefined) dbUpdates.day = updates.day;
  if (updates.pair !== undefined) dbUpdates.pair = updates.pair;
  if (updates.direction !== undefined) dbUpdates.direction = updates.direction;
  if (updates.outcome !== undefined) dbUpdates.outcome = updates.outcome;

  if (updates.reward !== undefined) dbUpdates.reward = updates.reward;
  if (updates.commission !== undefined) dbUpdates.commission = updates.commission;
  if (updates.entryModel !== undefined) dbUpdates.entry_model = updates.entryModel;
  if (updates.images !== undefined) dbUpdates.images = updates.images;
  if (updates.remarks !== undefined) dbUpdates.remarks = updates.remarks;
  if (updates.customFields !== undefined) dbUpdates.custom_fields = updates.customFields;

  const { error } = await supabase
    .from('trades')
    .update(dbUpdates)
    .eq('id', tradeId)
    .eq('user_id', uid);

  if (error) {
    console.error('Error updating trade:', error);
  }
}

export async function deleteTrade(
  uid: string,
  year: number,
  month: number,
  tradeId: string
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('id', tradeId)
    .eq('user_id', uid);

  if (error) {
    console.error('Error deleting trade:', error);
  }
}

// ============================================
// USER PROFILE
// ============================================

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('uid', uid)
    .single();

  if (error || !data) return null;

  return {
    uid: data.uid,
    displayName: data.display_name,
    email: data.email,
    photoURL: data.photo_url,
    passwordHash: data.password_hash,
    theme: data.theme,
    customPairs: data.custom_pairs || [],
    customColumns: data.custom_columns || [],
  };
}

export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) return null;

  return {
    uid: data.uid,
    displayName: data.display_name,
    email: data.email,
    photoURL: data.photo_url,
    passwordHash: data.password_hash,
    theme: data.theme,
    customPairs: data.custom_pairs || [],
    customColumns: data.custom_columns || [],
  };
}

export async function createOrUpdateUserProfile(
  uid: string,
  profile: Partial<UserProfile>
): Promise<void> {
  const supabase = getSupabase();

  const dbData: Record<string, any> = { uid };
  if (profile.displayName !== undefined) dbData.display_name = profile.displayName;
  if (profile.email !== undefined) dbData.email = profile.email;
  if (profile.photoURL !== undefined) dbData.photo_url = profile.photoURL;
  if (profile.passwordHash !== undefined) dbData.password_hash = profile.passwordHash;
  if (profile.theme !== undefined) dbData.theme = profile.theme;
  if (profile.customPairs !== undefined) dbData.custom_pairs = profile.customPairs;
  if (profile.customColumns !== undefined) dbData.custom_columns = profile.customColumns;

  const { error } = await supabase
    .from('users')
    .upsert(dbData, { onConflict: 'uid' });

  if (error) {
    console.error('Error upserting user profile:', error);
  }
}

export async function updateUserPasswordHash(
  uid: string,
  passwordHash: string
): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('users')
    .update({ password_hash: passwordHash })
    .eq('uid', uid);

  if (error) {
    console.error('Error updating password hash:', error);
    return false;
  }
  return true;
}

export async function addCustomPair(uid: string, pair: CustomPair): Promise<void> {
  const profile = await getUserProfile(uid);
  const existingPairs = profile?.customPairs || [];
  const alreadyExists = existingPairs.some(
    (p) => p.symbol === pair.symbol && p.category === pair.category
  );
  if (!alreadyExists) {
    await createOrUpdateUserProfile(uid, {
      customPairs: [...existingPairs, pair],
    });
  }
}

export async function removeCustomPair(uid: string, pairSymbol: string): Promise<void> {
  const profile = await getUserProfile(uid);
  const existingPairs = profile?.customPairs || [];
  await createOrUpdateUserProfile(uid, {
    customPairs: existingPairs.filter((p) => p.symbol !== pairSymbol),
  });
}

export async function addCustomColumn(uid: string, column: CustomColumn): Promise<void> {
  const profile = await getUserProfile(uid);
  const existing = profile?.customColumns || [];
  const alreadyExists = existing.some((c) => c.key === column.key);
  if (!alreadyExists) {
    await createOrUpdateUserProfile(uid, {
      customColumns: [...existing, column],
    });
  }
}

export async function removeCustomColumn(uid: string, columnKey: string): Promise<void> {
  const profile = await getUserProfile(uid);
  const existing = profile?.customColumns || [];
  await createOrUpdateUserProfile(uid, {
    customColumns: existing.filter((c) => c.key !== columnKey),
  });
}

// ============================================
// STORAGE (Supabase Storage)
// ============================================

export async function uploadImage(
  uid: string,
  file: File
): Promise<string | null> {
  const supabase = getSupabase();
  const filePath = `${uid}/${Date.now()}_${file.name}`;

  const { error } = await supabase.storage
    .from('trade-images')
    .upload(filePath, file);

  if (error) {
    console.error('Error uploading image:', error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('trade-images')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}



// ============================================
// HELPERS
// ============================================

function mapDbToTrade(row: any): Trade {
  return {
    id: row.id,
    tradeNumber: row.trade_number || '',
    date: row.date || '',
    day: row.day || '',
    pair: row.pair || '',
    direction: row.direction || '',
    outcome: row.outcome || '',

    reward: row.reward,
    commission: row.commission,
    entryModel: row.entry_model || '',
    images: row.images || [],
    remarks: row.remarks || '',
    customFields: row.custom_fields || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
