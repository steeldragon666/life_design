-- Journal Enhancements
-- Adds sentiment/dimension tracking to checkins and creates a unified
-- journal_entries table for both check-in journals and standalone entries.
-- Also creates the journey_narratives table for AI-generated progress stories.

-- ============================================================
-- Checkin journal metadata columns
-- ============================================================
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS journal_sentiment REAL;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS journal_dimensions TEXT[];

-- ============================================================
-- Journal Entries (unified: check-in + standalone)
-- ============================================================
CREATE TABLE IF NOT EXISTS journal_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  source          TEXT NOT NULL DEFAULT 'standalone'
                    CHECK (source IN ('standalone', 'checkin')),
  checkin_id      UUID REFERENCES checkins(id) ON DELETE SET NULL,
  sentiment       REAL,
  themes          TEXT[],
  dimensions      TEXT[],
  embedding       vector(384),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_journal_entries_user
  ON journal_entries(user_id, created_at DESC);

CREATE INDEX idx_journal_entries_source
  ON journal_entries(source);

CREATE INDEX idx_journal_entries_checkin
  ON journal_entries(checkin_id)
  WHERE checkin_id IS NOT NULL;

-- IVFFlat index for semantic search on journal embeddings
CREATE INDEX IF NOT EXISTS idx_journal_entries_embedding
  ON journal_entries
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================
-- RLS for journal_entries
-- ============================================================
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own journal entries"
  ON journal_entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Semantic search RPC for journal entries
-- ============================================================
CREATE OR REPLACE FUNCTION find_similar_journal_entries(
  p_user_id UUID,
  p_embedding vector(384),
  p_limit INT DEFAULT 5,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (
  entry_id UUID,
  content TEXT,
  source TEXT,
  created_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT id, content, source, created_at,
         1 - (embedding <=> p_embedding) AS similarity
  FROM journal_entries
  WHERE user_id = p_user_id
    AND embedding IS NOT NULL
    AND (p_exclude_id IS NULL OR id != p_exclude_id)
  ORDER BY embedding <=> p_embedding
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION find_similar_journal_entries TO authenticated;

-- ============================================================
-- Journey Narratives (AI-generated progress stories)
-- ============================================================
CREATE TABLE IF NOT EXISTS journey_narratives (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  narrative       TEXT NOT NULL,
  highlights      JSONB NOT NULL DEFAULT '[]',
  key_quotes      JSONB NOT NULL DEFAULT '[]',
  timeline_events JSONB NOT NULL DEFAULT '[]',
  stats           JSONB NOT NULL DEFAULT '{}',
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  period_start    DATE,
  period_end      DATE,
  UNIQUE(user_id)
);

ALTER TABLE journey_narratives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own journey narrative"
  ON journey_narratives FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users upsert own journey narrative"
  ON journey_narratives FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own journey narrative"
  ON journey_narratives FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
