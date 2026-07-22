CREATE TABLE IF NOT EXISTS ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  aliases TEXT NOT NULL DEFAULT '[]',
  risk_level TEXT NOT NULL CHECK (risk_level IN ('avoid','caution','safe')),
  why TEXT NOT NULL,
  max_amount TEXT,
  condition_flags TEXT NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'seed' CHECK (source IN ('seed','agent')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cache_key TEXT UNIQUE NOT NULL,
  name TEXT,
  barcode TEXT,
  ingredients_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scans (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('processing','partial','complete','failed')),
  input_type TEXT NOT NULL CHECK (input_type IN ('barcode','photos')),
  product_name TEXT,
  ingredients_json TEXT NOT NULL DEFAULT '[]',
  profile_json TEXT NOT NULL,
  report_json TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
