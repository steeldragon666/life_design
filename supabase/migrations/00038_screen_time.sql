CREATE TABLE IF NOT EXISTS screen_time_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  total_minutes integer,
  category_breakdown jsonb DEFAULT '{}',
  pickup_count integer,
  late_night_minutes integer,
  productivity_ratio numeric(3,2),
  social_media_minutes integer,
  digital_wellness_score numeric(2,1),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_screen_time_user_date ON screen_time_daily(user_id, date DESC);
ALTER TABLE screen_time_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own screen time" ON screen_time_daily FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role inserts screen time" ON screen_time_daily FOR INSERT WITH CHECK (true);
