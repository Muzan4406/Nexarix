-- ============================================================
-- NEXARIX - Schéma complet de la base de données
-- À exécuter dans Supabase → SQL Editor → New query
-- ============================================================

-- 1. Enums
CREATE TYPE IF NOT EXISTS user_status AS ENUM ('inactive', 'active', 'banned');
CREATE TYPE IF NOT EXISTS withdrawal_status AS ENUM ('pending', 'paid', 'rejected');

-- 2. Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  country TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  status user_status NOT NULL DEFAULT 'inactive',
  membership TEXT NOT NULL DEFAULT 'Free',
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  upline TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  welcome_bonus NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_withdrawn NUMERIC(12, 2) NOT NULL DEFAULT 0,
  mlm_earnings_l1 NUMERIC(12, 2) NOT NULL DEFAULT 0,
  mlm_earnings_l2 NUMERIC(12, 2) NOT NULL DEFAULT 0,
  mlm_earnings_l3 NUMERIC(12, 2) NOT NULL DEFAULT 0,
  task_earnings NUMERIC(12, 2) NOT NULL DEFAULT 0,
  has_spun BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_url TEXT NOT NULL,
  points INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  question TEXT,
  correct_answer TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- 4. Withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  operator TEXT NOT NULL,
  phone TEXT NOT NULL,
  country TEXT,
  amount_gross NUMERIC(12, 2) NOT NULL,
  fee NUMERIC(12, 2) NOT NULL,
  amount_net NUMERIC(12, 2) NOT NULL,
  status withdrawal_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  sendavapay_reference TEXT,
  sendavapay_status TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 5. Site Settings
CREATE TABLE IF NOT EXISTS site_settings (
  id SERIAL PRIMARY KEY,
  support_email TEXT NOT NULL DEFAULT 'support@nexarix.com',
  telegram_link TEXT NOT NULL DEFAULT 'https://t.me/nexarix',
  telegram_channel TEXT,
  whatsapp_link TEXT NOT NULL DEFAULT 'https://wa.me/nexarix',
  vcf_link TEXT,
  activation_fee NUMERIC(12, 2) NOT NULL DEFAULT 3000,
  min_withdrawal NUMERIC(12, 2) NOT NULL DEFAULT 3000,
  payment_mode TEXT NOT NULL DEFAULT 'manual',
  sendavapay_api_key TEXT,
  sendavapay_webhook_secret TEXT,
  app_base_url TEXT
);

-- 6. Task Completions
CREATE TABLE IF NOT EXISTS task_completions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  completed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 7. Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 8. Store Items
CREATE TABLE IF NOT EXISTS store_items (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'app',
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT false,
  thumbnail_url TEXT,
  download_url TEXT,
  file_type TEXT NOT NULL DEFAULT 'apk',
  version TEXT,
  file_size TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_premium BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 9. Formations
CREATE TABLE IF NOT EXISTS formations (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  thumbnail_url TEXT,
  video_url TEXT,
  content_url TEXT,
  duration TEXT,
  level TEXT NOT NULL DEFAULT 'debutant',
  is_free BOOLEAN NOT NULL DEFAULT true,
  price NUMERIC(10, 2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 10. Formation Purchases
CREATE TABLE IF NOT EXISTS formation_purchases (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  formation_id INTEGER NOT NULL,
  amount NUMERIC(10, 2),
  status TEXT NOT NULL DEFAULT 'pending',
  sendavapay_reference TEXT,
  payment_token TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 11. Services
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  link_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 12. Admin OTP Sessions
CREATE TABLE IF NOT EXISTS admin_otp_sessions (
  session_token TEXT PRIMARY KEY,
  otp TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 1,
  expires_at BIGINT NOT NULL
);

-- 13. Default site settings row (required for the app to function)
INSERT INTO site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
