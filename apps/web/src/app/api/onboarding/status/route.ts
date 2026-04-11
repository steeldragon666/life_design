import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Query core columns first, then try new card-tracking columns.
  // This ensures the route works even if migration 00024 hasn't been applied yet.
  const { data: session } = await supabase
    .from('onboarding_sessions')
    .select('id, status, current_section, current_step, raw_answers')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ status: 'not_started' });
  }

  // Try to read card-tracking columns (added in migration 00024).
  // If they don't exist yet, gracefully default.
  let cardTracking = {
    current_card: 1,
    first_checkin_completed: false,
    first_streak_created: false,
    first_goal_created: false,
    apps_connected: [] as string[],
  };

  try {
    const { data: cardData } = await supabase
      .from('onboarding_sessions')
      .select('current_card, first_checkin_completed, first_streak_created, first_goal_created, apps_connected')
      .eq('user_id', user.id)
      .maybeSingle();

    if (cardData) {
      cardTracking = {
        current_card: cardData.current_card ?? 1,
        first_checkin_completed: cardData.first_checkin_completed ?? false,
        first_streak_created: cardData.first_streak_created ?? false,
        first_goal_created: cardData.first_goal_created ?? false,
        apps_connected: cardData.apps_connected ?? [],
      };
    }
  } catch {
    // Migration not applied yet — use defaults
  }

  const rawAnswers = session.raw_answers ?? {};

  // Data minimization: only include raw_answers when session is in progress
  // (needed to resume the wizard). Completed sessions only need the count.
  return NextResponse.json({
    status: session.status,
    session_id: session.id,
    current_section: session.current_section,
    current_step: session.current_step,
    current_card: cardTracking.current_card,
    ...(session.status === 'in_progress' ? { raw_answers: rawAnswers } : {}),
    answered_count: Object.keys(rawAnswers).length,
    first_checkin_completed: cardTracking.first_checkin_completed,
    first_streak_created: cardTracking.first_streak_created,
    first_goal_created: cardTracking.first_goal_created,
    apps_connected: cardTracking.apps_connected,
  });
}
