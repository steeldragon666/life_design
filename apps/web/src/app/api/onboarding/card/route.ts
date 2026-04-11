import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_PROVIDERS = [
  'strava', 'spotify', 'google_calendar', 'slack',
  'notion', 'apple_health', 'banking',
  'google_fit', 'samsung_health', 'screen_time',
];

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  // Validate current_card: integer 1-9
  if (body.current_card != null) {
    const card = Number(body.current_card);
    if (!Number.isInteger(card) || card < 1 || card > 9) {
      return NextResponse.json({ error: 'current_card must be an integer between 1 and 9' }, { status: 400 });
    }
    updates.current_card = card;
  }

  // Validate booleans
  if (body.first_checkin_completed != null) {
    if (typeof body.first_checkin_completed !== 'boolean') {
      return NextResponse.json({ error: 'first_checkin_completed must be a boolean' }, { status: 400 });
    }
    updates.first_checkin_completed = body.first_checkin_completed;
  }
  if (body.first_streak_created != null) {
    if (typeof body.first_streak_created !== 'boolean') {
      return NextResponse.json({ error: 'first_streak_created must be a boolean' }, { status: 400 });
    }
    updates.first_streak_created = body.first_streak_created;
  }
  if (body.first_goal_created != null) {
    if (typeof body.first_goal_created !== 'boolean') {
      return NextResponse.json({ error: 'first_goal_created must be a boolean' }, { status: 400 });
    }
    updates.first_goal_created = body.first_goal_created;
  }

  // Validate apps_connected: string array of known providers
  if (body.apps_connected != null) {
    if (!Array.isArray(body.apps_connected) || !body.apps_connected.every((p: unknown) => typeof p === 'string' && VALID_PROVIDERS.includes(p as string))) {
      return NextResponse.json({ error: 'apps_connected must be an array of valid provider names' }, { status: 400 });
    }
    updates.apps_connected = body.apps_connected;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // Enforce monotonic progression: card can only move forward, booleans can only go true
  if (updates.current_card || updates.first_checkin_completed === false || updates.first_streak_created === false || updates.first_goal_created === false) {
    const { data: existing } = await supabase
      .from('onboarding_sessions')
      .select('current_card, first_checkin_completed, first_streak_created, first_goal_created')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      if (updates.current_card && (updates.current_card as number) <= (existing.current_card ?? 0)) {
        return NextResponse.json({ error: 'current_card can only advance forward' }, { status: 400 });
      }
      if (updates.first_checkin_completed === false && existing.first_checkin_completed) {
        delete updates.first_checkin_completed;
      }
      if (updates.first_streak_created === false && existing.first_streak_created) {
        delete updates.first_streak_created;
      }
      if (updates.first_goal_created === false && existing.first_goal_created) {
        delete updates.first_goal_created;
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from('onboarding_sessions')
    .update(updates)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
