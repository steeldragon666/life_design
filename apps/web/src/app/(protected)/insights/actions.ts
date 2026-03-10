'use server';

import { createClient } from '@/lib/supabase/server';
import { dismissInsight } from '@/lib/services/insights-service';

export async function dismissInsightAction(insightId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await dismissInsight(insightId);
  return { error: error ? error.message : null };
}
