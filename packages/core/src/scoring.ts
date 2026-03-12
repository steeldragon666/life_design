import type { Dimension } from './enums';

export function computeOverallScore(
  scores: { dimension: Dimension; score: number }[],
): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((acc, s) => acc + s.score, 0);
  return sum / scores.length;
}

export function computeDimensionAverage(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((acc, s) => acc + s, 0);
  return sum / scores.length;
}

/**
 * Count consecutive days with check-ins ending on `today`.
 * Dates must be YYYY-MM-DD strings. Order doesn't matter.
 */
export function computeStreak(dates: string[], today: string): number {
  if (dates.length === 0) return 0;

  const dateSet = new Set(dates);
  if (!dateSet.has(today)) return 0;

  let streak = 0;
  let current = today;

  while (dateSet.has(current)) {
    streak++;
    // Move to previous day (use UTC noon to avoid timezone rollover)
    const d = new Date(current + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - 1);
    current = d.toISOString().slice(0, 10);
  }

  return streak;
}

/**
 * Linear regression slope over an array of scores (equally spaced in time).
 * Positive = improving, negative = declining, 0 = flat.
 */
export function computeTrend(scores: number[]): number {
  const n = scores.length;
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += scores[i];
    sumXY += i * scores[i];
    sumX2 += i * i;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 0;

  return (n * sumXY - sumX * sumY) / denominator;
}

/**
 * Sliding moving average where each value represents a fixed-size trailing window.
 */
export function computeMovingAverage(scores: number[], windowSize: number): number[] {
  if (scores.length === 0) return [];
  if (!Number.isInteger(windowSize) || windowSize <= 0 || windowSize > scores.length) {
    return [];
  }

  const result: number[] = [];
  let rollingSum = 0;

  for (let i = 0; i < scores.length; i++) {
    rollingSum += scores[i];
    if (i >= windowSize) {
      rollingSum -= scores[i - windowSize];
    }
    if (i >= windowSize - 1) {
      result.push(rollingSum / windowSize);
    }
  }

  return result;
}

/**
 * Sample standard deviation (volatility) for a score series.
 */
export function computeVolatility(scores: number[]): number {
  const n = scores.length;
  if (n < 2) return 0;

  const mean = computeDimensionAverage(scores);
  let sumSquaredDiff = 0;
  for (const score of scores) {
    const diff = score - mean;
    sumSquaredDiff += diff * diff;
  }

  return Math.sqrt(sumSquaredDiff / (n - 1));
}

/**
 * Weighted average score. Falls back to unweighted average when weights are invalid.
 */
export function computeWeightedScore(scores: number[], weights: number[]): number {
  if (scores.length === 0) return 0;
  if (scores.length !== weights.length) return computeDimensionAverage(scores);

  let weightedSum = 0;
  let weightSum = 0;

  for (let i = 0; i < scores.length; i++) {
    const score = scores[i];
    const weight = weights[i];
    if (!Number.isFinite(score) || !Number.isFinite(weight) || weight <= 0) continue;
    weightedSum += score * weight;
    weightSum += weight;
  }

  if (weightSum <= 0) return computeDimensionAverage(scores);
  return weightedSum / weightSum;
}

/**
 * Balance index in [0, 1], where 1 means all dimensions are evenly balanced.
 */
export function computeBalanceIndex(scores: number[]): number {
  if (scores.length === 0) return 0;
  if (scores.length === 1) return 1;

  const mean = computeDimensionAverage(scores);
  if (mean === 0) return 0;

  const volatility = computeVolatility(scores);
  const normalizedSpread = volatility / Math.max(Math.abs(mean), 1);
  const balance = 1 - normalizedSpread;
  return Math.max(0, Math.min(1, balance));
}
