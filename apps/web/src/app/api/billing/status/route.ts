import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasBillingAccess } from '@/lib/stripe';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ authenticated: false, subscription: null, hasAccess: false });
    }

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('status, plan_type, trial_end, current_period_end, lifetime_access')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      authenticated: true,
      subscription,
      hasAccess: hasBillingAccess(subscription ?? null),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
