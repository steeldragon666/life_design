'use server';

import { createClient } from '@/lib/supabase/server';
import { getIntegrationToken } from '@/lib/services/integration-service';
import { GoogleCalendarConnector } from '@life-design/core';
import { revalidatePath } from 'next/cache';
import type { Goal, GoalMilestone } from '@life-design/core';

/**
 * Persist the title embedding for a goal via the /api/embeddings route.
 * Fire-and-forget — embedding failures never block goal creation.
 * We call the API route rather than importing ai-local directly to avoid
 * pulling onnxruntime-node native binaries into the server action bundle.
 */
async function persistGoalTitleEmbedding(goalId: string): Promise<void> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    await fetch(`${baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal_id: goalId }),
    });
  } catch (err) {
    console.warn('[goals/actions] Goal embedding persistence failed:', err);
  }
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  horizon: string;
  trackingType: string;
  targetDate: string;
  metricTarget?: number | null;
  metricUnit?: string | null;
  dimensions?: string[];
  milestones?: string[];
}

export interface CreateGoalResult {
  success: boolean;
  goal?: Goal & { id: string };
  error?: string;
}

export async function schedulePathwayStep(stepId: string, title: string, description: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const tokenData = await getIntegrationToken(user.id, 'google_calendar');
  if (!tokenData.accessToken) {
    return { error: 'Google Calendar not connected' };
  }

  const connector = new GoogleCalendarConnector(tokenData.accessToken);
  
  // Default to tomorrow 10 AM
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  
  const end = new Date(tomorrow);
  end.setHours(11, 0, 0, 0);

  const event = {
    summary: `[Life Design] ${title}`,
    description: description,
    start: {
      dateTime: tomorrow.toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: 'UTC',
    },
  };

  try {
    const result = await connector.createEvent(event);
    if (result.id) {
      // Mark step as scheduled in DB (assuming a 'scheduled_event_id' field exists or similar)
      await supabase
        .from('pathway_steps')
        .update({ completed: false /* or a new 'scheduled' status */ })
        .eq('id', stepId);
      
      revalidatePath('/goals');
      return { success: true, eventId: result.id };
    }
    return { error: 'Failed to create calendar event' };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function createGoalAction(input: CreateGoalInput): Promise<CreateGoalResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const {
    title,
    description,
    horizon,
    targetDate,
    dimensions,
    trackingType,
    metricTarget,
    metricUnit,
    milestones,
  } = input;

  const { data: goal, error: goalError } = await supabase
    .from('goals')
    .insert({
      user_id: user.id,
      title,
      description,
      horizon,
      target_date: targetDate,
      dimensions,
      tracking_type: trackingType,
      metric_target: metricTarget,
      metric_unit: metricUnit,
      status: 'active'
    })
    .select()
    .single();

  if (goalError) return { success: false, error: goalError.message };

  if (milestones && milestones.length > 0) {
    const { error: msError } = await supabase
      .from('milestones')
      .insert(milestones.map((m: string, i: number) => ({
        goal_id: goal.id,
        title: m,
        position: i,
        completed: false
      })));
    if (msError) console.error('Failed to insert milestones:', msError);
  }

  // Fire-and-forget: compute and persist the title embedding for semantic search
  persistGoalTitleEmbedding(goal.id).catch(() => {});

  revalidatePath('/goals');
  return { success: true, goal };
}

export async function updateGoalAction(
  goalId: string,
  updates: Record<string, string | number | boolean | null>
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', goalId);

  if (error) return { error: error.message };
  revalidatePath(`/goals/${goalId}`);
  revalidatePath('/goals');
  return { success: true };
}

export async function deleteGoalAction(goalId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', goalId);

  if (error) return { error: error.message };
  revalidatePath('/goals');
  return { success: true };
}

export async function addMilestoneAction(goalId: string, title: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('milestones')
    .insert({ goal_id: goalId, title, completed: false });

  if (error) return { error: error.message };
  revalidatePath(`/goals/${goalId}`);
  return { success: true };
}

export async function toggleMilestoneAction(milestoneId: string, completed: boolean, goalId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('milestones')
    .update({ completed })
    .eq('id', milestoneId);

  if (error) return { error: error.message };
  revalidatePath(`/goals/${goalId}`);
  return { success: true };
}

export async function logProgressAction(goalId: string, value: number, note?: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('goal_progress')
    .insert({ goal_id: goalId, value, note });

  if (error) return { error: error.message };
  revalidatePath(`/goals/${goalId}`);
  return { success: true };
}
