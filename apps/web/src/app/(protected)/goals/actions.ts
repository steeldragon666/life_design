'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { validateGoal, validateMilestone, validateProgress } from '@life-design/core';
import type { GoalHorizon, GoalTrackingType, GoalStatus } from '@life-design/core';
import {
  createGoal,
  updateGoal,
  deleteGoal,
  addMilestone,
  toggleMilestone,
  logProgress,
} from '@/lib/services/goal-service';

async function getAuthUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function createGoalAction(input: {
  title: string;
  description?: string;
  horizon: GoalHorizon;
  trackingType: GoalTrackingType;
  targetDate: string;
  metricTarget?: number | null;
  metricUnit?: string | null;
  dimensions: string[];
  milestones?: string[];
}) {
  const userId = await getAuthUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };

  const validation = validateGoal({
    title: input.title,
    horizon: input.horizon,
    trackingType: input.trackingType,
    targetDate: input.targetDate,
    dimensions: input.dimensions,
  });
  if (!validation.valid) return { data: null, error: validation.error };

  const result = await createGoal(userId, input);
  if (!result.error) revalidatePath('/goals');
  return result;
}

export async function updateGoalAction(
  goalId: string,
  input: {
    title?: string;
    description?: string;
    horizon?: GoalHorizon;
    status?: GoalStatus;
    trackingType?: GoalTrackingType;
    targetDate?: string;
    metricTarget?: number | null;
    metricUnit?: string | null;
    dimensions?: string[];
  },
) {
  const userId = await getAuthUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };

  // Validate fields if provided
  if (input.title !== undefined || input.horizon !== undefined || input.trackingType !== undefined || input.targetDate !== undefined || input.dimensions !== undefined) {
    const validation = validateGoal({
      title: input.title ?? 'placeholder',
      horizon: input.horizon ?? ('short' as GoalHorizon),
      trackingType: input.trackingType ?? ('milestone' as GoalTrackingType),
      targetDate: input.targetDate ?? '2026-12-31',
      dimensions: input.dimensions ?? ['growth'],
    });
    // Only fail on fields that were actually provided
    if (input.title !== undefined && (!input.title || input.title.length > 200)) {
      return { data: null, error: 'Title must be 1-200 characters' };
    }
    if (input.dimensions !== undefined && validation.error?.includes('dimension')) {
      return { data: null, error: validation.error };
    }
  }

  const result = await updateGoal(goalId, input);
  if (!result.error) revalidatePath(`/goals/${goalId}`);
  return result;
}

export async function deleteGoalAction(goalId: string) {
  const userId = await getAuthUserId();
  if (!userId) return { error: 'Not authenticated' };

  const result = await deleteGoal(goalId);
  if (!result.error) revalidatePath('/goals');
  return result;
}

export async function addMilestoneAction(goalId: string, title: string) {
  const userId = await getAuthUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };

  const validation = validateMilestone({ title });
  if (!validation.valid) return { data: null, error: validation.error };

  const result = await addMilestone(goalId, title);
  if (!result.error) revalidatePath(`/goals/${goalId}`);
  return result;
}

export async function toggleMilestoneAction(milestoneId: string, goalId: string) {
  const userId = await getAuthUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };

  const result = await toggleMilestone(milestoneId);
  if (!result.error) revalidatePath(`/goals/${goalId}`);
  return result;
}

export async function logProgressAction(
  goalId: string,
  metricValue: number,
  note?: string,
) {
  const userId = await getAuthUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };

  const validation = validateProgress({ metricValue });
  if (!validation.valid) return { data: null, error: validation.error };

  const result = await logProgress(goalId, metricValue, note);
  if (!result.error) revalidatePath(`/goals/${goalId}`);
  return result;
}
