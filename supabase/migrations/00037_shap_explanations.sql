-- SHAP explanations for per-user model predictions
CREATE TABLE IF NOT EXISTS shap_explanations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prediction_date date NOT NULL,
  target_dimension text NOT NULL,
  predicted_value numeric(3,1),
  base_value numeric(3,1),        -- model intercept / average prediction
  feature_contributions jsonb NOT NULL DEFAULT '[]',  -- [{feature, value, shap_value}]
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_shap_user_date ON shap_explanations(user_id, prediction_date DESC);

ALTER TABLE shap_explanations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own SHAP explanations"
  ON shap_explanations FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role inserts SHAP explanations"
  ON shap_explanations FOR INSERT WITH CHECK (true);
