import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { getGoalById } from '@/lib/services/goal-service';
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
  const { data: goal, error } = await getGoalById(goalId);

  if (error || !goal) notFound();

  return <GoalDetailClient goal={goal} />;
}
