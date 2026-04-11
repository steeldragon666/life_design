export const STRIPE_PRODUCTS = {
  monthly: process.env.STRIPE_PRICE_MONTHLY_ID ?? '',
  annual: process.env.STRIPE_PRICE_ANNUAL_ID ?? '',
  lifetime: process.env.STRIPE_PRICE_LIFETIME_ID ?? '',
} as const;

export type StripePlanType = keyof typeof STRIPE_PRODUCTS;

export type BillingStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'canceled'
  | 'paused'
  | 'none';

export interface SubscriptionAccessSnapshot {
  status: BillingStatus | string | null;
  trial_end?: string | null;
  current_period_end?: string | null;
  lifetime_access?: boolean | null;
}

export function isStripeConfiguredForCheckout(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
      STRIPE_PRODUCTS.monthly &&
      STRIPE_PRODUCTS.annual
  );
}

export function isStripeConfiguredForServerCheckout(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && STRIPE_PRODUCTS.monthly && STRIPE_PRODUCTS.annual);
}

export function getAvailablePriceEntries() {
  return [
    { key: 'monthly', priceId: STRIPE_PRODUCTS.monthly },
    { key: 'annual', priceId: STRIPE_PRODUCTS.annual },
    { key: 'lifetime', priceId: STRIPE_PRODUCTS.lifetime },
  ] as const;
}

export function getPriceIdForPlan(plan: StripePlanType): string | null {
  const priceId = STRIPE_PRODUCTS[plan];
  return priceId && priceId.length > 0 ? priceId : null;
}

function isFutureDate(isoDate?: string | null): boolean {
  if (!isoDate) return false;
  const value = Date.parse(isoDate);
  if (Number.isNaN(value)) return false;
  return value > Date.now();
}

export function hasBillingAccess(subscription: SubscriptionAccessSnapshot | null): boolean {
  if (!subscription) return false;

  if (subscription.lifetime_access) {
    return true;
  }

  const status = (subscription.status ?? 'none').toLowerCase();
  if (status === 'active' || status === 'trialing') {
    return true;
  }

  // Trial-friendly behavior: if a trial date exists in the future, continue access.
  if (isFutureDate(subscription.trial_end)) {
    return true;
  }

  // Grace behavior for short billing desync windows.
  if (status === 'past_due' && isFutureDate(subscription.current_period_end)) {
    return true;
  }

  return false;
}

export function requiresBillingGate(pathname: string): boolean {
  const protectedRoutes = [
    '/dashboard',
    '/goals',
    '/meditations',
    '/rituals',
    '/checkin',
    '/insights',
    '/profile',
    '/settings',
    '/mentors',
  ];

  return protectedRoutes.some((route) => pathname.startsWith(route));
}
