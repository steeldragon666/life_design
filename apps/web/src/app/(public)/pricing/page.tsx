import Link from 'next/link';
import { getAvailablePriceEntries, isStripeConfiguredForCheckout } from '@/lib/stripe';

const PLAN_COPY = {
  monthly: {
    title: 'Monthly',
    description: 'Flexible month-to-month access.',
    price: '$9.99 / month',
  },
  annual: {
    title: 'Annual',
    description: 'Best value for long-term consistency.',
    price: '$99 / year',
  },
  lifetime: {
    title: 'Lifetime',
    description: 'One-time access without renewal.',
    price: '$249 one-time',
  },
} as const;

export default function PricingPage() {
  const products = getAvailablePriceEntries();
  const isConfigured = isStripeConfiguredForCheckout();

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16">
      <div className="mb-10 space-y-3 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-white">Pricing</h1>
        <p className="text-stone-400">
          Choose a plan that supports your life design journey with guided rituals and AI mentorship.
        </p>
      </div>

      {!isConfigured && (
        <div className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
          Checkout is temporarily unavailable. Please try again later or continue exploring the app.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {products.map((product) => {
          const plan = PLAN_COPY[product.key];
          const isAvailable = Boolean(product.priceId);

          return (
            <article
              key={product.key}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
            >
              <h2 className="text-xl font-medium text-white">{plan.title}</h2>
              <p className="mt-2 text-sm text-stone-400">{plan.description}</p>
              <p className="mt-4 text-2xl font-semibold text-white">{plan.price}</p>
              {!isAvailable && (
                <p className="mt-4 text-xs text-stone-500">Plan is temporarily unavailable.</p>
              )}
              <form action="/api/billing/checkout" method="POST" className="mt-4">
                <input type="hidden" name="plan" value={product.key} />
                <button
                  type="submit"
                  disabled={!isConfigured || !isAvailable}
                  className="w-full rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {product.key === 'annual' ? 'Start annual trial' : 'Start trial'}
                </button>
              </form>
            </article>
          );
        })}
      </div>

      <div className="mt-10 flex justify-center">
        <Link
          href="/login"
          className="rounded-xl border border-cyan-500/30 bg-cyan-500/20 px-5 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/30"
        >
          Start free trial
        </Link>
      </div>
    </main>
  );
}
