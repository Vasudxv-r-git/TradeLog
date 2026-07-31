import { getSupabase } from './supabase';
import { Trade, UserProfile, CustomPair, CustomColumn, Collaborator, SharedJournal, Role } from '@/types';

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
      entry_price: trade.entryPrice,
      take_profit_price: trade.takeProfitPrice,
      stop_loss_price: trade.stopLossPrice,
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
  if (updates.entryPrice !== undefined) dbUpdates.entry_price = updates.entryPrice;
  if (updates.takeProfitPrice !== undefined) dbUpdates.take_profit_price = updates.takeProfitPrice;
  if (updates.stopLossPrice !== undefined) dbUpdates.stop_loss_price = updates.stopLossPrice;
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
// COLLABORATION
// ============================================

export async function fetchCollaborators(ownerUid: string): Promise<Collaborator[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('journal_collaborators')
    .select('*')
    .eq('owner_uid', ownerUid)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching collaborators:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    ownerUid: row.owner_uid,
    email: row.email,
    role: row.role,
    status: row.status,
    collaboratorUid: row.collaborator_uid,
    createdAt: row.created_at,
  }));
}

export async function addCollaborator(ownerUid: string, email: string, role: Role): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('journal_collaborators')
    .insert({
      owner_uid: ownerUid,
      email: email.toLowerCase(),
      role: role,
    });

  if (error) {
    console.error('Error adding collaborator:', error);
    return false;
  }
  return true;
}

export async function updateCollaboratorRole(id: string, role: Role): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('journal_collaborators')
    .update({ role })
    .eq('id', id);

  if (error) {
    console.error('Error updating collaborator:', error);
  }
}

export async function removeCollaborator(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('journal_collaborators')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error removing collaborator:', error);
  }
}

export async function fetchSharedJournals(userEmail: string): Promise<SharedJournal[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('journal_collaborators')
    .select(`
      owner_uid,
      role,
      users!inner (
        display_name,
        email
      )
    `)
    .eq('email', userEmail.toLowerCase())
    .eq('status', 'accepted');

  if (error) {
    console.error('Error fetching shared journals:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    ownerUid: row.owner_uid,
    ownerName: row.users?.display_name || row.users?.email || 'Unknown',
    ownerEmail: row.users?.email || '',
    role: row.role,
  }));
}

export async function acceptPendingInvites(userEmail: string, userId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.rpc('accept_pending_invites', {
    user_email: userEmail.toLowerCase(),
    user_id: userId,
  });

  if (error) {
    console.error('Error accepting pending invites:', error);
  }
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
    entryPrice: row.entry_price || 0,
    takeProfitPrice: row.take_profit_price,
    stopLossPrice: row.stop_loss_price,
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
