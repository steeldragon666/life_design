CREATE TABLE IF NOT EXISTS journal_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journal_entry_id uuid REFERENCES journal_entries(id) ON DELETE CASCADE,
  distortions jsonb DEFAULT '[]',
  sentiment_indicators jsonb DEFAULT '{}',
  overall_risk text CHECK (overall_risk IN ('low', 'moderate', 'elevated')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_journal_analysis_user ON journal_analysis(user_id, created_at DESC);
ALTER TABLE journal_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own journal analysis" ON journal_analysis FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role inserts journal analysis" ON journal_analysis FOR INSERT WITH CHECK (true);
