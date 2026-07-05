-- =============================================================================
-- Nexarix — Production Database Migration
-- Run this script on your Plesk PostgreSQL database to bring the schema
-- up to date. All statements use IF NOT EXISTS / DO $$ blocks so they are
-- safe to run multiple times.
-- =============================================================================

-- 1. Enums (create only if they don't already exist)
DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('inactive', 'active', 'banned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE withdrawal_status AS ENUM ('pending', 'paid', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. users table (create if missing)
CREATE TABLE IF NOT EXISTS users (
  id               SERIAL PRIMARY KEY,
  username         TEXT NOT NULL UNIQUE,
  email            TEXT NOT NULL UNIQUE,
  phone            TEXT NOT NULL,
  country          TEXT NOT NULL,
  password_hash    TEXT NOT NULL,
  status           user_status NOT NULL DEFAULT 'inactive',
  membership       TEXT NOT NULL DEFAULT 'Free',
  balance          NUMERIC(12,2) NOT NULL DEFAULT 0,
  points           INTEGER NOT NULL DEFAULT 0,
  upline           TEXT,
  avatar_url       TEXT,
  is_admin         BOOLEAN NOT NULL DEFAULT FALSE,
  is_banned        BOOLEAN NOT NULL DEFAULT FALSE,
  welcome_bonus    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_withdrawn  NUMERIC(12,2) NOT NULL DEFAULT 0,
  mlm_earnings_l1  NUMERIC(12,2) NOT NULL DEFAULT 0,
  mlm_earnings_l2  NUMERIC(12,2) NOT NULL DEFAULT 0,
  mlm_earnings_l3  NUMERIC(12,2) NOT NULL DEFAULT 0,
  task_earnings    NUMERIC(12,2) NOT NULL DEFAULT 0,
  has_spun         BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. Add missing columns to users (safe if already present)
ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_bonus    NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_withdrawn  NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mlm_earnings_l1  NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mlm_earnings_l2  NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mlm_earnings_l3  NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS task_earnings    NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_spun         BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned        BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url       TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS upline           TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership       TEXT NOT NULL DEFAULT 'Free';

-- 4. tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id             SERIAL PRIMARY KEY,
  category       TEXT NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  target_url     TEXT NOT NULL,
  points         INTEGER NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  question       TEXT,
  correct_answer TEXT,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMP
);

-- 5. task_completions table
CREATE TABLE IF NOT EXISTS task_completions (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  task_id      INTEGER NOT NULL REFERENCES tasks(id),
  completed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 6. withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  id                    SERIAL PRIMARY KEY,
  user_id               INTEGER NOT NULL REFERENCES users(id),
  type                  TEXT NOT NULL,
  operator              TEXT NOT NULL,
  phone                 TEXT NOT NULL,
  country               TEXT,
  amount_gross          NUMERIC(12,2) NOT NULL,
  fee                   NUMERIC(12,2) NOT NULL,
  amount_net            NUMERIC(12,2) NOT NULL,
  status                withdrawal_status NOT NULL DEFAULT 'pending',
  rejection_reason      TEXT,
  sendavapay_reference  TEXT,
  sendavapay_status     TEXT,
  created_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 7. transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  type        TEXT NOT NULL,
  amount      NUMERIC(12,2) NOT NULL,
  description TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 8. site_settings table
CREATE TABLE IF NOT EXISTS site_settings (
  id                        SERIAL PRIMARY KEY,
  support_email             TEXT NOT NULL DEFAULT 'support@nexarix.com',
  telegram_link             TEXT NOT NULL DEFAULT 'https://t.me/nexarix',
  telegram_channel          TEXT,
  whatsapp_link             TEXT NOT NULL DEFAULT 'https://wa.me/nexarix',
  vcf_link                  TEXT,
  activation_fee            NUMERIC(12,2) NOT NULL DEFAULT 3000,
  min_withdrawal            NUMERIC(12,2) NOT NULL DEFAULT 3000,
  payment_mode              TEXT NOT NULL DEFAULT 'manual',
  sendavapay_api_key        TEXT,
  sendavapay_webhook_secret TEXT,
  app_base_url              TEXT
);

-- Insert default settings row if table is empty
INSERT INTO site_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- 9. store_items table
CREATE TABLE IF NOT EXISTS store_items (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT,
  category      TEXT NOT NULL DEFAULT 'app',
  price         NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_free       BOOLEAN NOT NULL DEFAULT FALSE,
  thumbnail_url TEXT,
  download_url  TEXT,
  file_type     TEXT NOT NULL DEFAULT 'apk',
  version       TEXT,
  file_size     TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_premium    BOOLEAN NOT NULL DEFAULT TRUE,
  "order"       INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 10. formations table
CREATE TABLE IF NOT EXISTS formations (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT,
  category      TEXT NOT NULL DEFAULT 'general',
  thumbnail_url TEXT,
  video_url     TEXT,
  content_url   TEXT,
  duration      TEXT,
  level         TEXT NOT NULL DEFAULT 'debutant',
  is_free       BOOLEAN NOT NULL DEFAULT TRUE,
  price         NUMERIC(10,2),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  "order"       INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 11. formation_purchases table
CREATE TABLE IF NOT EXISTS formation_purchases (
  id                   SERIAL PRIMARY KEY,
  user_id              INTEGER NOT NULL,
  formation_id         INTEGER NOT NULL,
  amount               NUMERIC(10,2),
  status               TEXT NOT NULL DEFAULT 'pending',
  sendavapay_reference TEXT,
  payment_token        TEXT,
  created_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 12. services table
CREATE TABLE IF NOT EXISTS services (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  image_url   TEXT,
  link_url    TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  "order"     INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 13. admin_otp_sessions table
CREATE TABLE IF NOT EXISTS admin_otp_sessions (
  session_token TEXT PRIMARY KEY,
  otp           TEXT NOT NULL,
  user_id       INTEGER NOT NULL,
  is_admin      INTEGER NOT NULL DEFAULT 1,
  expires_at    BIGINT NOT NULL
);

-- Done
SELECT 'Migration complete ✓' AS result;
