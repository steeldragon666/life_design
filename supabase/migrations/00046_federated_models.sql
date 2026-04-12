CREATE TABLE IF NOT EXISTS federated_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_dimension text NOT NULL,
  model_version integer NOT NULL,
  weights jsonb NOT NULL,
  bias numeric NOT NULL,
  total_samples integer NOT NULL,
  participant_count integer NOT NULL,
  round_id uuid REFERENCES federated_rounds(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(target_dimension, model_version)
);

ALTER TABLE federated_models ENABLE ROW LEVEL SECURITY;

-- Anyone can read federated models (they're anonymized aggregates)
CREATE POLICY "Anyone can read federated models" ON federated_models FOR SELECT USING (true);
CREATE POLICY "Service role manages federated models" ON federated_models FOR ALL USING (true) WITH CHECK (true);

-- Index for fast lookups of latest model version per dimension
CREATE INDEX idx_federated_models_dimension_version ON federated_models (target_dimension, model_version DESC);
