-- 00011: Core analytics tables — feature_store, daily_checkins, daily_insights
-- These tables power the ML pipeline, daily check-in workflow, and AI insight generation.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. feature_store — time-series feature vectors for ML correlations
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feature_store (
  user_id     uuid            NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  dimension   text            NOT NULL,
  feature     text            NOT NULL,
  value       double precision NOT NULL,
  recorded_at timestamptz     NOT NULL DEFAULT now(),
  source      text            NOT NULL DEFAULT 'manual',
  confidence  double precision NOT NULL DEFAULT 1.0
    CHECK (confidence >= 0.0 AND confidence <= 1.0),

  PRIMARY KEY (user_id, feature, recorded_at)
);

COMMENT ON TABLE feature_store IS 'Time-series feature vectors used by the correlation and forecasting pipeline.';

CREATE INDEX IF NOT EXISTS idx_feature_store_user_time
  ON feature_store (user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_store_dimension
  ON feature_store (dimension);
CREATE INDEX IF NOT EXISTS idx_feature_store_feature
  ON feature_store (feature);

ALTER TABLE feature_store ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own features"
  ON feature_store FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own features"
  ON feature_store FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access on feature_store"
  ON feature_store FOR ALL
  USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. daily_checkins — denormalised check-in records for the ML pipeline
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_checkins (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  checkin_date      date        NOT NULL,
  completed_at      timestamptz NOT NULL DEFAULT now(),
  mode              text        NOT NULL DEFAULT 'standard'
    CHECK (mode IN ('standard', 'deep')),
  mood_score        smallint    CHECK (mood_score BETWEEN 1 AND 10),
  energy_level      smallint    CHECK (energy_level BETWEEN 1 AND 10),
  dimension_scores  jsonb,
  journal_entry     text,
  streak_count      integer     NOT NULL DEFAULT 0,
  processing_status text        NOT NULL DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'complete', 'failed')),

  UNIQUE (user_id, checkin_date)
);

COMMENT ON TABLE daily_checkins IS 'One row per user per day — denormalised for ML pipeline joins.';

CREATE INDEX IF NOT EXISTS idx_checkins_user_date
  ON daily_checkins (user_id, checkin_date);
CREATE INDEX IF NOT EXISTS idx_checkins_user_time
  ON daily_checkins (user_id, completed_at DESC);

ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkins"
  ON daily_checkins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkins"
  ON daily_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checkins"
  ON daily_checkins FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on daily_checkins"
  ON daily_checkins FOR ALL
  USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. daily_insights — AI-generated insight bundles, one per user per day
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_insights (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  generated_at timestamptz NOT NULL DEFAULT now(),
  bundle       jsonb,
  headlines    text[],
  read         boolean     NOT NULL DEFAULT false
);

COMMENT ON TABLE daily_insights IS 'One AI-generated insight bundle per user per calendar day.';

-- Unique expression index: one insight per user per calendar day
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_insights_user_day
  ON daily_insights (user_id, (generated_at::date));

-- Partial index for unread insights (used by dashboard query)
CREATE INDEX IF NOT EXISTS idx_daily_insights_unread
  ON daily_insights (user_id)
  WHERE read = false;

ALTER TABLE daily_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights"
  ON daily_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own insights"
  ON daily_insights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on daily_insights"
  ON daily_insights FOR ALL
  USING (auth.role() = 'service_role');
