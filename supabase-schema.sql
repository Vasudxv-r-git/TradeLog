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
  entry_price DECIMAL,
  take_profit_price DECIMAL,
  stop_loss_price DECIMAL,
  reward DECIMAL,
  commission DECIMAL,
  entry_model TEXT DEFAULT '',
  images JSONB DEFAULT '[]'::jsonb,            -- [{type, url, name?}]
  remarks TEXT DEFAULT '',
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 Collaborators table
CREATE TABLE IF NOT EXISTS journal_collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  collaborator_uid TEXT REFERENCES users(uid) ON DELETE CASCADE,
  token TEXT,
  expires_at TIMESTAMPTZ,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_uid, email)
);

ALTER TABLE journal_collaborators DROP CONSTRAINT IF EXISTS journal_collaborators_role_check;
ALTER TABLE journal_collaborators DROP CONSTRAINT IF EXISTS journal_collaborators_status_check;
ALTER TABLE journal_collaborators DROP CONSTRAINT IF EXISTS collab_role_check;
ALTER TABLE journal_collaborators DROP CONSTRAINT IF EXISTS collab_status_check;

ALTER TABLE journal_collaborators ADD CONSTRAINT collab_role_check CHECK (role IN ('admin', 'editor', 'commenter', 'viewer'));
ALTER TABLE journal_collaborators ADD CONSTRAINT collab_status_check CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'cancelled', 'revoked'));

-- 2.6 Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  message TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.7 Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.8 Activity Logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_owner_uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_trades_user_month ON trades(user_id, year_month);
CREATE INDEX IF NOT EXISTS idx_trades_created ON trades(created_at);
CREATE INDEX IF NOT EXISTS idx_collab_owner ON journal_collaborators(owner_uid);
CREATE INDEX IF NOT EXISTS idx_collab_email ON journal_collaborators(email);

-- 4. Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper function for RLS
CREATE OR REPLACE FUNCTION is_collaborator(owner_id TEXT, col_uid TEXT)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM journal_collaborators
    WHERE owner_uid = owner_id AND collaborator_uid = col_uid AND status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_editor(owner_id TEXT, col_uid TEXT)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM journal_collaborators
    WHERE owner_uid = owner_id AND collaborator_uid = col_uid AND status = 'accepted' AND role IN ('admin', 'editor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin(owner_id TEXT, col_uid TEXT)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM journal_collaborators
    WHERE owner_uid = owner_id AND collaborator_uid = col_uid AND status = 'accepted' AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_commenter_or_better(owner_id TEXT, col_uid TEXT)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM journal_collaborators
    WHERE owner_uid = owner_id AND collaborator_uid = col_uid AND status = 'accepted' AND role IN ('admin', 'editor', 'commenter')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for users
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can read own or shared profile" ON users;
CREATE POLICY "Users can read own or shared profile"
  ON users FOR SELECT
  USING (auth.uid()::text = uid OR is_collaborator(uid, auth.uid()::text));

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
DROP POLICY IF EXISTS "Users can read own or shared trades" ON trades;
CREATE POLICY "Users can read own or shared trades"
  ON trades FOR SELECT
  USING (auth.uid()::text = user_id OR is_collaborator(user_id, auth.uid()::text));

DROP POLICY IF EXISTS "Users can insert own trades" ON trades;
DROP POLICY IF EXISTS "Users and editors can insert trades" ON trades;
CREATE POLICY "Users and editors can insert trades"
  ON trades FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR is_editor(user_id, auth.uid()::text));

DROP POLICY IF EXISTS "Users can update own trades" ON trades;
DROP POLICY IF EXISTS "Users and editors can update trades" ON trades;
CREATE POLICY "Users and editors can update trades"
  ON trades FOR UPDATE
  USING (auth.uid()::text = user_id OR is_editor(user_id, auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete own trades" ON trades;
DROP POLICY IF EXISTS "Users and editors can delete trades" ON trades;
CREATE POLICY "Users and editors can delete trades"
  ON trades FOR DELETE
  USING (auth.uid()::text = user_id OR is_editor(user_id, auth.uid()::text));

-- RLS Policies for journal_collaborators
DROP POLICY IF EXISTS "Owners and admins can manage collaborators" ON journal_collaborators;
DROP POLICY IF EXISTS "Owners can manage collaborators" ON journal_collaborators;
CREATE POLICY "Owners and admins can manage collaborators"
  ON journal_collaborators FOR ALL
  USING (auth.uid()::text = owner_uid OR is_admin(owner_uid, auth.uid()::text));

DROP POLICY IF EXISTS "Collaborators can view their own invites" ON journal_collaborators;
CREATE POLICY "Collaborators can view their own invites"
  ON journal_collaborators FOR SELECT
  USING (auth.uid()::text = collaborator_uid OR email = (SELECT email FROM users WHERE uid = auth.uid()::text));

-- RLS Policies for Comments
DROP POLICY IF EXISTS "Anyone with access can read comments" ON comments;
CREATE POLICY "Anyone with access can read comments"
  ON comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trades 
      WHERE trades.id = comments.trade_id 
      AND (trades.user_id = auth.uid()::text OR is_collaborator(trades.user_id, auth.uid()::text))
    )
  );

DROP POLICY IF EXISTS "Commenters and above can insert comments" ON comments;
CREATE POLICY "Commenters and above can insert comments"
  ON comments FOR INSERT
  WITH CHECK (
    auth.uid()::text = user_id AND
    EXISTS (
      SELECT 1 FROM trades 
      WHERE trades.id = trade_id 
      AND (trades.user_id = auth.uid()::text OR is_commenter_or_better(trades.user_id, auth.uid()::text))
    )
  );

DROP POLICY IF EXISTS "Users can update own comments" ON comments;
CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (auth.uid()::text = user_id);

-- RLS Policies for Notifications
DROP POLICY IF EXISTS "Users can manage own notifications" ON notifications;
CREATE POLICY "Users can manage own notifications"
  ON notifications FOR ALL
  USING (auth.uid()::text = user_id);

-- RLS Policies for Activity Logs
DROP POLICY IF EXISTS "Collaborators can view activity" ON activity_logs;
CREATE POLICY "Collaborators can view activity"
  ON activity_logs FOR SELECT
  USING (auth.uid()::text = journal_owner_uid OR is_collaborator(journal_owner_uid, auth.uid()::text));

DROP POLICY IF EXISTS "Only system/backend can insert activity" ON activity_logs;
CREATE POLICY "Only system/backend can insert activity"
  ON activity_logs FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- 4.5 Accept pending invites function
CREATE OR REPLACE FUNCTION accept_pending_invites(user_email TEXT, user_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE journal_collaborators
  SET status = 'accepted', collaborator_uid = user_id
  WHERE email = user_email AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
-- Drop the publication if it exists and recreate it for trades and comments
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE trades, comments;
  
  -- Set REPLICA IDENTITY to FULL for realtime to broadcast old/new records
  ALTER TABLE trades REPLICA IDENTITY FULL;
  ALTER TABLE comments REPLICA IDENTITY FULL;
COMMIT;
