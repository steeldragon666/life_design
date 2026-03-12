import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type UpsertSubscriptionPayload = {
  user_id?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string | null;
  stripe_price_id?: string | null;
  plan_type?: 'monthly' | 'annual' | 'lifetime';
  status?: string;
  trial_start?: string | null;
  trial_end?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  lifetime_access?: boolean;
};

function toIso(seconds?: number | null): string | null {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

function getCurrentPeriodEnd(subscription: Stripe.Subscription): number | null {
  const maybeCurrentPeriodEnd = (subscription as Stripe.Subscription & { current_period_end?: number })
    .current_period_end;
  return typeof maybeCurrentPeriodEnd === 'number' ? maybeCurrentPeriodEnd : null;
}

function getCurrentPeriodStart(subscription: Stripe.Subscription): number | null {
  const maybeCurrentPeriodStart = (subscription as Stripe.Subscription & { current_period_start?: number })
    .current_period_start;
  return typeof maybeCurrentPeriodStart === 'number' ? maybeCurrentPeriodStart : null;
}

function getTrialStart(subscription: Stripe.Subscription): number | null {
  const maybeTrialStart = (subscription as Stripe.Subscription & { trial_start?: number | null })
    .trial_start;
  return typeof maybeTrialStart === 'number' ? maybeTrialStart : null;
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const maybeSubscription = (invoice as Stripe.Invoice & { subscription?: string | null })
    .subscription;
  return typeof maybeSubscription === 'string' ? maybeSubscription : null;
}

function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey);
}

function getServiceRoleSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function upsertSubscription(payload: UpsertSubscriptionPayload) {
  const supabase = getServiceRoleSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase service role is not configured for Stripe webhook processing.');
  }

  const baseUpsert = {
    stripe_customer_id: payload.stripe_customer_id ?? null,
    stripe_subscription_id: payload.stripe_subscription_id ?? null,
    plan_type: payload.plan_type ?? 'monthly',
    stripe_price_id: payload.stripe_price_id ?? null,
    status: payload.status ?? 'none',
    trial_start: payload.trial_start ?? null,
    trial_end: payload.trial_end ?? null,
    current_period_start: payload.current_period_start ?? null,
    current_period_end: payload.current_period_end ?? null,
    cancel_at_period_end: payload.cancel_at_period_end ?? false,
    lifetime_access: payload.lifetime_access ?? false,
    updated_at: new Date().toISOString(),
  };

  if (payload.user_id) {
    const { error } = await supabase.from('subscriptions').upsert(
      {
        user_id: payload.user_id,
        ...baseUpsert,
      },
      { onConflict: 'user_id' }
    );
    if (error) throw error;
    return;
  }

  if (payload.stripe_customer_id) {
    const { error } = await supabase
      .from('subscriptions')
      .update(baseUpsert)
      .eq('stripe_customer_id', payload.stripe_customer_id);

    if (error) throw error;
  }
}

async function recordSubscriptionEvent(event: Stripe.Event, userId?: string) {
  const supabase = getServiceRoleSupabaseClient();
  if (!supabase) return;

  await supabase.from('subscription_events').upsert(
    {
      user_id: userId ?? null,
      event_type: event.type,
      stripe_event_id: event.id,
      metadata: event.data.object,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_event_id' },
  );
}

function inferPlanType(priceId: string | null | undefined): 'monthly' | 'annual' | 'lifetime' {
  if (!priceId) return 'monthly';
  if (priceId === process.env.STRIPE_PRICE_ANNUAL_ID) return 'annual';
  if (priceId === process.env.STRIPE_PRICE_LIFETIME_ID) return 'lifetime';
  return 'monthly';
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = getStripeClient();

  // Safe failure mode for local/dev: we do not process unsigned events.
  if (!webhookSecret || !stripe) {
    return NextResponse.json(
      {
        error: 'Stripe webhook is not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.',
      },
      { status: 503 }
    );
  }

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature header.' }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid Stripe signature.' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId ?? session.client_reference_id ?? undefined;
        const customerId = typeof session.customer === 'string' ? session.customer : undefined;
        const subscriptionId =
          typeof session.subscription === 'string' ? session.subscription : null;
        const priceId = session.metadata?.priceId ?? null;
        const isLifetime = session.metadata?.plan === 'lifetime';
        const planType = isLifetime ? 'lifetime' : inferPlanType(priceId);

        await upsertSubscription({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan_type: planType,
          stripe_price_id: priceId,
          status: subscriptionId ? 'active' : isLifetime ? 'active' : 'none',
          lifetime_access: Boolean(isLifetime && !subscriptionId),
        });
        await recordSubscriptionEvent(event, userId);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertSubscription({
          user_id: subscription.metadata?.userId,
          stripe_customer_id:
            typeof subscription.customer === 'string' ? subscription.customer : undefined,
          stripe_subscription_id: subscription.id,
          plan_type: inferPlanType(subscription.items.data[0]?.price?.id ?? null),
          stripe_price_id: subscription.items.data[0]?.price?.id ?? null,
          status: subscription.status,
          trial_start: toIso(getTrialStart(subscription)),
          trial_end: toIso(subscription.trial_end),
          current_period_start: toIso(getCurrentPeriodStart(subscription)),
          current_period_end: toIso(getCurrentPeriodEnd(subscription)),
          cancel_at_period_end: subscription.cancel_at_period_end,
        });
        await recordSubscriptionEvent(event, subscription.metadata?.userId);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertSubscription({
          user_id: subscription.metadata?.userId,
          stripe_customer_id:
            typeof subscription.customer === 'string' ? subscription.customer : undefined,
          stripe_subscription_id: subscription.id,
          plan_type: inferPlanType(subscription.items.data[0]?.price?.id ?? null),
          stripe_price_id: subscription.items.data[0]?.price?.id ?? null,
          status: 'canceled',
          trial_start: toIso(getTrialStart(subscription)),
          trial_end: toIso(subscription.trial_end),
          current_period_start: toIso(getCurrentPeriodStart(subscription)),
          current_period_end: toIso(getCurrentPeriodEnd(subscription)),
          cancel_at_period_end: subscription.cancel_at_period_end,
        });
        await recordSubscriptionEvent(event, subscription.metadata?.userId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await upsertSubscription({
          stripe_customer_id: typeof invoice.customer === 'string' ? invoice.customer : undefined,
          stripe_subscription_id: getInvoiceSubscriptionId(invoice),
          status: 'past_due',
        });
        await recordSubscriptionEvent(event);
        break;
      }

      default:
        break;
    }
  } catch (error) {
    console.error(`Failed to process Stripe webhook event ${event.type}:`, error);
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
