import { describe, it, expect } from 'vitest';
import {
  computeOverallScore,
  computeDimensionAverage,
  computeStreak,
  computeTrend,
  computeMovingAverage,
  computeVolatility,
  computeWeightedScore,
  computeBalanceIndex,
} from '../scoring';
import { Dimension } from '../enums';
import type { DimensionScore } from '../types';

describe('computeOverallScore', () => {
  it('computes the average of dimension scores', () => {
    const scores: Pick<DimensionScore, 'dimension' | 'score'>[] = [
      { dimension: Dimension.Health, score: 8 },
      { dimension: Dimension.Career, score: 6 },
      { dimension: Dimension.Finance, score: 4 },
    ];
    expect(computeOverallScore(scores)).toBeCloseTo(6.0);
  });

  it('returns 0 for empty scores', () => {
    expect(computeOverallScore([])).toBe(0);
  });

  it('handles single score', () => {
    const scores = [{ dimension: Dimension.Growth, score: 9 }];
    expect(computeOverallScore(scores)).toBe(9);
  });
});

describe('computeDimensionAverage', () => {
  it('computes the average score for a dimension over multiple check-ins', () => {
    const scores = [7, 8, 9];
    expect(computeDimensionAverage(scores)).toBeCloseTo(8.0);
  });

  it('returns 0 for empty array', () => {
    expect(computeDimensionAverage([])).toBe(0);
  });

  it('handles single value', () => {
    expect(computeDimensionAverage([5])).toBe(5);
  });
});

describe('computeStreak', () => {
  it('computes consecutive days with check-ins ending today', () => {
    const today = '2025-01-15';
    const dates = ['2025-01-13', '2025-01-14', '2025-01-15'];
    expect(computeStreak(dates, today)).toBe(3);
  });

  it('returns 0 if today has no check-in', () => {
    const today = '2025-01-15';
    const dates = ['2025-01-13', '2025-01-14'];
    expect(computeStreak(dates, today)).toBe(0);
  });

  it('breaks streak on gaps', () => {
    const today = '2025-01-15';
    const dates = ['2025-01-12', '2025-01-14', '2025-01-15'];
    expect(computeStreak(dates, today)).toBe(2);
  });

  it('returns 1 if only today exists', () => {
    const today = '2025-01-15';
    const dates = ['2025-01-15'];
    expect(computeStreak(dates, today)).toBe(1);
  });

  it('returns 0 for empty dates', () => {
    expect(computeStreak([], '2025-01-15')).toBe(0);
  });
});

describe('computeTrend', () => {
  it('returns positive slope for increasing scores', () => {
    const scores = [3, 4, 5, 6, 7];
    expect(computeTrend(scores)).toBeGreaterThan(0);
  });

  it('returns negative slope for decreasing scores', () => {
    const scores = [7, 6, 5, 4, 3];
    expect(computeTrend(scores)).toBeLessThan(0);
  });

  it('returns 0 for flat scores', () => {
    const scores = [5, 5, 5, 5];
    expect(computeTrend(scores)).toBeCloseTo(0);
  });

  it('returns 0 for fewer than 2 data points', () => {
    expect(computeTrend([])).toBe(0);
    expect(computeTrend([5])).toBe(0);
  });

  it('returns exact slope of 1 for [1, 2, 3]', () => {
    expect(computeTrend([1, 2, 3])).toBeCloseTo(1.0);
  });
});

describe('computeMovingAverage', () => {
  it('computes sliding window averages', () => {
    expect(computeMovingAverage([2, 4, 6, 8], 2)).toEqual([3, 5, 7]);
  });

  it('returns empty array for invalid window', () => {
    expect(computeMovingAverage([1, 2, 3], 0)).toEqual([]);
    expect(computeMovingAverage([1, 2, 3], 4)).toEqual([]);
  });
});

describe('computeVolatility', () => {
  it('returns 0 for a flat series', () => {
    expect(computeVolatility([5, 5, 5, 5])).toBe(0);
  });

  it('returns positive sample standard deviation for varying scores', () => {
    expect(computeVolatility([4, 6, 8, 10])).toBeCloseTo(2.58199, 4);
  });
});

describe('computeWeightedScore', () => {
  it('computes weighted mean when weights sum is positive', () => {
    expect(computeWeightedScore([10, 5], [0.8, 0.2])).toBeCloseTo(9);
  });

  it('falls back to simple average when weights are unusable', () => {
    expect(computeWeightedScore([8, 4], [0, 0])).toBeCloseTo(6);
    expect(computeWeightedScore([8, 4], [1])).toBeCloseTo(6);
  });
});

describe('computeBalanceIndex', () => {
  it('returns 1 for perfectly balanced dimensions', () => {
    expect(computeBalanceIndex([6, 6, 6, 6])).toBeCloseTo(1);
  });

  it('returns lower values when spread increases', () => {
    const balanced = computeBalanceIndex([6, 6, 6, 6]);
    const imbalanced = computeBalanceIndex([2, 10, 3, 9]);
    expect(imbalanced).toBeLessThan(balanced);
    expect(imbalanced).toBeGreaterThanOrEqual(0);
  });
});
