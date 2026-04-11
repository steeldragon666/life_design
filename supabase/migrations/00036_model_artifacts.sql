-- 00036: Model artifacts table for per-user trained model weights
-- Stores ridge-regression weights produced by the model-trainer edge function.

CREATE TABLE IF NOT EXISTS model_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_version integer NOT NULL DEFAULT 1,
  target_dimension text NOT NULL,
  feature_names jsonb NOT NULL DEFAULT '[]',
  weights jsonb NOT NULL DEFAULT '[]',
  intercept numeric NOT NULL DEFAULT 0,
  training_metrics jsonb NOT NULL DEFAULT '{}',
  feature_importance jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, target_dimension, model_version)
);

CREATE INDEX idx_model_artifacts_user ON model_artifacts(user_id, target_dimension, model_version DESC);

ALTER TABLE model_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own models"
  ON model_artifacts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role manages models"
  ON model_artifacts FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role updates models"
  ON model_artifacts FOR UPDATE USING (true) WITH CHECK (true);
