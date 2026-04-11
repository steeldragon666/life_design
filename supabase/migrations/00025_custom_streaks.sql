-- 00025: Custom streaks table for user-defined streak tracking

CREATE TABLE custom_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_completed_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE custom_streaks ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_custom_streaks_user ON custom_streaks(user_id);

CREATE POLICY "Users can manage own custom streaks"
  ON custom_streaks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
