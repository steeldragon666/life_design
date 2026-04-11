import { describe, it, expect } from 'vitest';
import { OptInTier, TIER_BENEFITS, isFeatureAvailable } from '../opt-in-tiers';

// ---------------------------------------------------------------------------
// TIER_BENEFITS catalogue
// ---------------------------------------------------------------------------

describe('TIER_BENEFITS', () => {
  it('has exactly 3 entries (one per tier)', () => {
    expect(TIER_BENEFITS).toHaveLength(3);
  });

  it('covers all OptInTier values', () => {
    const tiers = TIER_BENEFITS.map((b) => b.tier);
    expect(tiers).toContain(OptInTier.Basic);
    expect(tiers).toContain(OptInTier.Enhanced);
    expect(tiers).toContain(OptInTier.Full);
  });

  it.each([OptInTier.Basic, OptInTier.Enhanced, OptInTier.Full])(
    '%s tier has non-empty shares array',
    (tier) => {
      const benefit = TIER_BENEFITS.find((b) => b.tier === tier);
      expect(benefit).toBeDefined();
      expect(benefit!.shares.length).toBeGreaterThan(0);
    },
  );

  it.each([OptInTier.Basic, OptInTier.Enhanced, OptInTier.Full])(
    '%s tier has non-empty gets array',
    (tier) => {
      const benefit = TIER_BENEFITS.find((b) => b.tier === tier);
      expect(benefit).toBeDefined();
      expect(benefit!.gets.length).toBeGreaterThan(0);
    },
  );
});

// ---------------------------------------------------------------------------
// isFeatureAvailable
// ---------------------------------------------------------------------------

describe('isFeatureAvailable', () => {
  it('returns true when user tier equals required tier', () => {
    expect(isFeatureAvailable(OptInTier.Basic, OptInTier.Basic)).toBe(true);
    expect(isFeatureAvailable(OptInTier.Enhanced, OptInTier.Enhanced)).toBe(true);
    expect(isFeatureAvailable(OptInTier.Full, OptInTier.Full)).toBe(true);
  });

  it('returns true when user tier is higher than required tier', () => {
    expect(isFeatureAvailable(OptInTier.Enhanced, OptInTier.Basic)).toBe(true);
    expect(isFeatureAvailable(OptInTier.Full, OptInTier.Basic)).toBe(true);
    expect(isFeatureAvailable(OptInTier.Full, OptInTier.Enhanced)).toBe(true);
  });

  it('returns false when user tier is lower than required tier', () => {
    expect(isFeatureAvailable(OptInTier.Basic, OptInTier.Enhanced)).toBe(false);
    expect(isFeatureAvailable(OptInTier.Basic, OptInTier.Full)).toBe(false);
    expect(isFeatureAvailable(OptInTier.Enhanced, OptInTier.Full)).toBe(false);
  });

  it('Basic tier is available to all tiers', () => {
    expect(isFeatureAvailable(OptInTier.Basic, OptInTier.Basic)).toBe(true);
    expect(isFeatureAvailable(OptInTier.Enhanced, OptInTier.Basic)).toBe(true);
    expect(isFeatureAvailable(OptInTier.Full, OptInTier.Basic)).toBe(true);
  });

  it('Full tier is only available to Full tier users', () => {
    expect(isFeatureAvailable(OptInTier.Basic, OptInTier.Full)).toBe(false);
    expect(isFeatureAvailable(OptInTier.Enhanced, OptInTier.Full)).toBe(false);
    expect(isFeatureAvailable(OptInTier.Full, OptInTier.Full)).toBe(true);
  });
});
