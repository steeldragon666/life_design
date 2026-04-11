CREATE TABLE IF NOT EXISTS federated_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_number integer NOT NULL,
  target_dimension text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'aggregating', 'complete')),
  min_participants integer NOT NULL DEFAULT 5,
  aggregate_weights jsonb,
  aggregate_bias numeric,
  total_samples integer DEFAULT 0,
  participant_count integer DEFAULT 0,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE TABLE IF NOT EXISTS gradient_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES federated_rounds(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weights jsonb NOT NULL,
  bias numeric NOT NULL,
  sample_count integer NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(round_id, user_id)
);

ALTER TABLE federated_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE gradient_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read round status" ON federated_rounds FOR SELECT USING (true);
CREATE POLICY "Service role manages rounds" ON federated_rounds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Users can submit gradients" ON gradient_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own submissions" ON gradient_submissions FOR SELECT USING (auth.uid() = user_id);
