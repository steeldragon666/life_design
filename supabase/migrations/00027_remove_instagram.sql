-- Remove Instagram integration data (research-backed redesign)
-- Social media metrics provide unreliable wellness signals and can trigger social comparison.
DELETE FROM user_connections WHERE provider = 'instagram';
DELETE FROM integration_metadata WHERE provider = 'instagram';
