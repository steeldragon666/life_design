-- ============================================================
-- Migration 00013: user_connections + connector_sync_log
--
-- user_connections replaces the plain-text token columns in
-- the integrations table with AES-256-GCM encrypted bytea
-- storage, meeting OWASP credential storage requirements.
--
-- connector_sync_log provides an audit trail for every sync
-- run and disconnection event, including failure tracking for
-- the auto-disable circuit breaker.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- user_connections: encrypted OAuth token storage
-- ─────────────────────────────────────────────────────────────

CREATE TABLE user_connections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users NOT NULL,
  provider        text NOT NULL
    CHECK (provider IN (
      'apple_health', 'strava', 'google_calendar', 'gmail',
      'spotify', 'slack', 'instagram', 'notion', 'banking',
      'linkedin', 'weather'
    )),
  -- AES-256-GCM ciphertext: [ authTag (16 bytes) || ciphertext ]
  encrypted_tokens bytea NOT NULL,
  -- 12-byte GCM initialisation vector
  token_iv        bytea NOT NULL,
  -- Denormalised expiry for cheap server-side token-freshness checks.
  expires_at      timestamptz,
  connected_at    timestamptz NOT NULL DEFAULT now(),
  last_sync_at    timestamptz,
  sync_enabled    boolean DEFAULT true,
  UNIQUE (user_id, provider)
);

CREATE INDEX idx_user_connections_user ON user_connections (user_id);
CREATE INDEX idx_user_connections_sync
  ON user_connections (sync_enabled, last_sync_at)
  WHERE sync_enabled = true;

-- ─────────────────────────────────────────────────────────────
-- connector_sync_log: audit trail for sync runs
-- ─────────────────────────────────────────────────────────────

CREATE TABLE connector_sync_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES auth.users NOT NULL,
  provider          text NOT NULL,
  -- 'sync' | 'disconnected' | 'token_refresh' | 'error'
  event             text NOT NULL DEFAULT 'sync',
  status            text NOT NULL DEFAULT 'success'
    CHECK (status IN ('success', 'error', 'skipped')),
  records_processed integer DEFAULT 0,
  error_message     text,
  synced_at         timestamptz NOT NULL DEFAULT now(),
  -- Consecutive failure counter — used by auto-disable circuit breaker.
  consecutive_failures integer NOT NULL DEFAULT 0,
  recorded_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_log_user_provider
  ON connector_sync_log (user_id, provider, synced_at DESC);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security — user_connections
--
-- Policy intent:
--   SELECT  — users may read their own connection metadata.
--   DELETE  — users may revoke their own connections.
--   INSERT  — only service_role (server-side OAuth flow).
--   UPDATE  — only service_role (token refresh, sync metadata).
-- ─────────────────────────────────────────────────────────────

ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_connections_select
  ON user_connections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY user_connections_delete
  ON user_connections
  FOR DELETE
  USING (auth.uid() = user_id);

-- INSERT and UPDATE are intentionally omitted for the anon/authenticated
-- roles. The service_role key used by the backend bypasses RLS entirely,
-- which is the correct pattern for writing encrypted credentials.

-- ─────────────────────────────────────────────────────────────
-- Row Level Security — connector_sync_log
--
-- Users may read their own log entries. All writes go through
-- service_role (Edge Functions / API routes).
-- ─────────────────────────────────────────────────────────────

ALTER TABLE connector_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY connector_sync_log_select
  ON connector_sync_log
  FOR SELECT
  USING (auth.uid() = user_id);
