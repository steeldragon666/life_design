import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/integrations/apple-health
 * Receives health metrics pushed from the Life Design iOS app.
 * Body: { date, sleepHours, steps, activeMinutes, heartRateAvg, heartRateVariability }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { date, sleepHours, steps, activeMinutes, heartRateAvg, heartRateVariability } = body;

    if (!date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('health_metrics')
      .upsert(
        {
          user_id: user.id,
          date,
          sleep_hours: sleepHours ?? null,
          steps: steps ?? null,
          active_minutes: activeMinutes ?? null,
          heart_rate_avg: heartRateAvg ?? null,
          heart_rate_variability: heartRateVariability ?? null,
        },
        { onConflict: 'user_id,date' },
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also ensure the apple_health integration is marked as connected
    await supabase
      .from('integrations')
      .upsert(
        {
          user_id: user.id,
          provider: 'apple_health',
          status: 'connected',
        },
        { onConflict: 'user_id,provider' },
      );

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Apple Health sync error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
