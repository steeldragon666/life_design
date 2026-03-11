-- Life Design: Goals, Pathways, and Profile Extensions
-- Extends the schema with goal-setting, pathway planning, and user profile context

-- ============================================================
-- Extend profiles with life context fields
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profession TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS projects TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hobbies TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS postcode TEXT;

-- ============================================================
-- Extend integration_provider enum with new providers
-- ============================================================
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'google_calendar';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'gmail';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'slack';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'instagram';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'weather';

-- ============================================================
-- Extend insight_type enum with goal-aware types
-- ============================================================
ALTER TYPE insight_type ADD VALUE IF NOT EXISTS 'goal_progress';
ALTER TYPE insight_type ADD VALUE IF NOT EXISTS 'goal_risk';

-- ============================================================
-- Goal enums
-- ============================================================
CREATE TYPE goal_horizon AS ENUM ('short', 'medium', 'long');
CREATE TYPE goal_status AS ENUM ('active', 'completed', 'paused', 'abandoned');
CREATE TYPE goal_tracking_type AS ENUM ('milestone', 'metric');

-- ============================================================
-- Goals
-- ============================================================
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  horizon goal_horizon NOT NULL,
  status goal_status NOT NULL DEFAULT 'active',
  tracking_type goal_tracking_type NOT NULL,
  target_date DATE NOT NULL,
  metric_target NUMERIC,
  metric_current NUMERIC DEFAULT 0,
  metric_unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_goals_user ON goals(user_id);
CREATE INDEX idx_goals_user_status ON goals(user_id, status);

-- ============================================================
-- Goal-dimension many-to-many
-- ============================================================
CREATE TABLE goal_dimensions (
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  dimension dimension NOT NULL,
  PRIMARY KEY (goal_id, dimension)
);

-- ============================================================
-- Goal milestones
-- ============================================================
CREATE TABLE goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_milestones_goal ON goal_milestones(goal_id);

-- ============================================================
-- Goal progress log (metric tracking over time)
-- ============================================================
CREATE TABLE goal_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  metric_value NUMERIC,
  note TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_progress_goal ON goal_progress(goal_id);

-- ============================================================
-- Pathways (AI-collaborative plans to achieve goals)
-- ============================================================
CREATE TABLE pathways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  dimension_impacts JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pathways_goal ON pathways(goal_id);

-- ============================================================
-- Pathway steps
-- ============================================================
CREATE TABLE pathway_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pathway_id UUID NOT NULL REFERENCES pathways(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_steps_pathway ON pathway_steps(pathway_id);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE pathways ENABLE ROW LEVEL SECURITY;
ALTER TABLE pathway_steps ENABLE ROW LEVEL SECURITY;

-- Goals policies
CREATE POLICY goals_select ON goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY goals_insert ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY goals_update ON goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY goals_delete ON goals FOR DELETE USING (auth.uid() = user_id);

-- Goal dimensions policies
CREATE POLICY goal_dimensions_select ON goal_dimensions FOR SELECT
  USING (goal_id IN (SELECT id FROM goals WHERE user_id = auth.uid()));
CREATE POLICY goal_dimensions_insert ON goal_dimensions FOR INSERT
  WITH CHECK (goal_id IN (SELECT id FROM goals WHERE user_id = auth.uid()));
CREATE POLICY goal_dimensions_delete ON goal_dimensions FOR DELETE
  USING (goal_id IN (SELECT id FROM goals WHERE user_id = auth.uid()));

-- Milestones policies
CREATE POLICY milestones_select ON goal_milestones FOR SELECT
  USING (goal_id IN (SELECT id FROM goals WHERE user_id = auth.uid()));
CREATE POLICY milestones_insert ON goal_milestones FOR INSERT
  WITH CHECK (goal_id IN (SELECT id FROM goals WHERE user_id = auth.uid()));
CREATE POLICY milestones_update ON goal_milestones FOR UPDATE
  USING (goal_id IN (SELECT id FROM goals WHERE user_id = auth.uid()));
CREATE POLICY milestones_delete ON goal_milestones FOR DELETE
  USING (goal_id IN (SELECT id FROM goals WHERE user_id = auth.uid()));

-- Progress policies
CREATE POLICY progress_select ON goal_progress FOR SELECT
  USING (goal_id IN (SELECT id FROM goals WHERE user_id = auth.uid()));
CREATE POLICY progress_insert ON goal_progress FOR INSERT
  WITH CHECK (goal_id IN (SELECT id FROM goals WHERE user_id = auth.uid()));

-- Pathways policies
CREATE POLICY pathways_select ON pathways FOR SELECT
  USING (goal_id IN (SELECT id FROM goals WHERE user_id = auth.uid()));
CREATE POLICY pathways_insert ON pathways FOR INSERT
  WITH CHECK (goal_id IN (SELECT id FROM goals WHERE user_id = auth.uid()));
CREATE POLICY pathways_update ON pathways FOR UPDATE
  USING (goal_id IN (SELECT id FROM goals WHERE user_id = auth.uid()));
CREATE POLICY pathways_delete ON pathways FOR DELETE
  USING (goal_id IN (SELECT id FROM goals WHERE user_id = auth.uid()));

-- Pathway steps policies
CREATE POLICY steps_select ON pathway_steps FOR SELECT
  USING (pathway_id IN (SELECT id FROM pathways WHERE goal_id IN (SELECT id FROM goals WHERE user_id = auth.uid())));
CREATE POLICY steps_insert ON pathway_steps FOR INSERT
  WITH CHECK (pathway_id IN (SELECT id FROM pathways WHERE goal_id IN (SELECT id FROM goals WHERE user_id = auth.uid())));
CREATE POLICY steps_update ON pathway_steps FOR UPDATE
  USING (pathway_id IN (SELECT id FROM pathways WHERE goal_id IN (SELECT id FROM goals WHERE user_id = auth.uid())));

-- ============================================================
-- Triggers for updated_at
-- ============================================================
CREATE TRIGGER set_goals_updated_at BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_pathways_updated_at BEFORE UPDATE ON pathways
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
