-- Persist mentor conversation summaries for cross-session memory.

CREATE TABLE IF NOT EXISTS mentor_conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'chat',
  user_message TEXT NOT NULL,
  mentor_response TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentor_conversation_user_created
  ON mentor_conversation_summaries(user_id, created_at DESC);

ALTER TABLE mentor_conversation_summaries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mentor_conversation_summaries'
      AND policyname = 'mentor_conversation_summaries_select'
  ) THEN
    CREATE POLICY mentor_conversation_summaries_select
      ON mentor_conversation_summaries
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END
$$;
