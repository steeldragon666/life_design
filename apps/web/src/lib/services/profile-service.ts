import { createClient } from '@/lib/supabase/server';

export interface ProfileData {
  profession: string | null;
  interests: string[];
  projects: string[];
  hobbies: string[];
  skills: string[];
  postcode: string | null;
}

export async function getProfile(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('profession, interests, projects, hobbies, skills, postcode')
    .eq('id', userId)
    .single();

  return { data: data as ProfileData | null, error: error ? error.message : null };
}

export async function updateProfile(userId: string, input: Partial<ProfileData>) {
  const supabase = await createClient();

  const updates: Record<string, unknown> = {};
  if (input.profession !== undefined) updates.profession = input.profession;
  if (input.interests !== undefined) updates.interests = input.interests;
  if (input.projects !== undefined) updates.projects = input.projects;
  if (input.hobbies !== undefined) updates.hobbies = input.hobbies;
  if (input.skills !== undefined) updates.skills = input.skills;
  if (input.postcode !== undefined) updates.postcode = input.postcode;

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select('profession, interests, projects, hobbies, skills, postcode')
    .single();

  return { data: data as ProfileData | null, error: error ? error.message : null };
}
