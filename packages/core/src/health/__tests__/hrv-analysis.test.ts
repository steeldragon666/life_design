import { describe, it, expect } from 'vitest';
import {
  computeHRVMetrics,
  computeFrequencyDomainMetrics,
  computeHRVTrend,
  type RRInterval,
  type HRVTrendPoint,
} from '../hrv-analysis';

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

  it('computes stress score: RMSSD=100 → 14', () => {
    // Two intervals with diff = 100
    const intervals: RRInterval[] = [
      { timestamp: 0, value: 800 },
      { timestamp: 1000, value: 900 },
    ];
    const result = computeHRVMetrics(intervals)!;
    expect(result.rmssd).toBe(100);
    expect(result.stressScore).toBe(14);
  });

  it('computes stress score: RMSSD=50 → 37', () => {
    const intervals: RRInterval[] = [
      { timestamp: 0, value: 800 },
      { timestamp: 1000, value: 850 },
    ];
    const result = computeHRVMetrics(intervals)!;
    expect(result.rmssd).toBe(50);
    expect(result.stressScore).toBe(37);
  });

  it('computes stress score: RMSSD=150 → 5 (low stress, not 0)', () => {
    // Two intervals with diff = 150
    const intervals: RRInterval[] = [
      { timestamp: 0, value: 800 },
      { timestamp: 1000, value: 950 },
    ];
    const result = computeHRVMetrics(intervals)!;
    expect(result.rmssd).toBe(150);
    expect(result.stressScore).toBe(5);
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

describe('computeFrequencyDomainMetrics', () => {
  it('returns null with fewer than 60 intervals', () => {
    const intervals: RRInterval[] = Array.from({ length: 59 }, (_, i) => ({
      timestamp: i * 1000,
      value: 800 + (i % 2 === 0 ? 10 : -10),
    }));
    expect(computeFrequencyDomainMetrics(intervals)).toBeNull();
  });

  it('computes valid metrics with exactly 60 intervals', () => {
    const intervals: RRInterval[] = Array.from({ length: 60 }, (_, i) => ({
      timestamp: i * 1000,
      value: 800 + (i % 2 === 0 ? 10 : -10),
    }));
    const result = computeFrequencyDomainMetrics(intervals);
    expect(result).not.toBeNull();
    expect(result!.lfPower).toBeGreaterThanOrEqual(0);
    expect(result!.hfPower).toBeGreaterThanOrEqual(0);
    expect(result!.lfHfRatio).toBeGreaterThanOrEqual(0);
    expect(result!.totalPower).toBeGreaterThanOrEqual(0);
  });

  it('LF/HF ratio is always >= 0', () => {
    // Identical intervals → SDNN=0, RMSSD=0, ratio should clamp to 0
    const intervals: RRInterval[] = Array.from({ length: 100 }, (_, i) => ({
      timestamp: i * 1000,
      value: 800,
    }));
    const result = computeFrequencyDomainMetrics(intervals);
    expect(result).not.toBeNull();
    expect(result!.lfHfRatio).toBeGreaterThanOrEqual(0);
  });

  it('computes totalPower as lfPower + hfPower', () => {
    const intervals: RRInterval[] = Array.from({ length: 100 }, (_, i) => ({
      timestamp: i * 1000,
      value: 800 + Math.sin(i * 0.5) * 30,
    }));
    const result = computeFrequencyDomainMetrics(intervals)!;
    expect(result.totalPower).toBeCloseTo(result.lfPower + result.hfPower, 5);
  });

  it('returns higher LF/HF ratio when SDNN >> RMSSD', () => {
    // Slowly drifting values → high SDNN, low RMSSD → high LF/HF
    const intervals: RRInterval[] = Array.from({ length: 100 }, (_, i) => ({
      timestamp: i * 1000,
      value: 700 + i * 2, // linearly increasing → high SDNN, small successive diffs
    }));
    const result = computeFrequencyDomainMetrics(intervals)!;
    expect(result.lfHfRatio).toBeGreaterThan(1);
  });
});

describe('computeHRVTrend', () => {
  const makePoint = (
    date: string,
    rmssd: number,
    sdnn: number,
    stressScore: number,
    stressLevel: 'low' | 'moderate' | 'high',
  ): HRVTrendPoint => ({ date, rmssd, sdnn, stressScore, stressLevel });

  it('detects improving trend (stress decreasing over time)', () => {
    const points: HRVTrendPoint[] = [
      makePoint('2026-04-01', 25, 30, 70, 'high'),
      makePoint('2026-04-02', 30, 35, 60, 'moderate'),
      makePoint('2026-04-03', 35, 40, 55, 'moderate'),
      makePoint('2026-04-04', 45, 50, 40, 'moderate'),
      makePoint('2026-04-05', 55, 60, 30, 'low'),
      makePoint('2026-04-06', 60, 65, 25, 'low'),
    ];
    const result = computeHRVTrend(points);
    expect(result.trendDirection).toBe('improving');
  });

  it('detects worsening trend (stress increasing over time)', () => {
    const points: HRVTrendPoint[] = [
      makePoint('2026-04-01', 60, 65, 25, 'low'),
      makePoint('2026-04-02', 55, 60, 30, 'low'),
      makePoint('2026-04-03', 45, 50, 40, 'moderate'),
      makePoint('2026-04-04', 35, 40, 55, 'moderate'),
      makePoint('2026-04-05', 30, 35, 60, 'moderate'),
      makePoint('2026-04-06', 25, 30, 70, 'high'),
    ];
    const result = computeHRVTrend(points);
    expect(result.trendDirection).toBe('worsening');
  });

  it('detects stable trend when stress stays similar', () => {
    const points: HRVTrendPoint[] = [
      makePoint('2026-04-01', 40, 45, 50, 'moderate'),
      makePoint('2026-04-02', 42, 47, 48, 'moderate'),
      makePoint('2026-04-03', 39, 44, 51, 'moderate'),
      makePoint('2026-04-04', 41, 46, 49, 'moderate'),
    ];
    const result = computeHRVTrend(points);
    expect(result.trendDirection).toBe('stable');
  });

  it('computes correct average stress score', () => {
    const points: HRVTrendPoint[] = [
      makePoint('2026-04-01', 40, 45, 50, 'moderate'),
      makePoint('2026-04-02', 42, 47, 60, 'moderate'),
      makePoint('2026-04-03', 39, 44, 40, 'moderate'),
    ];
    const result = computeHRVTrend(points);
    expect(result.averageStressScore).toBe(50);
  });

  it('computes baselineRMSSD from last 7 entries', () => {
    const points: HRVTrendPoint[] = Array.from({ length: 10 }, (_, i) =>
      makePoint(`2026-04-${String(i + 1).padStart(2, '0')}`, 30 + i * 2, 40, 50, 'moderate'),
    );
    // Last 7 entries: rmssd = 36, 38, 40, 42, 44, 46, 48 → mean = 42
    const result = computeHRVTrend(points);
    expect(result.baselineRMSSD).toBeCloseTo(42, 1);
  });

  it('computes baselineRMSSD from all entries when fewer than 7', () => {
    const points: HRVTrendPoint[] = [
      makePoint('2026-04-01', 30, 40, 50, 'moderate'),
      makePoint('2026-04-02', 40, 45, 45, 'moderate'),
      makePoint('2026-04-03', 50, 55, 40, 'moderate'),
    ];
    const result = computeHRVTrend(points);
    expect(result.baselineRMSSD).toBe(40);
  });

  it('requires minimum 3 data points', () => {
    const points: HRVTrendPoint[] = [
      makePoint('2026-04-01', 30, 40, 50, 'moderate'),
      makePoint('2026-04-02', 40, 45, 45, 'moderate'),
    ];
    expect(() => computeHRVTrend(points)).toThrow();
  });

  it('returns all points in the result', () => {
    const points: HRVTrendPoint[] = [
      makePoint('2026-04-01', 30, 40, 50, 'moderate'),
      makePoint('2026-04-02', 40, 45, 45, 'moderate'),
      makePoint('2026-04-03', 50, 55, 40, 'moderate'),
    ];
    const result = computeHRVTrend(points);
    expect(result.points).toEqual(points);
  });
});

describe('HRVMetrics frequencyDomain field', () => {
  it('includes frequencyDomain when enough intervals are provided', () => {
    const intervals: RRInterval[] = Array.from({ length: 100 }, (_, i) => ({
      timestamp: i * 1000,
      value: 800 + (i % 2 === 0 ? 15 : -15),
    }));
    const result = computeHRVMetrics(intervals)!;
    expect(result.frequencyDomain).toBeDefined();
    expect(result.frequencyDomain!.lfHfRatio).toBeGreaterThanOrEqual(0);
  });

  it('does not include frequencyDomain when fewer than 60 intervals', () => {
    const intervals: RRInterval[] = [
      { timestamp: 0, value: 800 },
      { timestamp: 1000, value: 810 },
    ];
    const result = computeHRVMetrics(intervals)!;
    expect(result.frequencyDomain).toBeUndefined();
  });
});
