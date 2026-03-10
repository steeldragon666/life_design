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
