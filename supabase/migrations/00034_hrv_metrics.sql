CREATE TABLE IF NOT EXISTS hrv_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measured_at timestamptz NOT NULL,
  rmssd numeric(8,2),
  sdnn numeric(8,2),
  mean_rr numeric(8,2),
  mean_hr numeric(8,2),
  stress_level text CHECK (stress_level IN ('low', 'moderate', 'high')),
  stress_score integer CHECK (stress_score BETWEEN 0 AND 100),
  rr_intervals jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hrv_user_date ON hrv_metrics(user_id, measured_at DESC);

ALTER TABLE hrv_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own HRV metrics"
  ON hrv_metrics FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role inserts HRV metrics"
  ON hrv_metrics FOR INSERT WITH CHECK (true);
