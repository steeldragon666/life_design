import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey);
}

export async function POST(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.redirect(new URL('/paywall?billing=stripe_not_configured', origin), 303);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login?next=/paywall', origin), 303);
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const customerId = subscription?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.redirect(new URL('/paywall?billing=no_customer', origin), 303);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/settings`,
  });

  return NextResponse.redirect(session.url, 303);
}
