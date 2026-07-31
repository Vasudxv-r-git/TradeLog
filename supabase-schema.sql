-- ============================================
-- TradeLog — Supabase Database Schema
-- ============================================

-- 1. Users table (profile synced from Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY,
  display_name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark')),
  custom_pairs JSONB DEFAULT '[]'::jsonb,      -- [{symbol, category}]
  custom_columns JSONB DEFAULT '[]'::jsonb,    -- [{key, name, type, options?}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Trades table
CREATE TABLE IF NOT EXISTS trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  year_month TEXT NOT NULL,                    -- 'YYYY-MM' format (e.g., '2026-07')
  trade_number TEXT DEFAULT '',
  date TEXT DEFAULT '',
  day TEXT DEFAULT '',
  pair TEXT DEFAULT '',
  direction TEXT DEFAULT '' CHECK (direction IN ('', 'Long', 'Short')),
  outcome TEXT DEFAULT '' CHECK (outcome IN ('', 'Profit', 'Loss')),
  reward DECIMAL,
  commission DECIMAL,
  entry_model TEXT DEFAULT '',
  images JSONB DEFAULT '[]'::jsonb,            -- [{type, url, name?}]
  remarks TEXT DEFAULT '',
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_trades_user_month ON trades(user_id, year_month);
CREATE INDEX IF NOT EXISTS idx_trades_created ON trades(created_at);

-- 4. Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
DROP POLICY IF EXISTS "Users can read own profile" ON users;
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (auth.uid()::text = uid);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid()::text = uid);

DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid()::text = uid);

-- RLS Policies for trades
DROP POLICY IF EXISTS "Users can read own trades" ON trades;
CREATE POLICY "Users can read own trades"
  ON trades FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert own trades" ON trades;
CREATE POLICY "Users can insert own trades"
  ON trades FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own trades" ON trades;
CREATE POLICY "Users can update own trades"
  ON trades FOR UPDATE
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own trades" ON trades;
CREATE POLICY "Users can delete own trades"
  ON trades FOR DELETE
  USING (auth.uid()::text = user_id);



-- 5. Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trades_updated_at ON trades;
CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Supabase Storage bucket for trade images
-- Run this in the Supabase dashboard SQL editor:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('trade-images', 'trade-images', true);

-- 7. Realtime Publication
-- Drop the publication if it exists and recreate it for trades
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE trades;
  
  -- Set REPLICA IDENTITY to FULL for realtime to broadcast old/new records
  ALTER TABLE trades REPLICA IDENTITY FULL;
COMMIT;
