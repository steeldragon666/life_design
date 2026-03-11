-- Health metrics table for Apple Health integration
-- Data is synced from the iOS app via API endpoint

CREATE TABLE health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sleep_hours NUMERIC,
  steps INTEGER,
  active_minutes INTEGER,
  heart_rate_avg INTEGER,
  heart_rate_variability INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_health_metrics_user_date ON health_metrics(user_id, date DESC);

-- RLS
ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY health_metrics_select ON health_metrics
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY health_metrics_insert ON health_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY health_metrics_update ON health_metrics
  FOR UPDATE USING (auth.uid() = user_id);

-- Add metadata JSONB column to integrations for provider-specific config
-- (e.g., Open Banking account_id, Notion workspace_id)
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
