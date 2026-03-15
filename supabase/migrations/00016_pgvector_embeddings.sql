-- Migration: pgvector embedding storage
-- Adds vector columns for journal/goal embeddings to enable similarity search.
-- Requires pgvector extension (supported on Supabase free tier).

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Add embedding column to checkins for journal entry embeddings
ALTER TABLE checkins
  ADD COLUMN IF NOT EXISTS journal_embedding vector(384);

-- Add embedding column to goals for semantic classification
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS title_embedding vector(384);

-- Add embedding column to daily_checkins (denormalized) for ML pipeline
ALTER TABLE daily_checkins
  ADD COLUMN IF NOT EXISTS journal_embedding vector(384);

-- IVFFlat index for cosine distance on checkin journal embeddings
-- lists=100 is tuned for up to ~50K rows; adjust with REINDEX if dataset grows
CREATE INDEX IF NOT EXISTS idx_checkins_journal_embedding
  ON checkins
  USING ivfflat (journal_embedding vector_cosine_ops)
  WITH (lists = 100);

-- IVFFlat index for goal embeddings
CREATE INDEX IF NOT EXISTS idx_goals_title_embedding
  ON goals
  USING ivfflat (title_embedding vector_cosine_ops)
  WITH (lists = 50);

-- RPC function: find similar journal entries for a given user
-- Returns the N most semantically similar past entries by cosine distance.
CREATE OR REPLACE FUNCTION find_similar_journal_entries(
  p_user_id UUID,
  p_embedding vector(384),
  p_limit INT DEFAULT 3,
  p_exclude_checkin_id UUID DEFAULT NULL
)
RETURNS TABLE (
  checkin_id UUID,
  checkin_date DATE,
  journal_entry TEXT,
  similarity FLOAT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    c.id AS checkin_id,
    c.date AS checkin_date,
    c.journal_entry,
    1 - (c.journal_embedding <=> p_embedding) AS similarity
  FROM checkins c
  WHERE c.user_id = p_user_id
    AND c.journal_embedding IS NOT NULL
    AND c.journal_entry IS NOT NULL
    AND c.journal_entry != ''
    AND (p_exclude_checkin_id IS NULL OR c.id != p_exclude_checkin_id)
  ORDER BY c.journal_embedding <=> p_embedding
  LIMIT p_limit;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION find_similar_journal_entries TO authenticated;
