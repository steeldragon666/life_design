-- TTS rate limiting table for ElevenLabs voice synthesis
CREATE TABLE tts_rate_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  request_count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tts_rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only read their own rate limit data.
-- Writes are handled server-side via the service role key.
CREATE POLICY "Users read own rate limit"
  ON tts_rate_limits
  FOR SELECT
  USING (auth.uid() = user_id);
