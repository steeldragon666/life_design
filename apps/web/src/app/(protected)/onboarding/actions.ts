'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { activateMentor } from '@/lib/services/mentor-service';

export async function completeOnboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  await supabase
    .from('profiles')
    .update({ onboarded: true })
    .eq('id', user.id);

  redirect('/dashboard');
}

export async function onboardActivateMentor(mentorId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  await activateMentor(user.id, mentorId);
  return { error: null };
}
