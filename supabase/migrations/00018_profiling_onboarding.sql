-- Behaviour-First Profiling Onboarding
-- Adds tables for onboarding sessions, user profiles, profile snapshots,
-- behavior events, and predictions. Adds onboarding_status to profiles.

-- ============================================================
-- Onboarding Sessions
-- ============================================================
CREATE TABLE onboarding_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'in_progress'
                    CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  current_section TEXT NOT NULL DEFAULT 'goal',
  current_step    INTEGER NOT NULL DEFAULT 0,
  version         INTEGER NOT NULL DEFAULT 1,
  raw_answers     JSONB NOT NULL DEFAULT '{}',
  normalized_answers JSONB NOT NULL DEFAULT '{}',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own onboarding sessions"
  ON onboarding_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- User Profiles (profiling data — separate from auth profiles)
-- ============================================================
CREATE TABLE user_profiles (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_version           INTEGER NOT NULL DEFAULT 1,

  -- Core profile fields (from onboarding)
  goal_domain               TEXT,
  goal_importance           REAL,
  goal_urgency              REAL,
  execution_consistency     REAL,
  structure_preference      REAL,
  routine_stability         REAL,
  chronotype                TEXT,
  primary_failure_modes     TEXT[],
  recovery_resilience       REAL,
  energy_level              REAL,
  stress_load               REAL,
  life_load                 REAL,
  motivation_type           TEXT,
  action_orientation        REAL,
  delay_discounting_score   REAL,
  self_efficacy             REAL,
  planning_style            TEXT,
  social_recharge_style     TEXT,

  -- Derived scores
  friction_index            REAL,
  discipline_index          REAL,
  structure_need            REAL,
  dropout_risk_initial      REAL,
  goal_success_prior        REAL,

  -- Intervention & confidence
  intervention_preferences  JSONB DEFAULT '{}',
  profile_confidence        REAL NOT NULL DEFAULT 1.0,
  source_mix                JSONB NOT NULL DEFAULT '{"onboarding": 1.0, "behaviour": 0.0}',

  -- Summary
  summary_template          JSONB,
  summary_llm               TEXT,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Profile Snapshots (for historical tracking)
-- ============================================================
CREATE TABLE profile_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_time   TIMESTAMPTZ NOT NULL DEFAULT now(),
  feature_vector  JSONB NOT NULL,
  source_weights  JSONB NOT NULL,
  risk_scores     JSONB NOT NULL
);

ALTER TABLE profile_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own snapshots"
  ON profile_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own snapshots"
  ON profile_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Behavior Events (Phase 2 — table created now)
-- ============================================================
CREATE TABLE behavior_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata        JSONB DEFAULT '{}'
);

CREATE INDEX idx_behavior_events_user_time
  ON behavior_events(user_id, event_timestamp DESC);

ALTER TABLE behavior_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own events"
  ON behavior_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Predictions (Phase 3 — table created now)
-- ============================================================
CREATE TABLE predictions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prediction_type       TEXT NOT NULL,
  prediction_value      REAL NOT NULL,
  prediction_confidence REAL NOT NULL DEFAULT 0.5,
  model_version         TEXT NOT NULL DEFAULT 'rules-v1',
  inputs_hash           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own predictions"
  ON predictions FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- Add onboarding_status to existing profiles table
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_status TEXT
  NOT NULL DEFAULT 'not_started'
  CHECK (onboarding_status IN ('not_started', 'completed'));

-- DEPRECATED: legacy onboarding fields (profession, interests, etc.) preserved for data continuity
-- Migrate existing onboarded users
UPDATE profiles SET onboarding_status = 'completed' WHERE onboarded = true;
