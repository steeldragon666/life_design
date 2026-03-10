-- Life Design: Initial Schema
-- Custom enum types matching packages/core/src/enums.ts

CREATE TYPE dimension AS ENUM (
  'career', 'finance', 'health', 'fitness',
  'family', 'social', 'romance', 'growth'
);

CREATE TYPE mentor_type AS ENUM ('stoic', 'coach', 'scientist');

CREATE TYPE duration_type AS ENUM ('quick', 'deep');

CREATE TYPE insight_type AS ENUM ('trend', 'correlation', 'suggestion');

CREATE TYPE integration_provider AS ENUM ('strava');

CREATE TYPE integration_status AS ENUM ('connected', 'disconnected', 'error');

-- ============================================================
-- Profiles (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Check-ins
-- ============================================================
CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mood INTEGER NOT NULL CHECK (mood BETWEEN 1 AND 10),
  duration_type duration_type NOT NULL DEFAULT 'quick',
  journal_entry TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_checkins_user_date ON checkins(user_id, date DESC);

-- ============================================================
-- Dimension Scores
-- ============================================================
CREATE TABLE dimension_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
  dimension dimension NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 10),
  note TEXT,
  UNIQUE(checkin_id, dimension)
);

CREATE INDEX idx_dimension_scores_checkin ON dimension_scores(checkin_id);

-- ============================================================
-- Mentors (preset, not user-created)
-- ============================================================
CREATE TABLE mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type mentor_type NOT NULL,
  description TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- User-Mentor relationships
-- ============================================================
CREATE TABLE user_mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, mentor_id)
);

CREATE INDEX idx_user_mentors_user ON user_mentors(user_id);

-- ============================================================
-- Mentor Messages (chat history)
-- ============================================================
CREATE TABLE mentor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_mentor_id UUID NOT NULL REFERENCES user_mentors(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mentor_messages_user_mentor ON mentor_messages(user_mentor_id, created_at);

-- ============================================================
-- AI Insights
-- ============================================================
CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type insight_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  dimension dimension,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dismissed BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_insights_user ON insights(user_id, generated_at DESC);

-- ============================================================
-- Integrations (OAuth connections)
-- ============================================================
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider integration_provider NOT NULL,
  status integration_status NOT NULL DEFAULT 'disconnected',
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- ============================================================
-- Integration Metrics (synced data)
-- ============================================================
CREATE TABLE integration_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  dimension dimension NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_integration_metrics_integration ON integration_metrics(integration_id, recorded_at DESC);

-- ============================================================
-- Triggers
-- ============================================================

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON checkins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE dimension_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_metrics ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update own profile
CREATE POLICY profiles_select ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (auth.uid() = id);

-- Check-ins: users can CRUD own check-ins
CREATE POLICY checkins_select ON checkins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY checkins_insert ON checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY checkins_update ON checkins FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY checkins_delete ON checkins FOR DELETE USING (auth.uid() = user_id);

-- Dimension scores: access through check-in ownership
CREATE POLICY dimension_scores_select ON dimension_scores FOR SELECT
  USING (checkin_id IN (SELECT id FROM checkins WHERE user_id = auth.uid()));
CREATE POLICY dimension_scores_insert ON dimension_scores FOR INSERT
  WITH CHECK (checkin_id IN (SELECT id FROM checkins WHERE user_id = auth.uid()));
CREATE POLICY dimension_scores_update ON dimension_scores FOR UPDATE
  USING (checkin_id IN (SELECT id FROM checkins WHERE user_id = auth.uid()));
CREATE POLICY dimension_scores_delete ON dimension_scores FOR DELETE
  USING (checkin_id IN (SELECT id FROM checkins WHERE user_id = auth.uid()));

-- Mentors: readable by all authenticated users
CREATE POLICY mentors_select ON mentors FOR SELECT USING (true);

-- User mentors: users manage own mentor relationships
CREATE POLICY user_mentors_select ON user_mentors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY user_mentors_insert ON user_mentors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_mentors_update ON user_mentors FOR UPDATE USING (auth.uid() = user_id);

-- Mentor messages: access through user_mentor ownership
CREATE POLICY mentor_messages_select ON mentor_messages FOR SELECT
  USING (user_mentor_id IN (SELECT id FROM user_mentors WHERE user_id = auth.uid()));
CREATE POLICY mentor_messages_insert ON mentor_messages FOR INSERT
  WITH CHECK (user_mentor_id IN (SELECT id FROM user_mentors WHERE user_id = auth.uid()));

-- Insights: users see own insights
CREATE POLICY insights_select ON insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY insights_update ON insights FOR UPDATE USING (auth.uid() = user_id);

-- Integrations: users manage own integrations
CREATE POLICY integrations_select ON integrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY integrations_insert ON integrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY integrations_update ON integrations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY integrations_delete ON integrations FOR DELETE USING (auth.uid() = user_id);

-- Integration metrics: access through integration ownership
CREATE POLICY integration_metrics_select ON integration_metrics FOR SELECT
  USING (integration_id IN (SELECT id FROM integrations WHERE user_id = auth.uid()));
CREATE POLICY integration_metrics_insert ON integration_metrics FOR INSERT
  WITH CHECK (integration_id IN (SELECT id FROM integrations WHERE user_id = auth.uid()));
