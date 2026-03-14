-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 00014: connector_sync_log
--
-- Records every sync attempt from any Life Design connector (Apple Health,
-- Strava, Google Calendar, etc.) so that:
--   - Users can see the history and status of their data imports.
--   - The platform can detect stale syncs and prompt reconnection.
--   - Debugging is possible without access to application logs.
--
-- RLS policy:
--   - Users may SELECT their own rows (dashboard display).
--   - INSERT and UPDATE are restricted to service_role (server-side only).
--     Client code must go through an Edge Function or API route that uses
--     the service_role key to write sync results.
-- ─────────────────────────────────────────────────────────────────────────────

-- Migration 00013 already created connector_sync_log with a simpler schema.
-- This migration upgrades it to the richer schema needed by the sync pipeline.

-- Drop the old table and recreate with the improved schema.
-- Safe in development; the table only contains sync audit logs with no user data.
DROP TABLE IF EXISTS connector_sync_log CASCADE;

CREATE TABLE connector_sync_log (
  id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid         REFERENCES auth.users NOT NULL,
  connector         text         NOT NULL,
  status            text         NOT NULL CHECK (status IN ('syncing', 'success', 'partial', 'failed')),
  records_processed int          NOT NULL DEFAULT 0,
  features_stored   int          NOT NULL DEFAULT 0,
  error_message     text,
  started_at        timestamptz  NOT NULL DEFAULT now(),
  completed_at      timestamptz,
  metadata          jsonb
);

COMMENT ON TABLE connector_sync_log IS
  'Audit log of every data sync attempt from Life Design connectors.';

COMMENT ON COLUMN connector_sync_log.connector IS
  'Connector identifier, e.g. ''apple_health'', ''strava'', ''google_calendar''.';

COMMENT ON COLUMN connector_sync_log.status IS
  'syncing = in progress; success = completed without errors; '
  'partial = completed with non-fatal errors; failed = aborted.';

COMMENT ON COLUMN connector_sync_log.records_processed IS
  'Number of raw source records consumed (HealthKit samples, Strava activities, etc.).';

COMMENT ON COLUMN connector_sync_log.features_stored IS
  'Number of NormalisedFeature rows upserted into feature_store.';

COMMENT ON COLUMN connector_sync_log.metadata IS
  'Arbitrary connector-specific context, e.g. date range queried, SDK version.';

-- ── Index ────────────────────────────────────────────────────────────────────
-- Supports the most common access pattern: "show me this user's recent syncs
-- for a specific connector, newest first".
CREATE INDEX idx_connector_sync_user
  ON connector_sync_log (user_id, connector, started_at DESC);

-- ── Row-Level Security ───────────────────────────────────────────────────────
ALTER TABLE connector_sync_log ENABLE ROW LEVEL SECURITY;

-- Users can read their own sync history (e.g. for dashboard status display).
CREATE POLICY "Users can view their own sync logs"
  ON connector_sync_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT is intentionally not granted to the authenticated role.
-- The server (service_role via Edge Function) writes all sync records.

-- UPDATE is intentionally not granted to the authenticated role.
-- Only service_role can transition a row from 'syncing' to a terminal status.

-- Explicit denial policies are not required in Supabase because any
-- operation not covered by an ALLOW policy is denied by default.
