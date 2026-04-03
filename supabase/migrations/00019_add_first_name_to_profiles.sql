-- Add first_name to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;