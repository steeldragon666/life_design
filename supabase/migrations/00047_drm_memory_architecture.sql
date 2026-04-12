-- =============================================================================
-- Migration 00047: Deep Relational Model (DRM) Memory Architecture
--
-- Implements a four-layer memory system for the AI companion:
--   Layer 1 — Episodic Memory  : what happened (per-session events)
--   Layer 2 — Semantic Memory  : who you are   (stable user profile)
--   Layer 3 — Relational Memory: our history   (relationship arc)
--   Layer 4 — Therapeutic Mem. : what works    (effective interventions)
--
-- Also creates companion session/message tracking, safety audit logs,
-- growth narratives, life stories, pattern intelligence, micro-moments,
-- assessment session tracking, and adaptive communication DNA.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. companion_sessions
--    Tracks each discrete conversation session between user and AI companion.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS companion_sessions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at              TIMESTAMPTZ,
  message_count         INTEGER     NOT NULL DEFAULT 0,
  emotional_valence_avg REAL,                          -- mean valence over session (-1.0 to +1.0)
  phase                 TEXT        NOT NULL DEFAULT 'initial', -- DRM relationship phase at session time
  model_used            TEXT,                          -- 'sonnet' | 'opus'
  total_input_tokens    INTEGER     NOT NULL DEFAULT 0,
  total_output_tokens   INTEGER     NOT NULL DEFAULT 0
);

COMMENT ON TABLE companion_sessions IS
  'One row per AI companion conversation session. Tracks token usage, emotional '
  'valence, and the DRM relationship phase active at the time of the session.';

ALTER TABLE companion_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own companion sessions"
  ON companion_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own companion sessions"
  ON companion_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own companion sessions"
  ON companion_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_companion_sessions_user_started
  ON companion_sessions (user_id, started_at DESC);


