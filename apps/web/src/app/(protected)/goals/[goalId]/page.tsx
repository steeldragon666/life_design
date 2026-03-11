import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { getGoalById } from '@/lib/services/goal-service';
import { getPathways } from '@/lib/services/pathway-service';
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
  const [goalResult, pathwaysResult] = await Promise.all([
    getGoalById(goalId),
    getPathways(goalId),
  ]);

  if (goalResult.error || !goalResult.data) notFound();

  return (
    <GoalDetailClient
      goal={goalResult.data}
      pathways={pathwaysResult.data ?? []}
    />
  );
}
