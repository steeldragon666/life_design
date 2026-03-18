-- ============================================================
-- Migration 00017: Enable RLS on mentors table
--
-- The mentors table already has a SELECT policy (mentors_select)
-- defined in migration 00001, but RLS was never actually enabled
-- on the table itself. This is a security gap flagged by the
-- Supabase Advisor — without RLS enabled, the policy is ignored
-- and the table is fully accessible to any authenticated role.
-- ============================================================

ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;

-- Verify the existing policy still allows public reads.
-- (mentors_select was created in 00001 with: FOR SELECT USING (true))
-- No additional policies needed — the table is read-only for clients.
