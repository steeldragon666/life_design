-- Migration: Restrict client-side writes to token columns on the legacy integrations table.
--
-- The integrations table currently allows authenticated users to INSERT/UPDATE
-- their own rows including access_token_encrypted and refresh_token_encrypted.
-- These columns should only be written by server-side code (service role).
--
-- This uses Postgres column-level GRANT/REVOKE to prevent the authenticated
-- role from writing token columns directly via the Supabase client.

-- Revoke UPDATE on token columns from authenticated users.
-- They can still update other columns (provider, status, metadata, etc.).
REVOKE UPDATE (access_token_encrypted, refresh_token_encrypted) ON integrations FROM authenticated;

-- For INSERT, Postgres doesn't support column-level WITH CHECK in policies,
-- so we use a trigger to nullify token values on client-side inserts.
-- Server-side (service_role) bypasses RLS and triggers don't apply to it.
CREATE OR REPLACE FUNCTION prevent_client_token_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- This trigger fires for all roles, but we only nullify token fields
  -- for the 'authenticated' role (client-side inserts via Supabase JS).
  -- service_role inserts pass through with tokens intact.
  IF current_setting('role', true) = 'authenticated' THEN
    NEW.access_token_encrypted := NULL;
    NEW.refresh_token_encrypted := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER guard_token_insert
  BEFORE INSERT ON integrations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_client_token_insert();
