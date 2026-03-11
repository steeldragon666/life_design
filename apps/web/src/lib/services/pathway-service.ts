import { createClient } from '@/lib/supabase/server';

export interface CreatePathwayInput {
  goalId: string;
  title: string;
  description?: string;
  aiGenerated: boolean;
  dimensionImpacts: Array<{ dimension: string; impact: number; explanation: string }>;
  steps: Array<{ title: string; description: string }>;
}

export async function createPathway(input: CreatePathwayInput) {
  const supabase = await createClient();

  const { data: pathway, error: pathwayError } = await supabase
    .from('pathways')
    .insert({
      goal_id: input.goalId,
      title: input.title,
      description: input.description ?? null,
      ai_generated: input.aiGenerated,
      dimension_impacts: input.dimensionImpacts,
    })
    .select()
    .single();

  if (pathwayError) return { data: null, error: pathwayError.message };

  if (input.steps.length > 0) {
    const stepRows = input.steps.map((s, i) => ({
      pathway_id: pathway.id,
      title: s.title,
      description: s.description,
      position: i,
    }));
    const { error: stepsError } = await supabase
      .from('pathway_steps')
      .insert(stepRows);
    if (stepsError) return { data: null, error: stepsError.message };
  }

  return { data: pathway, error: null };
}

export async function getPathways(goalId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('pathways')
    .select(`
      *,
      pathway_steps(id, title, description, position, completed, completed_at)
    `)
    .eq('goal_id', goalId)
    .order('created_at', { ascending: false })
    .order('position', { referencedTable: 'pathway_steps', ascending: true });

  return { data, error: error ? error.message : null };
}

export async function deletePathway(pathwayId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('pathways')
    .delete()
    .eq('id', pathwayId);

  return { error: error ? error.message : null };
}

export async function toggleStep(stepId: string) {
  const supabase = await createClient();

  const { data: current } = await supabase
    .from('pathway_steps')
    .select('completed')
    .eq('id', stepId)
    .single();

  if (!current) return { data: null, error: 'Step not found' };

  const newCompleted = !current.completed;
  const { data, error } = await supabase
    .from('pathway_steps')
    .update({
      completed: newCompleted,
      completed_at: newCompleted ? new Date().toISOString() : null,
    })
    .eq('id', stepId)
    .select()
    .single();

  return { data, error: error ? error.message : null };
}
