import { createClient } from '@/lib/supabase/server';

export async function getInsights(userId: string, limit: number = 20) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('insights')
    .select('*')
    .eq('user_id', userId)
    .eq('dismissed', false)
    .order('generated_at', { ascending: false })
    .limit(limit);
  return { data, error };
}

export interface SaveInsightInput {
  type: string;
  title: string;
  body: string;
  dimension: string | null;
}

export async function saveInsight(userId: string, input: SaveInsightInput) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('insights')
    .insert({
      user_id: userId,
      type: input.type,
      title: input.title,
      body: input.body,
      dimension: input.dimension,
    })
    .select()
    .single();
  return { data, error };
}

export async function dismissInsight(insightId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('insights')
    .update({ dismissed: true })
    .eq('id', insightId);
  return { data, error };
}
