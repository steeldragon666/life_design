'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { generatePathway } from '@life-design/ai';
import type { PathwayInput } from '@life-design/ai';
import { createPathway, deletePathway, toggleStep } from '@/lib/services/pathway-service';
import { getGoalById } from '@/lib/services/goal-service';
import { getProfile } from '@/lib/services/profile-service';
import { computeDimensionAverage, computeTrend, ALL_DIMENSIONS } from '@life-design/core';

async function getAuthUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function generatePathwayAction(goalId: string, userPlan: string) {
  const userId = await getAuthUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };

  const { data: goal } = await getGoalById(goalId);
  if (!goal) return { data: null, error: 'Goal not found' };

  const { data: profile } = await getProfile(userId);

  // Get recent check-ins for dimension scores
  const supabase = await createClient();
  const { data: recentCheckins } = await supabase
    .from('checkins')
    .select('*, dimension_scores(dimension, score)')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(30);

  const currentScores = ALL_DIMENSIONS.map((dim) => {
    const scores = (recentCheckins ?? [])
      .flatMap((c: Record<string, unknown>) =>
        (c.dimension_scores as Array<{ dimension: string; score: number }>)
          .filter((s) => s.dimension === dim)
          .map((s) => s.score)
      );
    return {
      dimension: dim,
      average: scores.length > 0 ? computeDimensionAverage(scores) : 5,
      trend: scores.length > 1 ? computeTrend(scores) : 0,
    };
  });

  const input: PathwayInput = {
    goal: {
      title: goal.title,
      description: goal.description ?? '',
      horizon: goal.horizon,
      targetDate: goal.target_date,
      dimensions: goal.goal_dimensions.map((d: { dimension: string }) => d.dimension),
    },
    userProfile: {
      profession: profile?.profession ?? null,
      skills: profile?.skills ?? [],
      interests: profile?.interests ?? [],
      projects: profile?.projects ?? [],
    },
    currentScores,
    userPlan,
  };

  try {
    const generated = await generatePathway(input);

    // Save the pathway
    const result = await createPathway({
      goalId,
      title: generated.title,
      description: generated.description,
      aiGenerated: true,
      dimensionImpacts: generated.dimensionImpacts,
      steps: generated.steps,
    });

    if (!result.error) revalidatePath(`/goals/${goalId}`);

    return {
      data: {
        pathway: result.data,
        risks: generated.risks,
        suggestions: generated.suggestions,
      },
      error: result.error,
    };
  } catch (err) {
    return { data: null, error: 'Failed to generate pathway. Please try again.' };
  }
}

export async function savePathwayAction(input: {
  goalId: string;
  title: string;
  description?: string;
  steps: Array<{ title: string; description: string }>;
  dimensionImpacts: Array<{ dimension: string; impact: number; explanation: string }>;
}) {
  const userId = await getAuthUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };

  const result = await createPathway({
    goalId: input.goalId,
    title: input.title,
    description: input.description,
    aiGenerated: false,
    dimensionImpacts: input.dimensionImpacts,
    steps: input.steps,
  });

  if (!result.error) revalidatePath(`/goals/${input.goalId}`);
  return result;
}

export async function deletePathwayAction(pathwayId: string, goalId: string) {
  const userId = await getAuthUserId();
  if (!userId) return { error: 'Not authenticated' };

  const result = await deletePathway(pathwayId);
  if (!result.error) revalidatePath(`/goals/${goalId}`);
  return result;
}

export async function toggleStepAction(stepId: string, goalId: string) {
  const userId = await getAuthUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };

  const result = await toggleStep(stepId);
  if (!result.error) revalidatePath(`/goals/${goalId}`);
  return result;
}
