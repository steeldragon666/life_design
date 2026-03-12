-- Personalized nudge queue for reminder/insight/milestone engagement loops.

CREATE TABLE IF NOT EXISTS user_nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('reminder', 'insight', 'milestone')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_nudges_user_scheduled
  ON user_nudges(user_id, scheduled_for DESC);
CREATE INDEX IF NOT EXISTS idx_user_nudges_pending
  ON user_nudges(user_id, dismissed, delivered_at);

ALTER TABLE user_nudges ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_nudges' AND policyname = 'user_nudges_select'
  ) THEN
    CREATE POLICY user_nudges_select
      ON user_nudges
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_nudges' AND policyname = 'user_nudges_update'
  ) THEN
    CREATE POLICY user_nudges_update
      ON user_nudges
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END
$$;
