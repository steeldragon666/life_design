-- 00012: Gamification tables + entitlements lookup
-- user_streaks, user_progress, and the static entitlements matrix.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. user_streaks — per-user streak tracking with freeze mechanics
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_streaks (
  user_id                uuid        PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  current_streak         integer     NOT NULL DEFAULT 0,
  longest_streak         integer     NOT NULL DEFAULT 0,
  last_checkin_date      date,
  total_checkins         integer     NOT NULL DEFAULT 0,
  streak_freeze_available boolean    NOT NULL DEFAULT true,
  streak_freeze_used_week boolean    NOT NULL DEFAULT false,
  week_start_date        date        NOT NULL DEFAULT date_trunc('week', current_date)::date,
  updated_at             timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE user_streaks IS 'One row per user — tracks check-in streaks and freeze status.';

ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streaks"
  ON user_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own streaks"
  ON user_streaks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on user_streaks"
  ON user_streaks FOR ALL
  USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. user_progress — gamification XP and level tracking
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_progress (
  user_id            uuid        PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  level              integer     NOT NULL DEFAULT 1,
  total_xp           integer     NOT NULL DEFAULT 0,
  current_streak     integer     NOT NULL DEFAULT 0,
  longest_streak     integer     NOT NULL DEFAULT 0,
  total_checkins     integer     NOT NULL DEFAULT 0,
  deep_checkins      integer     NOT NULL DEFAULT 0,
  voice_entries      integer     NOT NULL DEFAULT 0,
  sources_connected  integer     NOT NULL DEFAULT 0,
  goals_completed    integer     NOT NULL DEFAULT 0,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE user_progress IS 'Denormalised gamification stats — level, XP, and activity counters.';

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on user_progress"
  ON user_progress FOR ALL
  USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. entitlements — static plan × feature access matrix
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS entitlements (
  id       uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  plan     text    NOT NULL,
  feature  text    NOT NULL,
  enabled  boolean NOT NULL DEFAULT true,

  UNIQUE (plan, feature)
);

COMMENT ON TABLE entitlements IS 'Static lookup: which features are enabled for each subscription plan.';

-- No RLS needed — this is a public read-only lookup table
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read entitlements"
  ON entitlements FOR SELECT
  USING (true);

CREATE POLICY "Service role manages entitlements"
  ON entitlements FOR ALL
  USING (auth.role() = 'service_role');
