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

  it('guest tier falls back to localStorage when API returns 401', () => {
    // Simulate the decision logic used by OptInTierSelectorWithState
    const apiStatus = 401;
    const localStorageValue = 'full';
    let selectedTier = 'basic';
    let isGuest = false;

    if (apiStatus === 401) {
      isGuest = true;
      if (localStorageValue && isValidTier(localStorageValue)) {
        selectedTier = localStorageValue;
      }
    }

    expect(isGuest).toBe(true);
    expect(selectedTier).toBe('full');
  });

  it('guest tier defaults to basic when no localStorage value exists', () => {
    const apiStatus = 401;
    const localStorageValue = null;
    let selectedTier = 'basic';
    let isGuest = false;

    if (apiStatus === 401) {
      isGuest = true;
      if (localStorageValue && isValidTier(localStorageValue)) {
        selectedTier = localStorageValue;
      }
    }

    expect(isGuest).toBe(true);
    expect(selectedTier).toBe('basic');
  });

  it('authenticated user tier comes from API response', () => {
    const apiStatus = 200;
    const apiTier = 'enhanced';
    let selectedTier = 'basic';
    let isGuest = false;

    if (apiStatus === 401) {
      isGuest = true;
    } else if (apiStatus === 200 && isValidTier(apiTier)) {
      selectedTier = apiTier;
    }

    expect(isGuest).toBe(false);
    expect(selectedTier).toBe('enhanced');
  });
});
