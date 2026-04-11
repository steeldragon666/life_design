CREATE TABLE IF NOT EXISTS jitai_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision_at timestamptz NOT NULL DEFAULT now(),
  context jsonb NOT NULL,
  should_intervene boolean NOT NULL,
  intervention_type text NOT NULL,
  urgency text NOT NULL,
  content jsonb,
  reasoning text,
  delivered boolean DEFAULT false,
  dismissed_at timestamptz,
  acted_at timestamptz
);

CREATE INDEX idx_jitai_user_date ON jitai_decisions(user_id, decision_at DESC);

ALTER TABLE jitai_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own JITAI decisions"
  ON jitai_decisions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role manages JITAI decisions"
  ON jitai_decisions FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role updates JITAI decisions"
  ON jitai_decisions FOR UPDATE USING (true) WITH CHECK (true);
