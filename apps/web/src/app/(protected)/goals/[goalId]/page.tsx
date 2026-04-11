import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { getGoalById } from '@/lib/services/goal-service';
import { ALL_DIMENSIONS, computeDimensionAverage } from '@life-design/core';
import GoalDetailClient from './goal-detail-client';

interface GoalDetailPageProps {
  params: Promise<{ goalId: string }>;
}

export default async function GoalDetailPage({ params }: GoalDetailPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { goalId } = await params;
  const goalResult = await getGoalById(goalId);

  if (goalResult.error || !goalResult.data) notFound();

  // Fetch current dimension scores for trade-off dashboard
  const { data: recentCheckins } = await supabase
    .from('checkins')
    .select('dimension_scores(dimension, score)')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(14);

  const currentScores: Record<string, number> = {};
  for (const dim of ALL_DIMENSIONS) {
    const scores = (recentCheckins ?? [])
      .flatMap((c: Record<string, unknown>) =>
        (c.dimension_scores as Array<{ dimension: string; score: number }>)
          .filter((s) => s.dimension === dim)
          .map((s) => s.score)
      );
    currentScores[dim] = scores.length > 0 ? computeDimensionAverage(scores) : 5;
  }

  return (
    <GoalDetailClient
      goal={goalResult.data}
      pathways={[]}
      currentScores={currentScores}
    />
  );
}
