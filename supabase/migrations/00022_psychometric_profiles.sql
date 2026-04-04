-- Psychometric Profiles
-- Stores validated psychometric assessment results for each user.
-- Instruments covered: PERMA Profiler, TIPI Big Five, Short Grit Scale,
-- Satisfaction With Life Scale (SWLS), and Basic Psychological Needs Scale (BPNS).
-- Raw item responses are retained as JSONB for future re-scoring.
-- A unique (user_id, version) constraint supports longitudinal re-assessment.
-- update_updated_at() was defined in 00001_initial_schema.sql.

-- ============================================================
-- Psychometric Profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS psychometric_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version         INTEGER NOT NULL DEFAULT 1,

  -- PERMA Profiler (5 subscales + overall)
  perma_positive_emotion REAL,
  perma_engagement       REAL,
  perma_relationships    REAL,
  perma_meaning          REAL,
  perma_accomplishment   REAL,
  perma_overall          REAL,

  -- TIPI Big Five (5 traits)
  tipi_extraversion        REAL,
  tipi_agreeableness       REAL,
  tipi_conscientiousness   REAL,
  tipi_emotional_stability REAL,
  tipi_openness            REAL,

  -- Short Grit Scale (2 subscales + composite)
  grit_perseverance   REAL,
  grit_consistency    REAL,
  grit_overall        REAL,

  -- SWLS (1 score + band label)
  swls_score REAL,
  swls_band  TEXT,

  -- BPNS (3 subscales)
  bpns_autonomy    REAL,
  bpns_competence  REAL,
  bpns_relatedness REAL,

  -- Raw item responses retained for re-scoring
  raw_responses    JSONB NOT NULL DEFAULT '{}',

  -- AI-generated narrative summary
  narrative_summary TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, version)
);

CREATE INDEX idx_psychometric_profiles_user
  ON psychometric_profiles(user_id, version DESC);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE psychometric_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own psychometric profiles"
  ON psychometric_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own psychometric profiles"
  ON psychometric_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own psychometric profiles"
  ON psychometric_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Auto-update timestamp trigger
-- ============================================================
CREATE TRIGGER set_psychometric_profiles_updated_at
  BEFORE UPDATE ON psychometric_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
