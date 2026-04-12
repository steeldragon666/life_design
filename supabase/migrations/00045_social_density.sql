CREATE TABLE IF NOT EXISTS social_density_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  baseline_density numeric(4,3) NOT NULL,  -- 0.000 to 1.000
  window_days integer NOT NULL DEFAULT 14,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX idx_social_density_user ON social_density_baselines(user_id);
ALTER TABLE social_density_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own baselines" ON social_density_baselines FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own baselines" ON social_density_baselines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own baselines" ON social_density_baselines FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
