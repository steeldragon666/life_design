import { describe, expect, it } from 'vitest';
import {
  isAssetOrInternalPath,
  isGuestProtectedPath,
  isPublicGuestPath,
} from '@/lib/route-guard';

describe('route-guard', () => {
  it('keeps auth and onboarding routes public', () => {
    expect(isPublicGuestPath('/login')).toBe(true);
    expect(isPublicGuestPath('/signup')).toBe(true);
    expect(isPublicGuestPath('/onboarding')).toBe(true);
  });

  it('marks primary experience routes as protected', () => {
    expect(isGuestProtectedPath('/dashboard')).toBe(true);
    expect(isGuestProtectedPath('/goals/new')).toBe(true);
    expect(isGuestProtectedPath('/settings')).toBe(true);
    expect(isGuestProtectedPath('/meditations')).toBe(true);
    expect(isGuestProtectedPath('/future-self')).toBe(true);
    expect(isGuestProtectedPath('/rituals/morning')).toBe(true);
  });

  it('does not apply guest route gate to static/internal paths', () => {
    expect(isAssetOrInternalPath('/_next/static/chunks/app.js')).toBe(true);
    expect(isAssetOrInternalPath('/favicon.ico')).toBe(true);
    expect(isAssetOrInternalPath('/api/chat')).toBe(true);
    expect(isAssetOrInternalPath('/images/hero.png')).toBe(true);
  });
});
