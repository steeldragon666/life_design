'use server';

import { createClient } from '@/lib/supabase/server';
import { updateProfile, type ProfileData } from '@/lib/services/profile-service';
import { validateUserProfile } from '@life-design/core';

export async function updateProfileAction(input: Partial<ProfileData>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const validation = validateUserProfile(input);
  if (!validation.valid) return { error: validation.error };

  const { data, error } = await updateProfile(user.id, input);
  return { data, error };
}
