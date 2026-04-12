CREATE TABLE IF NOT EXISTS weather_daily_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  mood_impact_score numeric(4,2),       -- -1.00 to 1.00
  sunlight_hours numeric(4,1),          -- hours of sunlight
  temperature numeric(5,1),             -- Celsius
  barometric_pressure numeric(6,1),     -- hPa
  sad_risk boolean NOT NULL DEFAULT false,
  outdoor_friendly boolean NOT NULL DEFAULT false,
  cloud_cover numeric(4,1),             -- 0-100%
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_weather_daily_features_user_date
  ON weather_daily_features(user_id, date DESC);

ALTER TABLE weather_daily_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own weather features"
  ON weather_daily_features FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weather features"
  ON weather_daily_features FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weather features"
  ON weather_daily_features FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
