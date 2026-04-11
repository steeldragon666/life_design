CREATE TABLE IF NOT EXISTS sleep_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  total_sleep_minutes integer,
  deep_sleep_minutes integer,
  rem_sleep_minutes integer,
  light_sleep_minutes integer,
  awake_minutes integer,
  sleep_latency_minutes integer,
  sleep_efficiency numeric(5,2), -- percentage
  wake_after_sleep_onset integer, -- WASO in minutes
  sleep_quality_score numeric(3,1), -- 1-5 computed score
  raw_data jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_sleep_analysis_user_date
  ON sleep_analysis(user_id, date DESC);

ALTER TABLE sleep_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sleep analysis"
  ON sleep_analysis FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role inserts sleep analysis"
  ON sleep_analysis FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role updates sleep analysis"
  ON sleep_analysis FOR UPDATE USING (true) WITH CHECK (true);
