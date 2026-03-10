import { createClient } from '@/lib/supabase/server';

export async function getLatestScores(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('checkins')
    .select('dimension_scores(dimension, score)')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code === 'PGRST116') {
    return { data: [], error: null };
  }
  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data.dimension_scores, error: null };
}

export async function getScoreHistory(userId: string, days: number) {
  const supabase = await createClient();

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('checkins')
    .select('date, mood, dimension_scores(dimension, score)')
    .eq('user_id', userId)
    .gte('date', sinceStr)
    .order('date', { ascending: true });

  return { data: data ?? [], error: error ? error.message : null };
}

export async function getStreakData(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('checkins')
    .select('date')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(90);

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []).map((row: { date: string }) => row.date), error: null };
}
