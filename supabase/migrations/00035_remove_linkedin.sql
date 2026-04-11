-- ============================================================
-- Migration 00035: Remove LinkedIn integration data
-- ============================================================

DELETE FROM integration_providers WHERE provider = 'linkedin';
DELETE FROM user_connections WHERE provider = 'linkedin';
