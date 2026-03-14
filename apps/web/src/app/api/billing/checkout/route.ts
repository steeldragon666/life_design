import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getPriceIdForPlan,
  isStripeConfiguredForServerCheckout,
  type StripePlanType,
} from '@/lib/stripe';

function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey);
}

function normalizePlan(raw: unknown): StripePlanType | null {
  if (raw === 'monthly' || raw === 'annual' || raw === 'lifetime') return raw;
  return null;
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

async function parseRequestedPlan(request: NextRequest): Promise<StripePlanType | null> {
  try {
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const body = (await request.json()) as { plan?: unknown };
      return normalizePlan(body.plan);
    }
    const formData = await request.formData();
    return normalizePlan(formData.get('plan'));
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const origin = getTrustedAppOrigin();
  if (!origin) {
    return NextResponse.json(
      { error: 'Billing is temporarily unavailable. Missing or invalid app origin.' },
      { status: 500 },
    );
  }

  const stripe = getStripeClient();
  if (!stripe || !isStripeConfiguredForServerCheckout()) {
    return NextResponse.redirect(new URL('/pricing?billing=stripe_not_configured', origin), 303);
  }

  const plan = await parseRequestedPlan(request);
  if (!plan) {
    return NextResponse.redirect(new URL('/pricing?billing=invalid_plan', origin), 303);
  }

  const priceId = getPriceIdForPlan(plan);
  if (!priceId) {
    return NextResponse.redirect(new URL('/pricing?billing=plan_unavailable', origin), 303);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return NextResponse.redirect(new URL('/pricing?billing=auth_error', origin), 303);
  }

  if (!user) {
    return NextResponse.redirect(new URL('/login?next=/pricing', origin), 303);
  }

  const { data: existingSubscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (subscriptionError) {
    return NextResponse.redirect(new URL('/pricing?billing=subscription_lookup_failed', origin), 303);
  }

  let stripeCustomerId = existingSubscription?.stripe_customer_id ?? null;
  if (!stripeCustomerId) {
    try {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { userId: user.id },
      });
      stripeCustomerId = customer.id;
    } catch {
      return NextResponse.redirect(new URL('/pricing?billing=customer_create_failed', origin), 303);
    }
  }

  const { error: upsertError } = await supabase.from('subscriptions').upsert(
    {
      user_id: user.id,
      stripe_customer_id: stripeCustomerId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (upsertError) {
    return NextResponse.redirect(new URL('/pricing?billing=subscription_update_failed', origin), 303);
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: plan === 'lifetime' ? 'payment' : 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?billing=success`,
      cancel_url: `${origin}/pricing?billing=cancelled`,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        plan,
        priceId,
      },
      ...(plan === 'lifetime'
        ? {}
        : {
            subscription_data: {
              trial_period_days: 7,
              metadata: { userId: user.id },
            },
          }),
      allow_promotion_codes: true,
    });
  } catch {
    return NextResponse.redirect(new URL('/pricing?billing=checkout_failed', origin), 303);
  }

  if (!session.url) {
    return NextResponse.redirect(new URL('/pricing?billing=checkout_failed', origin), 303);
  }

  return NextResponse.redirect(session.url, 303);
}
