ALTER TABLE profiles ADD COLUMN IF NOT EXISTS opt_in_tier text NOT NULL DEFAULT 'basic'
  CHECK (opt_in_tier IN ('basic', 'enhanced', 'full'));
