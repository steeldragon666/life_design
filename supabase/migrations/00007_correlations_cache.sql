-- Correlation cache + insight novelty tracking.
-- This table supports nightly correlation worker writes and fast dashboard reads.

CREATE TABLE IF NOT EXISTS correlation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dimension_a TEXT NOT NULL,
  dimension_b TEXT NOT NULL,
  correlation_coefficient DOUBLE PRECISION NOT NULL,
  lag_days INTEGER NOT NULL DEFAULT 0,
  sample_size INTEGER NOT NULL,
  confidence DOUBLE PRECISION NOT NULL,
  p_value DOUBLE PRECISION,
  insight_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_correlation_results_user ON correlation_results(user_id);
CREATE INDEX IF NOT EXISTS idx_correlation_results_dimensions
  ON correlation_results(user_id, dimension_a, dimension_b);
CREATE INDEX IF NOT EXISTS idx_correlation_results_computed_at
  ON correlation_results(user_id, computed_at DESC);

ALTER TABLE correlation_results ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'correlation_results'
      AND policyname = 'correlation_results_select'
  ) THEN
    CREATE POLICY correlation_results_select
      ON correlation_results
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS user_insights_seen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  insight_hash TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, insight_hash)
);

CREATE INDEX IF NOT EXISTS idx_user_insights_seen_user ON user_insights_seen(user_id);
CREATE INDEX IF NOT EXISTS idx_user_insights_seen_dismissed
  ON user_insights_seen(user_id, dismissed);

ALTER TABLE user_insights_seen ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_insights_seen'
      AND policyname = 'user_insights_seen_select'
  ) THEN
    CREATE POLICY user_insights_seen_select
      ON user_insights_seen
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_insights_seen'
      AND policyname = 'user_insights_seen_insert'
  ) THEN
    CREATE POLICY user_insights_seen_insert
      ON user_insights_seen
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_insights_seen'
      AND policyname = 'user_insights_seen_update'
  ) THEN
    CREATE POLICY user_insights_seen_update
      ON user_insights_seen
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END
$$;
