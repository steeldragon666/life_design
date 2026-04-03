import { createClient } from '@/lib/supabase/server';
import type { NormalisedProfile, DerivedScores, ProfileSummaryTemplate } from '@life-design/core';

export interface UserProfile extends NormalisedProfile, DerivedScores {
  id: string;
  user_id: string;
  profile_version: number;
  intervention_preferences: Record<string, unknown>;
  profile_confidence: number;
  source_mix: { onboarding: number; behaviour: number };
  summary_template: ProfileSummaryTemplate | null;
  summary_llm: string | null;
  created_at: string;
  updated_at: string;
}

export async function getUserProfile(userId: string): Promise<{ data: UserProfile | null; error: string | null }> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as UserProfile | null, error: null };
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<{ data: UserProfile | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as UserProfile, error: null };
}

export function getProfileForNudge(profile: UserProfile | null): {
  frictionIndex: number;
  structureNeed: number;
  dropoutRisk: number;
  motivationType: string;
  chronotype: string;
  actionOrientation: number;
} | null {
  if (!profile) return null;
  
  return {
    frictionIndex: profile.friction_index,
    structureNeed: profile.structure_need,
    dropoutRisk: profile.dropout_risk_initial,
    motivationType: profile.motivation_type,
    chronotype: profile.chronotype,
    actionOrientation: profile.action_orientation,
  };
}