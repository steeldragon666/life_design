import { describe, it, expect } from 'vitest';
import { computeHRVMetrics, type RRInterval } from '../hrv-analysis';

describe('computeHRVMetrics', () => {
  it('returns null for fewer than 2 intervals', () => {
    expect(computeHRVMetrics([])).toBeNull();
    expect(computeHRVMetrics([{ timestamp: 0, value: 800 }])).toBeNull();
  });

  it('computes correct RMSSD for known values', () => {
    // Intervals: 800, 810, 790, 820
    // Successive diffs: 10, -20, 30
    // Squared: 100, 400, 900
    // Mean of squared: (100+400+900)/3 = 466.667
    // RMSSD = sqrt(466.667) ≈ 21.60
    const intervals: RRInterval[] = [
      { timestamp: 0, value: 800 },
      { timestamp: 1000, value: 810 },
      { timestamp: 2000, value: 790 },
      { timestamp: 3000, value: 820 },
    ];
    const result = computeHRVMetrics(intervals)!;
    expect(result.rmssd).toBeCloseTo(21.60, 1);
  });

  it('computes correct SDNN for known values', () => {
    // Intervals: 800, 810, 790, 820
    // Mean = 805
    // Diffs from mean: -5, 5, -15, 15
    // Squared: 25, 25, 225, 225
    // Variance (population) = 500/4 = 125
    // SDNN = sqrt(125) ≈ 11.18
    const intervals: RRInterval[] = [
      { timestamp: 0, value: 800 },
      { timestamp: 1000, value: 810 },
      { timestamp: 2000, value: 790 },
      { timestamp: 3000, value: 820 },
    ];
    const result = computeHRVMetrics(intervals)!;
    expect(result.sdnn).toBeCloseTo(11.18, 1);
  });

  it('derives mean HR from mean RR (60000/meanRR)', () => {
    // Mean RR = 800 → Mean HR = 60000/800 = 75
    const intervals: RRInterval[] = [
      { timestamp: 0, value: 800 },
      { timestamp: 1000, value: 800 },
    ];
    const result = computeHRVMetrics(intervals)!;
    expect(result.meanRR).toBe(800);
    expect(result.meanHR).toBe(75);
  });

  it('classifies stress as low when RMSSD >= 50', () => {
    // Need RMSSD = 50. Two intervals with diff = 50: e.g. 800, 850
    // Successive diffs: 50. Squared: 2500. Mean: 2500/1 = 2500. RMSSD = sqrt(2500) = 50
    const intervals: RRInterval[] = [
      { timestamp: 0, value: 800 },
      { timestamp: 1000, value: 850 },
    ];
    const result = computeHRVMetrics(intervals)!;
    expect(result.rmssd).toBe(50);
    expect(result.stressLevel).toBe('low');
  });

  it('classifies stress as moderate when RMSSD is 49.9', () => {
    // RMSSD = sqrt(diff^2) = |diff|. Need |diff| = 49.9
    const intervals: RRInterval[] = [
      { timestamp: 0, value: 800 },
      { timestamp: 1000, value: 849.9 },
    ];
    const result = computeHRVMetrics(intervals)!;
    // RMSSD = sqrt(49.9^2 / 1) = 49.9
    expect(result.rmssd).toBeCloseTo(49.9, 1);
    expect(result.stressLevel).toBe('moderate');
  });

  it('classifies stress as moderate when RMSSD = 20', () => {
    const intervals: RRInterval[] = [
      { timestamp: 0, value: 800 },
      { timestamp: 1000, value: 820 },
    ];
    const result = computeHRVMetrics(intervals)!;
    expect(result.rmssd).toBe(20);
    expect(result.stressLevel).toBe('moderate');
  });

  it('classifies stress as high when RMSSD < 20', () => {
    // RMSSD = |diff| = 19.9
    const intervals: RRInterval[] = [
      { timestamp: 0, value: 800 },
      { timestamp: 1000, value: 819.9 },
    ];
    const result = computeHRVMetrics(intervals)!;
    expect(result.rmssd).toBeCloseTo(19.9, 1);
    expect(result.stressLevel).toBe('high');
  });

  it('computes stress score: RMSSD=0 → 100', () => {
    // Identical intervals → RMSSD = 0
    const intervals: RRInterval[] = [
      { timestamp: 0, value: 800 },
      { timestamp: 1000, value: 800 },
    ];
    const result = computeHRVMetrics(intervals)!;
    expect(result.stressScore).toBe(100);
  });

  it('computes stress score: RMSSD=100 → 0', () => {
    // Two intervals with diff = 100
    const intervals: RRInterval[] = [
      { timestamp: 0, value: 800 },
      { timestamp: 1000, value: 900 },
    ];
    const result = computeHRVMetrics(intervals)!;
    expect(result.rmssd).toBe(100);
    expect(result.stressScore).toBe(0);
  });

  it('computes stress score: RMSSD=50 → 50', () => {
    const intervals: RRInterval[] = [
      { timestamp: 0, value: 800 },
      { timestamp: 1000, value: 850 },
    ];
    const result = computeHRVMetrics(intervals)!;
    expect(result.rmssd).toBe(50);
    expect(result.stressScore).toBe(50);
  });

  it('handles identical intervals (RMSSD=0, SDNN=0)', () => {
    const intervals: RRInterval[] = [
      { timestamp: 0, value: 800 },
      { timestamp: 1000, value: 800 },
      { timestamp: 2000, value: 800 },
    ];
    const result = computeHRVMetrics(intervals)!;
    expect(result.rmssd).toBe(0);
    expect(result.sdnn).toBe(0);
    expect(result.meanRR).toBe(800);
    expect(result.meanHR).toBe(75);
    expect(result.stressLevel).toBe('high');
    expect(result.stressScore).toBe(100);
  });
});
