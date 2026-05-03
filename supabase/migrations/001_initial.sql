CREATE TABLE IF NOT EXISTS keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL UNIQUE,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS official_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL CHECK (platform IN ('youtube', 'spotify')),
  account_id text NOT NULL,
  account_name text,
  UNIQUE(platform, account_id)
);

CREATE TABLE IF NOT EXISTS detected_leaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL CHECK (platform IN ('youtube', 'spotify')),
  content_id text NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  channel_or_artist text,
  keyword_matched text NOT NULL,
  published_at timestamptz,
  detected_at timestamptz DEFAULT now(),
  notified boolean DEFAULT false,
  UNIQUE(platform, content_id)
);

CREATE TABLE IF NOT EXISTS scan_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  platform text DEFAULT 'all',
  keywords_scanned integer DEFAULT 0,
  leaks_found integer DEFAULT 0,
  youtube_units_used integer DEFAULT 0,
  status text DEFAULT 'running' CHECK (status IN ('running', 'completed', 'error')),
  error_message text
);

CREATE TABLE IF NOT EXISTS system_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS youtube_quota (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  units_used integer DEFAULT 0,
  UNIQUE(date)
);

INSERT INTO system_config (key, value) VALUES ('monitoring_start_date', now()::text) ON CONFLICT (key) DO NOTHING;
INSERT INTO system_config (key, value) VALUES ('youtube_max_keywords', '8') ON CONFLICT (key) DO NOTHING;
INSERT INTO youtube_quota (date, units_used) VALUES (CURRENT_DATE, 0) ON CONFLICT (date) DO NOTHING;
