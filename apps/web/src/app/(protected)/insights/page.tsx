import { createClient } from '@/lib/supabase/server';
import { getInsights } from '@/lib/services/insights-service';
import InsightsClient from './insights-client';

export default async function InsightsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: insights } = await getInsights(user!.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">AI Insights</h1>
      <p className="mb-8 text-gray-600">
        Patterns and suggestions based on your check-in history.
      </p>
      <InsightsClient insights={insights ?? []} />
    </div>
  );
}
