import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPriceIdForPlan, isStripeConfiguredForCheckout, type StripePlanType } from '@/lib/stripe';

function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey);
}

function normalizePlan(raw: unknown): StripePlanType | null {
  if (raw === 'monthly' || raw === 'annual' || raw === 'lifetime') return raw;
  return null;
}

async function parseRequestedPlan(request: NextRequest): Promise<StripePlanType | null> {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = (await request.json()) as { plan?: unknown };
    return normalizePlan(body.plan);
  }
  const formData = await request.formData();
  return normalizePlan(formData.get('plan'));
}

export async function POST(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const stripe = getStripeClient();
  if (!stripe || !isStripeConfiguredForCheckout()) {
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
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login?next=/pricing', origin), 303);
  }

  const { data: existingSubscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  let stripeCustomerId = existingSubscription?.stripe_customer_id ?? null;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { userId: user.id },
    });
    stripeCustomerId = customer.id;
  }

  await supabase.from('subscriptions').upsert(
    {
      user_id: user.id,
      stripe_customer_id: stripeCustomerId,
      stripe_price_id: priceId,
      plan_type: plan,
      status: 'none',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  const session = await stripe.checkout.sessions.create({
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

  if (!session.url) {
    return NextResponse.redirect(new URL('/pricing?billing=checkout_failed', origin), 303);
  }

  return NextResponse.redirect(session.url, 303);
}
