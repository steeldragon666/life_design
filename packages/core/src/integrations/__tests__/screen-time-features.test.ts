import { describe, it, expect } from 'vitest';
import { extractScreenTimeFeatures } from '../screen-time-features';
import type { ScreenTimeEntry } from '../../connectors/screen-time';

describe('extractScreenTimeFeatures', () => {
  it('returns null for empty entries', () => {
    expect(extractScreenTimeFeatures([])).toBeNull();
  });

  it('correctly aggregates total minutes', () => {
    const entries: ScreenTimeEntry[] = [
      makeEntry({ durationMinutes: 30 }),
      makeEntry({ durationMinutes: 45 }),
      makeEntry({ durationMinutes: 25 }),
    ];
    const result = extractScreenTimeFeatures(entries)!;
    expect(result.totalDailyMinutes).toBe(100);
  });

  it('calculates social media ratio', () => {
    const entries: ScreenTimeEntry[] = [
      makeEntry({ appCategory: 'social_media', durationMinutes: 60 }),
      makeEntry({ appCategory: 'productivity', durationMinutes: 40 }),
    ];
    const result = extractScreenTimeFeatures(entries)!;
    expect(result.socialMediaRatio).toBeCloseTo(0.6, 2);
  });

  it('detects late night usage when lastUseTime is after 22:00', () => {
    const entries: ScreenTimeEntry[] = [
      makeEntry({ lastUseTime: '23:30', durationMinutes: 40 }),
      makeEntry({ lastUseTime: '21:00', durationMinutes: 30 }),
    ];
    const result = extractScreenTimeFeatures(entries)!;
    expect(result.lateNightUsageMinutes).toBe(40);
  });

  it('scores healthy usage with high digital wellness score (4-5)', () => {
    // < 2h total, no social media, no late night
    const entries: ScreenTimeEntry[] = [
      makeEntry({
        appCategory: 'productivity',
        durationMinutes: 60,
        pickupCount: 5,
        lastUseTime: '20:00',
      }),
      makeEntry({
        appCategory: 'health',
        durationMinutes: 30,
        pickupCount: 3,
        lastUseTime: '19:00',
      }),
    ];
    const result = extractScreenTimeFeatures(entries)!;
    expect(result.digitalWellnessScore).toBeGreaterThanOrEqual(4);
    expect(result.digitalWellnessScore).toBeLessThanOrEqual(5);
  });

  it('scores unhealthy usage with low digital wellness score (1-2)', () => {
    // > 6h total, high social media, heavy late night
    const entries: ScreenTimeEntry[] = [
      makeEntry({
        appCategory: 'social_media',
        durationMinutes: 240,
        pickupCount: 80,
        lastUseTime: '23:59',
      }),
      makeEntry({
        appCategory: 'social_media',
        durationMinutes: 180,
        pickupCount: 60,
        lastUseTime: '01:00',
      }),
    ];
    const result = extractScreenTimeFeatures(entries)!;
    expect(result.digitalWellnessScore).toBeGreaterThanOrEqual(1);
    expect(result.digitalWellnessScore).toBeLessThanOrEqual(2);
  });

  it('calculates productivity ratio', () => {
    const entries: ScreenTimeEntry[] = [
      makeEntry({ appCategory: 'productivity', durationMinutes: 80 }),
      makeEntry({ appCategory: 'entertainment', durationMinutes: 20 }),
    ];
    const result = extractScreenTimeFeatures(entries)!;
    expect(result.productivityRatio).toBeCloseTo(0.8, 2);
  });

  it('averages pickup count across entries', () => {
    const entries: ScreenTimeEntry[] = [
      makeEntry({ pickupCount: 10 }),
      makeEntry({ pickupCount: 20 }),
      makeEntry({ pickupCount: 30 }),
    ];
    const result = extractScreenTimeFeatures(entries)!;
    expect(result.avgPickupsPerDay).toBeCloseTo(20, 0);
  });
});

function makeEntry(overrides: Partial<ScreenTimeEntry> = {}): ScreenTimeEntry {
  return {
    date: '2025-01-15',
    appCategory: 'other',
    durationMinutes: 30,
    pickupCount: 10,
    notificationCount: 5,
    firstUseTime: '08:00',
    lastUseTime: '18:00',
    ...overrides,
  };
}
