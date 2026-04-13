/**
 * Tests for the middleware redirect logic.
 *
 * These test the pure route-guard functions and the cookie-based
 * decision logic that the middleware uses. We don't test the actual
 * Next.js middleware (which needs the Edge runtime), but we test the
 * decision functions it relies on.
 */
import { describe, expect, it } from 'vitest';
import {
  isAssetOrInternalPath,
  isGuestProtectedPath,
  isPublicGuestPath,
} from '@/lib/route-guard';

// Simulates the middleware's guest-redirect decision
function shouldRedirectGuestToLogin(
  pathname: string,
  cookies: Record<string, string>,
  hasAuthUser: boolean,
): boolean {
  if (isAssetOrInternalPath(pathname)) return false;

  const isGuestProtected =
    !isPublicGuestPath(pathname) && isGuestProtectedPath(pathname);

  if (!isGuestProtected) return false;
  if (hasAuthUser) return false;

  // Guest without auth: check onboarded cookie
  return cookies['opt-in-guest-onboarded'] !== '1';
}

describe('middleware redirect decisions', () => {
  // ── Guest completing onboarding ──────────────────────────────────────

  it('allows guest with onboarded cookie to access /dashboard', () => {
    expect(
      shouldRedirectGuestToLogin('/dashboard', { 'opt-in-guest-onboarded': '1' }, false),
    ).toBe(false);
  });

  it('redirects guest WITHOUT onboarded cookie from /dashboard to /login', () => {
    expect(shouldRedirectGuestToLogin('/dashboard', {}, false)).toBe(true);
  });

  it('allows guest to access /onboarding without any cookies', () => {
    expect(shouldRedirectGuestToLogin('/onboarding', {}, false)).toBe(false);
  });

  it('allows guest to access /login without any cookies', () => {
    expect(shouldRedirectGuestToLogin('/login', {}, false)).toBe(false);
  });

  // ── Authenticated user ───────────────────────────────────────────────

  it('allows authenticated user to access /dashboard regardless of cookies', () => {
    expect(shouldRedirectGuestToLogin('/dashboard', {}, true)).toBe(false);
  });

  it('allows authenticated user to access /timeline', () => {
    expect(shouldRedirectGuestToLogin('/timeline', {}, true)).toBe(false);
  });

  // ── Post-onboarding transition (the critical flow) ───────────────────

  it('simulates guest completing onboarding → dashboard transition', () => {
    // Step 1: Guest navigates to /onboarding (no cookies needed)
    expect(shouldRedirectGuestToLogin('/onboarding', {}, false)).toBe(false);

    // Step 2: Guest completes onboarding, cookie is set
    const cookiesAfterOnboarding = { 'opt-in-guest-onboarded': '1' };

    // Step 3: Guest navigates to /dashboard — should be allowed
    expect(
      shouldRedirectGuestToLogin('/dashboard', cookiesAfterOnboarding, false),
    ).toBe(false);

    // Step 4: Guest navigates to other protected routes — should work
    expect(
      shouldRedirectGuestToLogin('/goals', cookiesAfterOnboarding, false),
    ).toBe(false);
    expect(
      shouldRedirectGuestToLogin('/timeline', cookiesAfterOnboarding, false),
    ).toBe(false);
    expect(
      shouldRedirectGuestToLogin('/checkin', cookiesAfterOnboarding, false),
    ).toBe(false);
  });

  // ── Cookie set to '0' (overwritten by GuestProvider race) ────────────

  it('redirects when cookie is "0" (the race condition bug)', () => {
    // This simulates the GuestProvider cookie-sync effect overwriting
    // the cookie to '0' before the profile is hydrated from localStorage
    expect(
      shouldRedirectGuestToLogin(
        '/dashboard',
        { 'opt-in-guest-onboarded': '0' },
        false,
      ),
    ).toBe(true);
  });

  // ── Edge cases ───────────────────────────────────────────────────────

  it('does not redirect for API paths', () => {
    expect(shouldRedirectGuestToLogin('/api/chat', {}, false)).toBe(false);
  });

  it('does not redirect for static assets', () => {
    expect(shouldRedirectGuestToLogin('/_next/static/main.js', {}, false)).toBe(false);
  });

  it('does not redirect for root path', () => {
    expect(shouldRedirectGuestToLogin('/', {}, false)).toBe(false);
  });
});
