-- Tighten profiles INSERT policy: only allow users to insert their own profile row.
-- The previous policy (WITH CHECK (true)) allowed any authenticated user to insert
-- a profile for any auth.users(id). The trigger handle_new_user() runs as SECURITY
-- DEFINER so it bypasses RLS entirely and is unaffected by this change.

DROP POLICY IF EXISTS profiles_insert ON profiles;
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
