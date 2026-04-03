import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { hasBillingAccess } from '@/lib/stripe';

export default async function PaywallPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-amber-400/30 bg-amber-500/10 p-8 text-center">
        <h1 className="text-2xl font-semibold text-white">Temporary auth issue</h1>
        <p className="mt-3 text-amber-100/90">
          We could not verify your account right now. Please refresh and try again in a moment.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
        >
          Re-open login
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <h1 className="text-2xl font-semibold text-white">Sign in required</h1>
        <p className="mt-3 text-stone-400">
          You need to sign in before we can validate your subscription status.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
        >
          Go to login
        </Link>
      </div>
    );
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('status, trial_end, current_period_end, lifetime_access')
    .eq('user_id', user.id)
    .maybeSingle();

  if (subscriptionError) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-amber-400/30 bg-amber-500/10 p-8 text-center">
        <h1 className="text-2xl font-semibold text-white">Billing data unavailable</h1>
        <p className="mt-3 text-amber-100/90">
          We could not load your subscription status. Please try again shortly.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  const hasAccess = hasBillingAccess(subscription ?? null);

  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-white/10 bg-white/5 p-8">
      <h1 className="text-3xl font-semibold text-white">Subscription required</h1>
      <p className="text-stone-300">
        Your free trial or subscription appears inactive for protected features. Update your plan
        to continue full access.
      </p>

      <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-stone-300">
        <p>
          Current status:{' '}
          <span className="font-medium text-white">{subscription?.status ?? 'none'}</span>
        </p>
        <p>
          Trial ends:{' '}
          <span className="font-medium text-white">{subscription?.trial_end ?? 'n/a'}</span>
        </p>
        <p>
          Current period end:{' '}
          <span className="font-medium text-white">
            {subscription?.current_period_end ?? 'n/a'}
          </span>
        </p>
        <p>
          Lifetime access:{' '}
          <span className="font-medium text-white">
            {subscription?.lifetime_access ? 'yes' : 'no'}
          </span>
        </p>
        {hasAccess && (
          <p className="mt-3 text-emerald-300">
            Access now appears valid. You can return to your dashboard.
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <form action="/api/billing/checkout" method="POST">
          <input type="hidden" name="plan" value="annual" />
          <button
            type="submit"
            className="inline-flex rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-4 py-2 text-sm text-emerald-100 hover:bg-emerald-500/30"
          >
            Start annual plan
          </button>
        </form>
        <form action="/api/billing/portal" method="POST">
          <button
            type="submit"
            className="inline-flex rounded-lg border border-accent-500/40 bg-accent-400/20 px-4 py-2 text-sm text-accent-100 hover:bg-accent-500/30"
          >
            Manage billing
          </button>
        </form>
        <Link
          href="/pricing"
          className="inline-flex rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-500/30"
        >
          View plans
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
