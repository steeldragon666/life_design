import { describe, expect, it } from 'vitest';
import {
  isAssetOrInternalPath,
  isGuestProtectedPath,
  isPublicGuestPath,
} from '@/lib/route-guard';

describe('route-guard', () => {
  // ── Public guest routes ──────────────────────────────────────────────
  it('keeps auth and onboarding routes public', () => {
    expect(isPublicGuestPath('/login')).toBe(true);
    expect(isPublicGuestPath('/signup')).toBe(true);
    expect(isPublicGuestPath('/onboarding')).toBe(true);
    expect(isPublicGuestPath('/paywall')).toBe(true);
    expect(isPublicGuestPath('/pricing')).toBe(true);
  });

  it('treats sub-paths of public routes as public', () => {
    expect(isPublicGuestPath('/onboarding/step-2')).toBe(true);
    expect(isPublicGuestPath('/login/callback')).toBe(true);
  });

  // ── Protected guest routes ───────────────────────────────────────────
  it('marks primary experience routes as protected', () => {
    expect(isGuestProtectedPath('/dashboard')).toBe(true);
    expect(isGuestProtectedPath('/goals/new')).toBe(true);
    expect(isGuestProtectedPath('/settings')).toBe(true);
    expect(isGuestProtectedPath('/meditations')).toBe(true);
    expect(isGuestProtectedPath('/rituals/morning')).toBe(true);
  });

  it('marks new Variant C routes as protected', () => {
    expect(isGuestProtectedPath('/timeline')).toBe(true);
    expect(isGuestProtectedPath('/timeline/week/1')).toBe(true);
    expect(isGuestProtectedPath('/correlations')).toBe(true);
    expect(isGuestProtectedPath('/dimensions')).toBe(true);
    expect(isGuestProtectedPath('/dimensions/career')).toBe(true);
  });

  // ── Static / internal paths ──────────────────────────────────────────
  it('does not apply guest route gate to static/internal paths', () => {
    expect(isAssetOrInternalPath('/_next/static/chunks/app.js')).toBe(true);
    expect(isAssetOrInternalPath('/favicon.ico')).toBe(true);
    expect(isAssetOrInternalPath('/api/chat')).toBe(true);
    expect(isAssetOrInternalPath('/images/hero.png')).toBe(true);
  });

  // ── Critical: onboarding is NOT protected ────────────────────────────
  it('does NOT treat /onboarding as guest-protected (it is public)', () => {
    // This is the key test: a guest must be able to reach /onboarding
    // without the onboarded cookie. If this fails, guests can never onboard.
    expect(isGuestProtectedPath('/onboarding')).toBe(false);
  });

  // ── Middleware decision: isGuestProtected combines both checks ───────
  it('computes isGuestProtected correctly for critical paths', () => {
    // The middleware uses: !isPublicGuestPath(p) && isGuestProtectedPath(p)
    const isGuestProtected = (p: string) =>
      !isPublicGuestPath(p) && isGuestProtectedPath(p);

    expect(isGuestProtected('/dashboard')).toBe(true);     // protected
    expect(isGuestProtected('/onboarding')).toBe(false);   // public
    expect(isGuestProtected('/login')).toBe(false);        // public
    expect(isGuestProtected('/timeline')).toBe(true);      // protected
    expect(isGuestProtected('/')).toBe(false);             // neither
  });
});
