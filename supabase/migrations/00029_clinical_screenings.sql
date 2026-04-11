-- Clinical screening instruments (PHQ-9, GAD-7)
-- Part of Research-Backed Redesign Phase 1

CREATE TABLE IF NOT EXISTS clinical_screenings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument text NOT NULL CHECK (instrument IN ('phq9', 'gad7')),
  responses jsonb NOT NULL DEFAULT '{}',
  total_score integer NOT NULL,
  severity text NOT NULL,
  critical_flags jsonb DEFAULT '{}',
  context text DEFAULT 'routine', -- 'onboarding', 'routine', 'followup'
  administered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for user timeline queries
CREATE INDEX idx_clinical_screenings_user_date
  ON clinical_screenings(user_id, administered_at DESC);

-- Index for severity monitoring
CREATE INDEX idx_clinical_screenings_severity
  ON clinical_screenings(instrument, severity);

-- RLS policies
ALTER TABLE clinical_screenings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own screenings"
  ON clinical_screenings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own screenings"
  ON clinical_screenings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Crisis events audit table (clinical-grade logging)
CREATE TABLE IF NOT EXISTS crisis_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_type text NOT NULL, -- 'phq9_item9', 'mentor_keyword', 'manual'
  trigger_detail jsonb DEFAULT '{}',
  response_shown jsonb NOT NULL, -- what safety resources were displayed
  acknowledged_at timestamptz, -- when user acknowledged the resources
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crisis_events_user
  ON crisis_events(user_id, created_at DESC);

ALTER TABLE crisis_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own crisis events"
  ON crisis_events FOR SELECT
  USING (auth.uid() = user_id);

-- Only server-side can insert crisis events (via service role)
CREATE POLICY "Service role inserts crisis events"
  ON crisis_events FOR INSERT
  WITH CHECK (true);
