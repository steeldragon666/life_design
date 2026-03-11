import { createClient } from '@/lib/supabase/server';
import type { GoalHorizon, GoalStatus, GoalTrackingType } from '@life-design/core';

export interface CreateGoalInput {
  title: string;
  description?: string;
  horizon: GoalHorizon;
  trackingType: GoalTrackingType;
  targetDate: string;
  metricTarget?: number | null;
  metricUnit?: string | null;
  dimensions: string[];
  milestones?: string[]; // titles for initial milestones
}

export interface UpdateGoalInput {
  title?: string;
  description?: string;
  horizon?: GoalHorizon;
  status?: GoalStatus;
  trackingType?: GoalTrackingType;
  targetDate?: string;
  metricTarget?: number | null;
  metricUnit?: string | null;
  dimensions?: string[];
}

export interface GoalFilters {
  horizon?: GoalHorizon;
  status?: GoalStatus;
  dimension?: string;
}

export async function createGoal(userId: string, input: CreateGoalInput) {
  const supabase = await createClient();

  const { data: goal, error: goalError } = await supabase
    .from('goals')
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description ?? null,
      horizon: input.horizon,
      tracking_type: input.trackingType,
      target_date: input.targetDate,
      metric_target: input.metricTarget ?? null,
      metric_unit: input.metricUnit ?? null,
    })
    .select()
    .single();

  if (goalError) return { data: null, error: goalError.message };

  // Insert dimension associations
  if (input.dimensions.length > 0) {
    const dimRows = input.dimensions.map((d) => ({
      goal_id: goal.id,
      dimension: d,
    }));
    const { error: dimError } = await supabase
      .from('goal_dimensions')
      .insert(dimRows);
    if (dimError) return { data: null, error: dimError.message };
  }

  // Insert initial milestones if provided
  if (input.milestones && input.milestones.length > 0) {
    const msRows = input.milestones.map((title, i) => ({
      goal_id: goal.id,
      title,
      position: i,
    }));
    const { error: msError } = await supabase
      .from('goal_milestones')
      .insert(msRows);
    if (msError) return { data: null, error: msError.message };
  }

  return { data: goal, error: null };
}

export async function getGoals(userId: string, filters?: GoalFilters) {
  const supabase = await createClient();

  let query = supabase
    .from('goals')
    .select('*, goal_dimensions(dimension), goal_milestones(id, completed)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (filters?.horizon) {
    query = query.eq('horizon', filters.horizon);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) return { data: null, error: error.message };

  // Filter by dimension if specified (post-query since it's a join)
  let filtered = data;
  if (filters?.dimension) {
    filtered = data?.filter((g: Record<string, unknown>) =>
      (g.goal_dimensions as Array<{ dimension: string }>)?.some(
        (d) => d.dimension === filters.dimension
      )
    ) ?? [];
  }

  return { data: filtered, error: null };
}

export async function getGoalById(goalId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('goals')
    .select(`
      *,
      goal_dimensions(dimension),
      goal_milestones(id, title, position, completed, completed_at),
      goal_progress(id, metric_value, note, recorded_at)
    `)
    .eq('id', goalId)
    .order('position', { referencedTable: 'goal_milestones', ascending: true })
    .order('recorded_at', { referencedTable: 'goal_progress', ascending: false })
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function updateGoal(goalId: string, input: UpdateGoalInput) {
  const supabase = await createClient();

  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.horizon !== undefined) updates.horizon = input.horizon;
  if (input.status !== undefined) updates.status = input.status;
  if (input.trackingType !== undefined) updates.tracking_type = input.trackingType;
  if (input.targetDate !== undefined) updates.target_date = input.targetDate;
  if (input.metricTarget !== undefined) updates.metric_target = input.metricTarget;
  if (input.metricUnit !== undefined) updates.metric_unit = input.metricUnit;

  const { data, error } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', goalId)
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  // Update dimensions if provided
  if (input.dimensions !== undefined) {
    await supabase.from('goal_dimensions').delete().eq('goal_id', goalId);
    if (input.dimensions.length > 0) {
      const dimRows = input.dimensions.map((d) => ({
        goal_id: goalId,
        dimension: d,
      }));
      await supabase.from('goal_dimensions').insert(dimRows);
    }
  }

  return { data, error: null };
}

export async function deleteGoal(goalId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', goalId);

  return { error: error ? error.message : null };
}

export async function addMilestone(goalId: string, title: string) {
  const supabase = await createClient();

  // Get next position
  const { data: existing } = await supabase
    .from('goal_milestones')
    .select('position')
    .eq('goal_id', goalId)
    .order('position', { ascending: false })
    .limit(1);

  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

  const { data, error } = await supabase
    .from('goal_milestones')
    .insert({ goal_id: goalId, title, position: nextPosition })
    .select()
    .single();

  return { data, error: error ? error.message : null };
}

export async function toggleMilestone(milestoneId: string) {
  const supabase = await createClient();

  // Get current state
  const { data: current } = await supabase
    .from('goal_milestones')
    .select('completed')
    .eq('id', milestoneId)
    .single();

  if (!current) return { data: null, error: 'Milestone not found' };

  const newCompleted = !current.completed;
  const { data, error } = await supabase
    .from('goal_milestones')
    .update({
      completed: newCompleted,
      completed_at: newCompleted ? new Date().toISOString() : null,
    })
    .eq('id', milestoneId)
    .select()
    .single();

  return { data, error: error ? error.message : null };
}

export async function logProgress(
  goalId: string,
  metricValue: number,
  note?: string,
) {
  const supabase = await createClient();

  // Insert progress entry
  const { data: progress, error: progError } = await supabase
    .from('goal_progress')
    .insert({
      goal_id: goalId,
      metric_value: metricValue,
      note: note ?? null,
    })
    .select()
    .single();

  if (progError) return { data: null, error: progError.message };

  // Update metric_current on goal
  const { error: updateError } = await supabase
    .from('goals')
    .update({ metric_current: metricValue })
    .eq('id', goalId);

  if (updateError) return { data: null, error: updateError.message };

  return { data: progress, error: null };
}
