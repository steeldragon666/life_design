import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey);
}

function getTrustedAppOrigin(): string | null {
  const configuredUrl =
    process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (!configuredUrl) return null;

  try {
    return new URL(configuredUrl).origin;
  } catch {
    return null;
  }
}

export async function POST() {
  const origin = getTrustedAppOrigin();
  if (!origin) {
    return NextResponse.json(
      { error: 'Billing is temporarily unavailable. Missing or invalid app origin.' },
      { status: 500 },
    );
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.redirect(new URL('/paywall?billing=stripe_not_configured', origin), 303);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return NextResponse.redirect(new URL('/paywall?billing=auth_error', origin), 303);
  }

  if (!user) {
    return NextResponse.redirect(new URL('/login?next=/paywall', origin), 303);
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (subscriptionError) {
    return NextResponse.redirect(new URL('/paywall?billing=subscription_lookup_failed', origin), 303);
  }

  const customerId = subscription?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.redirect(new URL('/paywall?billing=no_customer', origin), 303);
  }

  let session: Stripe.BillingPortal.Session;
  try {
    session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/settings`,
    });
  } catch {
    return NextResponse.redirect(new URL('/paywall?billing=portal_failed', origin), 303);
  }

  return NextResponse.redirect(session.url, 303);
}
