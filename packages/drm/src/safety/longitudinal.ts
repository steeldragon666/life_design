/**
 * @module safety/longitudinal
 *
 * Tier 2: Longitudinal Pattern Monitoring
 *
 * Detects slowly-emerging risk signals that real-time classifiers miss —
 * worsening PHQ-9 trajectories, withdrawal from the app, and sustained
 * negative emotional tone. All functions are pure with no side effects.
 */

import { SafetyTier } from '../types.js';
import type { LongitudinalRiskAssessment, TrendData } from '../types.js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PHQ9DataPoint {
  score: number;
  date: Date;
}

export interface EmotionalValencePoint {
  valence: number;
  date: Date;
}

export interface LongitudinalParams {
  userId: string;
  phq9Scores: PHQ9DataPoint[];
  sessionTimestamps: Date[];
  emotionalValences: EmotionalValencePoint[];
  /** Expected sessions per week under normal circumstances. */
  baselineSessionFrequency: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

/** PHQ-9 linear-regression slope threshold (points per week). Flag if exceeded. */
const PHQ9_SLOPE_THRESHOLD = 0.5;

/**
 * Session frequency drop threshold.
 * Flag when last-2-week frequency has dropped by more than this fraction
 * relative to baseline.
 */
const SESSION_DROP_THRESHOLD = 0.5;

/**
 * Emotional valence mean threshold (scale -1.0 to +1.0).
 * Flag when the mean valence over the last 2 weeks is below this value.
 */
const VALENCE_MEAN_THRESHOLD = -0.6;

/** Window used for "recent" comparisons (milliseconds). */
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
const FOUR_WEEKS_MS = 28 * 24 * 60 * 60 * 1000;

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Compute ordinary least-squares linear regression over an array of (x, y)
 * pairs and return the slope. Returns null when fewer than 2 data points are
 * available — a slope cannot be defined.
 */
function linearRegressionSlope(points: Array<[number, number]>): number | null {
  const n = points.length;
  if (n < 2) return null;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (const [x, y] of points) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 0;

  return (n * sumXY - sumX * sumY) / denominator;
}

/**
 * Compute the arithmetic mean of an array of numbers.
 * Returns null for an empty array.
 */
function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

// ── PHQ-9 trend ──────────────────────────────────────────────────────────────

/**
 * Compute a TrendData object from PHQ-9 scores over the last 4 weeks.
 *
 * Time is normalised to weeks-since-earliest-point so the slope is expressed
 * in PHQ-9 points per week — an intuitive clinical unit.
 *
 * Returns null when fewer than 2 scored data points exist in the window.
 */
function computePHQ9Trend(
  scores: PHQ9DataPoint[],
  now: Date,
): TrendData | null {
  const cutoff = new Date(now.getTime() - FOUR_WEEKS_MS);
  const recent = scores
    .filter((p) => p.date >= cutoff)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (recent.length < 2) return null;

  const epoch = recent[0].date.getTime();
  const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

  const points: Array<[number, number]> = recent.map((p) => [
    (p.date.getTime() - epoch) / MS_PER_WEEK,
    p.score,
  ]);

  const slope = linearRegressionSlope(points);
  if (slope === null) return null;

  return {
    slope,
    currentValue: recent[recent.length - 1].score,
    baselineValue: recent[0].score,
    dataPoints: recent.length,
  };
}

// ── Session frequency ────────────────────────────────────────────────────────

/**
 * Compare the session frequency over the last 2 weeks against the stated
 * baseline (sessions per week).
 *
 * Returns the fractional delta: positive means more sessions than baseline,
 * negative means fewer.  e.g. -0.6 means 60% fewer sessions than expected.
 *
 * Returns null when baseline is zero or no timestamps are provided.
 */
function computeSessionFrequencyDelta(
  sessionTimestamps: Date[],
  baselineSessionFrequency: number,
  now: Date,
): number | null {
  if (baselineSessionFrequency <= 0) return null;

  const cutoff = new Date(now.getTime() - TWO_WEEKS_MS);
  const recentCount = sessionTimestamps.filter((t) => t >= cutoff).length;

  // Expected count over 2 weeks
  const expectedCount = baselineSessionFrequency * 2;

  // Delta as a fraction of expected (negative = below baseline)
  return (recentCount - expectedCount) / expectedCount;
}

// ── Emotional valence ────────────────────────────────────────────────────────

/**
 * Compute a TrendData object from emotional valence readings over the last
 * 2 weeks. The slope is computed using the same OLS approach, but the primary
 * flag driver is the mean of recent values rather than the slope.
 *
 * Returns null when fewer than 2 data points exist in the window.
 */
function computeEmotionalValenceTrend(
  valences: EmotionalValencePoint[],
  now: Date,
): TrendData | null {
  const cutoff = new Date(now.getTime() - TWO_WEEKS_MS);
  const recent = valences
    .filter((p) => p.date >= cutoff)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (recent.length < 2) return null;

  const epoch = recent[0].date.getTime();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  const points: Array<[number, number]> = recent.map((p) => [
    (p.date.getTime() - epoch) / MS_PER_DAY,
    p.valence,
  ]);

  const slope = linearRegressionSlope(points);
  if (slope === null) return null;

  const recentMean = mean(recent.map((p) => p.valence));
  const currentValue = recentMean ?? recent[recent.length - 1].valence;

  // Use the earliest reading in the window as the baseline proxy
  const baselineValue = recent[0].valence;

  return {
    slope,
    currentValue,
    baselineValue,
    dataPoints: recent.length,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Assess longitudinal risk signals for a user based on historical PHQ-9 scores,
 * session frequency, and emotional valence data.
 *
 * Flagging thresholds:
 * - PHQ-9 slope > 0.5 points/week over the last 4 weeks.
 * - Session frequency drop > 50% relative to stated baseline over the last 2 weeks.
 * - Mean emotional valence < -0.6 over the last 2 weeks.
 *
 * `recommendProfessional` is set true when two or more flags are raised.
 * The function is pure: it reads the current time via `new Date()` so callers
 * can override it in tests by passing pre-dated timestamps.
 */
export function assessLongitudinalRisk(
  params: LongitudinalParams,
): LongitudinalRiskAssessment {
  const now = new Date();
  const tier2Flags: string[] = [];

  // ── PHQ-9 trend ────────────────────────────────────────────────────────────
  const phq9Trend = computePHQ9Trend(params.phq9Scores, now);

  if (phq9Trend !== null && phq9Trend.slope > PHQ9_SLOPE_THRESHOLD) {
    tier2Flags.push(
      `PHQ-9 worsening: slope ${phq9Trend.slope.toFixed(2)} pts/week over last 4 weeks`,
    );
  }

  // ── Session frequency ──────────────────────────────────────────────────────
  const sessionFrequencyDelta = computeSessionFrequencyDelta(
    params.sessionTimestamps,
    params.baselineSessionFrequency,
    now,
  );

  if (
    sessionFrequencyDelta !== null &&
    sessionFrequencyDelta < -SESSION_DROP_THRESHOLD
  ) {
    const pctDrop = Math.round(Math.abs(sessionFrequencyDelta) * 100);
    tier2Flags.push(
      `Session withdrawal: ${pctDrop}% fewer sessions than baseline over last 2 weeks`,
    );
  }

  // ── Emotional valence ──────────────────────────────────────────────────────
  const emotionalValenceTrend = computeEmotionalValenceTrend(
    params.emotionalValences,
    now,
  );

  if (
    emotionalValenceTrend !== null &&
    emotionalValenceTrend.currentValue < VALENCE_MEAN_THRESHOLD
  ) {
    tier2Flags.push(
      `Sustained negative affect: mean valence ${emotionalValenceTrend.currentValue.toFixed(2)} over last 2 weeks`,
    );
  }

  return {
    userId: params.userId,
    tier2Flags,
    recommendProfessional: tier2Flags.length >= 2,
    phq9Trend,
    sessionFrequencyDelta,
    emotionalValenceTrend,
    assessedAt: now,
  };
}

/**
 * Convenience helper: convert a LongitudinalRiskAssessment to the equivalent
 * SafetyTier for use in the broader safety pipeline.
 *
 * - Two or more flags => Tier 2 (Elevated)
 * - Any flag         => Tier 2 (Elevated)
 * - No flags         => Tier 3 (No risk)
 *
 * Tier 1 is never returned here — longitudinal assessment does not indicate
 * immediate crisis. Tier 1 requires real-time classification via the classifier
 * module.
 */
export function longitudinalAssessmentToTier(
  assessment: LongitudinalRiskAssessment,
): SafetyTier {
  if (assessment.tier2Flags.length > 0) {
    return SafetyTier.Tier2_Elevated;
  }
  return SafetyTier.Tier3_NoRisk;
}
