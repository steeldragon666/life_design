-- The handle_new_user() trigger runs as SECURITY DEFINER but the function
-- owner may not bypass RLS. Grant explicit insert for service role usage
-- and ensure the trigger function can insert profiles.
ALTER FUNCTION handle_new_user() SET search_path = public;

-- Also add an INSERT policy so the auth system can create profiles
-- The trigger fires in the context of the new user's auth.uid()
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (true);
