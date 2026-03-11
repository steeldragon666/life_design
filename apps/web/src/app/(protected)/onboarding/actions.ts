'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { activateMentor } from '@/lib/services/mentor-service';
import { updateProfile } from '@/lib/services/profile-service';

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

export async function onboardSaveProfile(data: {
  profession: string;
  interests: string[];
  hobbies: string[];
  skills: string[];
  projects: string[];
  postcode: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  await updateProfile(user.id, {
    profession: data.profession || null,
    interests: data.interests,
    hobbies: data.hobbies,
    skills: data.skills,
    projects: data.projects,
    postcode: data.postcode || null,
  });

  return { error: null };
}