-- ---------------------------------------------------------------------------
-- 2. companion_messages
--    Full turn-by-turn message history for DRM sessions.
--    Replaces mentor_messages for the DRM companion flow.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS companion_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID        NOT NULL REFERENCES companion_sessions(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT        NOT NULL,
  safety_tier INTEGER,                -- 1 = safe, 2 = elevated concern, 3 = crisis
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE companion_messages IS
  'Full message history for DRM companion sessions. Each row is one turn. '
  'safety_tier reflects the classification assigned at send time.';

ALTER TABLE companion_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own companion messages"
  ON companion_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own companion messages"
  ON companion_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own companion messages"
  ON companion_messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_companion_messages_session_created
  ON companion_messages (session_id, created_at);


-- ---------------------------------------------------------------------------
-- 3. episodic_memory  (DRM Layer 1)
--    Records what happened — one row per notable session event or session end.
--    Supports semantic search via 1536-dim OpenAI-compatible embeddings.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS episodic_memory (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id           UUID        REFERENCES companion_sessions(id) ON DELETE SET NULL,
  timestamp            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  summary              TEXT        NOT NULL,
  emotional_valence    REAL        CHECK (emotional_valence BETWEEN -1.0 AND 1.0),
  topics               TEXT[],
  interventions_used   TEXT[],
  outcome_rating       REAL        CHECK (outcome_rating BETWEEN 0.0 AND 1.0),
  notable_quotes       TEXT[],
  follow_up            TEXT,
  embedding            vector(1536),          -- for cosine-similarity retrieval
  detail_level         TEXT        NOT NULL DEFAULT 'full'
                                   CHECK (detail_level IN ('full', 'summary', 'abstracted')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE episodic_memory IS
  'DRM Layer 1 — Episodic Memory. Records what happened in each session with '
  'structured metadata and a 1536-dim embedding for semantic retrieval. '
  'detail_level degrades over time as memories are compressed.';

ALTER TABLE episodic_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own episodic memories"
  ON episodic_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own episodic memories"
  ON episodic_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own episodic memories"
  ON episodic_memory FOR UPDATE
  USING (auth.uid() = user_id);

-- Chronological lookup per user
CREATE INDEX idx_episodic_memory_user_timestamp
  ON episodic_memory (user_id, timestamp DESC);

-- IVFFlat index for approximate nearest-neighbour vector search.
-- lists = 100 is appropriate for up to ~1 M rows; revisit at scale.
-- Requires at least (lists * 39) rows before it is used by the planner.
CREATE INDEX idx_episodic_memory_embedding
  ON episodic_memory USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);


-- ---------------------------------------------------------------------------
-- 4. semantic_memory  (DRM Layer 2)
--    One row per user — flexible JSONB buckets capturing who the user is.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS semantic_memory (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  life_context             JSONB       NOT NULL DEFAULT '{}',
  psychological_profile    JSONB       NOT NULL DEFAULT '{}',
  therapeutic_preferences  JSONB       NOT NULL DEFAULT '{}',
  last_updated             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE semantic_memory IS
  'DRM Layer 2 — Semantic Memory. Stable, schema-flexible representation of '
  'who the user is: life context, psychological profile, and therapy preferences. '
  'One row per user; upserted by the companion at session close.';

ALTER TABLE semantic_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own semantic memory"
  ON semantic_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own semantic memory"
  ON semantic_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own semantic memory"
  ON semantic_memory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_semantic_memory_life_context
  ON semantic_memory USING GIN (life_context);

CREATE INDEX idx_semantic_memory_psychological_profile
  ON semantic_memory USING GIN (psychological_profile);

CREATE INDEX idx_semantic_memory_therapeutic_preferences
  ON semantic_memory USING GIN (therapeutic_preferences);


-- ---------------------------------------------------------------------------
-- 5. relational_memory  (DRM Layer 3)
--    One row per user — tracks the arc of the human–AI relationship over time.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS relational_memory (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_started TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_sessions       INTEGER     NOT NULL DEFAULT 0,
  total_messages       INTEGER     NOT NULL DEFAULT 0,
  trust_trajectory     TEXT        NOT NULL DEFAULT '',
  current_phase        TEXT        NOT NULL DEFAULT 'initial',
  interaction_patterns JSONB       NOT NULL DEFAULT '{}',
  milestones           JSONB       NOT NULL DEFAULT '[]',
  rapport_notes        TEXT        NOT NULL DEFAULT '',
  last_updated         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE relational_memory IS
  'DRM Layer 3 — Relational Memory. Captures the full arc of the relationship '
  'between user and companion: phase progression, trust trajectory, interaction '
  'patterns, and milestones. One row per user.';

ALTER TABLE relational_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own relational memory"
  ON relational_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own relational memory"
  ON relational_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own relational memory"
  ON relational_memory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_relational_memory_interaction_patterns
  ON relational_memory USING GIN (interaction_patterns);

CREATE INDEX idx_relational_memory_milestones
  ON relational_memory USING GIN (milestones);


-- ---------------------------------------------------------------------------
-- 6. therapeutic_memory  (DRM Layer 4)
--    One row per user — encodes what interventions work and what to avoid.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS therapeutic_memory (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  issue_intervention_map JSONB      NOT NULL DEFAULT '[]',
  timing_intelligence   JSONB       NOT NULL DEFAULT '{}',
  resistance_patterns   JSONB       NOT NULL DEFAULT '[]',
  last_updated          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE therapeutic_memory IS
  'DRM Layer 4 — Therapeutic Memory. Captures which interventions work for this '
  'specific user, optimal timing, and resistance patterns to avoid. '
  'One row per user; enriched continuously as the relationship deepens.';

ALTER TABLE therapeutic_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own therapeutic memory"
  ON therapeutic_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own therapeutic memory"
  ON therapeutic_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own therapeutic memory"
  ON therapeutic_memory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_therapeutic_memory_issue_map
  ON therapeutic_memory USING GIN (issue_intervention_map);

CREATE INDEX idx_therapeutic_memory_resistance
  ON therapeutic_memory USING GIN (resistance_patterns);


-- ---------------------------------------------------------------------------
-- 7. safety_classifications
--    Immutable audit log of every safety classification made by the system.
--    Users can SELECT their own records; INSERT is service-role only.
--    No UPDATE or DELETE policy is defined — rows are append-only by design.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS safety_classifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id  UUID        REFERENCES companion_messages(id) ON DELETE SET NULL,
  tier        INTEGER     NOT NULL CHECK (tier IN (1, 2, 3)),
  signal      TEXT,
  confidence  REAL        NOT NULL CHECK (confidence BETWEEN 0.0 AND 1.0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE safety_classifications IS
  'Append-only audit log of every safety tier classification. Tier 1 = routine, '
  'Tier 2 = elevated concern, Tier 3 = crisis. INSERT is restricted to the '
  'service role; no UPDATE or DELETE is permitted to preserve audit integrity.';

ALTER TABLE safety_classifications ENABLE ROW LEVEL SECURITY;

-- Users may read their own safety classifications (transparency).
CREATE POLICY "Users can select own safety classifications"
  ON safety_classifications FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT policy for authenticated users — only the service role inserts.
-- No UPDATE or DELETE policies — records are immutable.

CREATE INDEX idx_safety_classifications_user_created
  ON safety_classifications (user_id, created_at DESC);


-- ---------------------------------------------------------------------------
-- 8. escalation_records
--    Audit log of every human-escalation pathway event.
--    Same append-only pattern as safety_classifications.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS escalation_records (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_tier           INTEGER     NOT NULL,
  trigger_signal         TEXT,
  escalation_type        TEXT        NOT NULL
                                     CHECK (escalation_type IN (
                                       'crisis_resources',
                                       'professional_referral',
                                       'human_handoff'
                                     )),
  crisis_resources_shown TEXT[],
  acknowledged           BOOLEAN     NOT NULL DEFAULT FALSE,
  acknowledged_at        TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE escalation_records IS
  'Append-only audit log of every human escalation event. Records what resources '
  'were shown, the triggering signal, and whether the user acknowledged. '
  'INSERT is service-role only; no UPDATE or DELETE permitted.';

ALTER TABLE escalation_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own escalation records"
  ON escalation_records FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE for authenticated users — service role only.

CREATE INDEX idx_escalation_records_user_created
  ON escalation_records (user_id, created_at DESC);


-- ---------------------------------------------------------------------------
-- 9. growth_narratives
--    Periodically generated narrative summaries of user growth over time.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS growth_narratives (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start      DATE        NOT NULL,
  period_end        DATE        NOT NULL,
  narrative         TEXT        NOT NULL,
  milestones        JSONB       NOT NULL DEFAULT '[]',
  assessment_trends JSONB       NOT NULL DEFAULT '[]',
  patterns_shifted  TEXT[],
  areas_in_progress TEXT[],
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT growth_narratives_period_check CHECK (period_end >= period_start)
);

COMMENT ON TABLE growth_narratives IS
  'Periodic growth narratives synthesising milestones, assessment trends, '
  'and pattern shifts over a defined calendar period. Generated by the '
  'companion at configurable intervals (e.g. weekly, monthly).';

ALTER TABLE growth_narratives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own growth narratives"
  ON growth_narratives FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own growth narratives"
  ON growth_narratives FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own growth narratives"
  ON growth_narratives FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_growth_narratives_user_period
  ON growth_narratives (user_id, period_end DESC);

CREATE INDEX idx_growth_narratives_milestones
  ON growth_narratives USING GIN (milestones);


-- ---------------------------------------------------------------------------
-- 10. life_stories
--     The Life Story model — one row per user, maintained as a living document.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS life_stories (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  chapters     JSONB       NOT NULL DEFAULT '[]',
  themes       TEXT[],
  growth_arcs  JSONB       NOT NULL DEFAULT '[]',
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE life_stories IS
  'The Life Story model — a living document that captures the narrative arc of '
  'the user''s life in chapters, recurring themes, and growth arcs. Updated as '
  'significant chapters are recognised by the companion. One row per user.';

ALTER TABLE life_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own life story"
  ON life_stories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own life story"
  ON life_stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own life story"
  ON life_stories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_life_stories_chapters
  ON life_stories USING GIN (chapters);

CREATE INDEX idx_life_stories_growth_arcs
  ON life_stories USING GIN (growth_arcs);


-- ---------------------------------------------------------------------------
-- 11. pattern_intelligence
--     Detected behavioural patterns — one row per user, refreshed periodically.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pattern_intelligence (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  cyclical_patterns    JSONB       NOT NULL DEFAULT '[]',
  trigger_chains       JSONB       NOT NULL DEFAULT '[]',
  avoidance_patterns   JSONB       NOT NULL DEFAULT '[]',
  growth_trajectories  JSONB       NOT NULL DEFAULT '[]',
  detected_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE pattern_intelligence IS
  'Stores detected behavioural patterns for each user: cyclical emotional cycles, '
  'trigger chains, avoidance patterns, and growth trajectories. Refreshed by the '
  'companion analysis pipeline. One row per user.';

ALTER TABLE pattern_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own pattern intelligence"
  ON pattern_intelligence FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pattern intelligence"
  ON pattern_intelligence FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pattern intelligence"
  ON pattern_intelligence FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_pattern_intelligence_cyclical
  ON pattern_intelligence USING GIN (cyclical_patterns);

CREATE INDEX idx_pattern_intelligence_trigger_chains
  ON pattern_intelligence USING GIN (trigger_chains);


-- ---------------------------------------------------------------------------
-- 12. micro_moments
--     Log of every proactive micro-moment intervention sent to the user.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS micro_moments (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          TEXT        NOT NULL
                            CHECK (type IN (
                              'morning_checkin',
                              'pre_event',
                              'evening_reflection',
                              'post_crisis_followup',
                              'pattern_based'
                            )),
  message       TEXT        NOT NULL,
  context       TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  delivered_at  TIMESTAMPTZ,
  responded_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE micro_moments IS
  'Log of every proactive micro-moment intervention: morning check-ins, '
  'pre-event priming, evening reflections, post-crisis follow-ups, and '
  'pattern-based nudges. Tracks scheduling, delivery, and response timestamps.';

ALTER TABLE micro_moments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own micro moments"
  ON micro_moments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own micro moments"
  ON micro_moments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own micro moments"
  ON micro_moments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_micro_moments_user_scheduled
  ON micro_moments (user_id, scheduled_for);


-- ---------------------------------------------------------------------------
-- 13. assessment_sessions
--     Tracks in-progress and completed PHQ-9 / GAD-7 assessments embedded
--     naturally into companion conversations.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assessment_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument      TEXT        NOT NULL CHECK (instrument IN ('PHQ-9', 'GAD-7')),
  items           JSONB       NOT NULL,   -- array of { itemIndex, score, administeredAt }
  completed_items INTEGER     NOT NULL DEFAULT 0,
  total_items     INTEGER     NOT NULL,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  total_score     INTEGER,
  severity        TEXT,                   -- e.g. 'minimal', 'mild', 'moderate', 'severe'

  CONSTRAINT assessment_sessions_score_non_negative CHECK (
    total_score IS NULL OR total_score >= 0
  ),
  CONSTRAINT assessment_sessions_completed_lte_total CHECK (
    completed_items <= total_items
  )
);

COMMENT ON TABLE assessment_sessions IS
  'Tracks PHQ-9 and GAD-7 assessments administered conversationally. '
  'items is a JSONB array of { itemIndex, score, administeredAt } objects. '
  'completed_at and total_score are set once all items are answered.';

ALTER TABLE assessment_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own assessment sessions"
  ON assessment_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assessment sessions"
  ON assessment_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assessment sessions"
  ON assessment_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_assessment_sessions_user_instrument_started
  ON assessment_sessions (user_id, instrument, started_at DESC);


-- ---------------------------------------------------------------------------
-- 14. communication_dna
--     Adaptive communication style profile — one row per user.
--     Continuously refined as the companion learns the user's preferences.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS communication_dna (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  emotional_register  TEXT        NOT NULL DEFAULT 'warm',
  metaphor_usage      TEXT        NOT NULL DEFAULT 'moderate',
  directness_level    REAL        NOT NULL DEFAULT 0.5
                                  CHECK (directness_level BETWEEN 0.0 AND 1.0),
  humour_level        REAL        NOT NULL DEFAULT 0.3
                                  CHECK (humour_level BETWEEN 0.0 AND 1.0),
  challenge_level     REAL        NOT NULL DEFAULT 0.3
                                  CHECK (challenge_level BETWEEN 0.0 AND 1.0),
  pacing              TEXT        NOT NULL DEFAULT 'moderate',
  language_complexity TEXT        NOT NULL DEFAULT 'moderate',
  last_updated        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE communication_dna IS
  'Adaptive communication style profile for each user. Scalar parameters '
  '(directness, humour, challenge) are in [0.0, 1.0]. Categorical parameters '
  '(emotional_register, pacing, language_complexity) use free-text labels. '
  'One row per user; updated after sessions where style signals are observed.';

ALTER TABLE communication_dna ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own communication DNA"
  ON communication_dna FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own communication DNA"
  ON communication_dna FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own communication DNA"
  ON communication_dna FOR UPDATE
  USING (auth.uid() = user_id);


-- =============================================================================
-- FUNCTION: find_similar_episodes
--
-- Returns episodic memories for a given user ranked by cosine similarity to
-- a query embedding. Uses the ivfflat index on episodic_memory.embedding.
--
-- Parameters:
--   target_user_id  — the user whose memories to search
--   query_embedding — 1536-dim embedding vector to match against
--   match_count     — maximum rows to return (default 10)
--
-- Returns columns:
--   id, session_id, timestamp, summary, emotional_valence, topics,
--   interventions_used, outcome_rating, notable_quotes, follow_up,
--   detail_level, similarity
-- =============================================================================
CREATE OR REPLACE FUNCTION find_similar_episodes(
  target_user_id  UUID,
  query_embedding vector(1536),
  match_count     INTEGER DEFAULT 10
)
RETURNS TABLE (
  id                 UUID,
  session_id         UUID,
  timestamp          TIMESTAMPTZ,
  summary            TEXT,
  emotional_valence  REAL,
  topics             TEXT[],
  interventions_used TEXT[],
  outcome_rating     REAL,
  notable_quotes     TEXT[],
  follow_up          TEXT,
  detail_level       TEXT,
  similarity         FLOAT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    em.id,
    em.session_id,
    em.timestamp,
    em.summary,
    em.emotional_valence,
    em.topics,
    em.interventions_used,
    em.outcome_rating,
    em.notable_quotes,
    em.follow_up,
    em.detail_level,
    -- cosine similarity: 1 - cosine_distance.  Range [−1, 1]; higher = more similar.
    1 - (em.embedding <=> query_embedding) AS similarity
  FROM  episodic_memory em
  WHERE em.user_id  = target_user_id
    AND em.embedding IS NOT NULL
  ORDER BY em.embedding <=> query_embedding   -- ascending distance = descending similarity
  LIMIT match_count;
$$;

COMMENT ON FUNCTION find_similar_episodes(UUID, vector(1536), INTEGER) IS
  'Returns up to match_count episodic memories for target_user_id ranked by '
  'cosine similarity to query_embedding. Leverages the ivfflat index on '
  'episodic_memory.embedding for sub-linear retrieval at scale. '
  'SECURITY INVOKER ensures RLS policies on episodic_memory are respected — '
  'callers can only retrieve memories they are authorised to read.';
