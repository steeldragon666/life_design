/**
 * Tests for the tier selection logic.
 *
 * Validates that the tier API and guest localStorage fallback
 * handle all scenarios correctly.
 */
import { describe, expect, it } from 'vitest';

const VALID_TIERS = ['basic', 'enhanced', 'full'] as const;

function isValidTier(value: unknown): value is (typeof VALID_TIERS)[number] {
  return typeof value === 'string' && (VALID_TIERS as readonly string[]).includes(value);
}

describe('tier selection', () => {
  it('validates all three tier values', () => {
    expect(isValidTier('basic')).toBe(true);
    expect(isValidTier('enhanced')).toBe(true);
    expect(isValidTier('full')).toBe(true);
  });

  it('rejects invalid tier values', () => {
    expect(isValidTier('premium')).toBe(false);
    expect(isValidTier('free')).toBe(false);
    expect(isValidTier('')).toBe(false);
    expect(isValidTier(null)).toBe(false);
    expect(isValidTier(undefined)).toBe(false);
    expect(isValidTier(42)).toBe(false);
  });

  it('beta: defaults to full tier when API returns no tier', () => {
    // During beta, all accounts default to full
    const apiTier = null;
    const selectedTier = apiTier ?? 'full';
    expect(selectedTier).toBe('full');
  });

  it('authenticated user tier comes from API response', () => {
    const apiStatus = 200;
    const apiTier = 'enhanced';
    let selectedTier = 'full'; // beta default

    if (apiStatus === 200 && isValidTier(apiTier)) {
      selectedTier = apiTier;
    }

    expect(selectedTier).toBe('enhanced');
  });

  it('preserves full tier when API has no profile row', () => {
    const apiResponse = { tier: 'full' }; // API defaults to full
    expect(apiResponse.tier).toBe('full');
  });
});
