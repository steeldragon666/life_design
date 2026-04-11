import { createClient } from '@/lib/supabase/server';
import { getInsights } from '@/lib/services/insights-service';
import { OptInTier } from '@life-design/core';
import InsightsClient from './insights-client';

export default async function InsightsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">AI Insights</h1>
        <p className="mb-8 text-stone-600">
          Patterns and suggestions based on your check-in history.
        </p>
        <InsightsClient insights={[]} />
      </div>
    );
  }

  const [{ data: insights }, { data: profile }] = await Promise.all([
    getInsights(user.id),
    supabase
      .from('profiles')
      .select('opt_in_tier')
      .eq('id', user.id)
      .single(),
  ]);

  const userTier = (profile?.opt_in_tier as OptInTier) ?? OptInTier.Basic;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">AI Insights</h1>
      <p className="mb-8 text-stone-600">
        Patterns and suggestions based on your check-in history.
      </p>
      <InsightsClient insights={insights ?? []} userTier={userTier} />
    </div>
  );
}
