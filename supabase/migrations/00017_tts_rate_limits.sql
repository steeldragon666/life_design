-- TTS rate limiting table for ElevenLabs voice synthesis
CREATE TABLE tts_rate_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  request_count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tts_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own rate limit"
  ON tts_rate_limits
  FOR ALL
  USING (auth.uid() = user_id);
