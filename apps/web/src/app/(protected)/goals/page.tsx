import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getGoals } from '@/lib/services/goal-service';
import GoalsClient from './goals-client';

export default async function GoalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: goals } = await getGoals(user.id);

  return <GoalsClient goals={goals ?? []} />;
}
