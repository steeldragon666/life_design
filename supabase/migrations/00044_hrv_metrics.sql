CREATE TABLE IF NOT EXISTS hrv_daily_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  rmssd numeric(6,2),
  sdnn numeric(6,2),
  mean_rr numeric(6,2),
  mean_hr numeric(5,1),
  lf_hf_ratio numeric(5,2),
  stress_score integer,
  stress_level text CHECK (stress_level IN ('low', 'moderate', 'high')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_hrv_daily_user_date ON hrv_daily_metrics(user_id, date DESC);

ALTER TABLE hrv_daily_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own HRV metrics"
  ON hrv_daily_metrics FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own HRV metrics"
  ON hrv_daily_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own HRV metrics"
  ON hrv_daily_metrics FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
