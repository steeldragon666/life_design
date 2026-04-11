export interface LaggedCorrelationResult {
  bestLag: number;
  bestCorrelation: number;
  overlap: number;
}

export interface PairCorrelation {
  keyA: string;
  keyB: string;
  correlation: number;
  sampleSize: number;
  bestLag: number;
  bestLagCorrelation: number;
  pValue: number;
  confidence: number;
}

export type CorrelationMatrix = PairCorrelation[];

export interface SignificantPattern extends PairCorrelation {
  direction: 'positive' | 'negative';
  strength: 'moderate' | 'strong';
}

export interface RankedInsight extends SignificantPattern {
  noveltyScore: number;
}

type SeriesByKey = Record<string, number[]>;
type ScoresByDate = Record<string, Record<string, number | null | undefined>>;
export type ScoresByDateOrSeries = SeriesByKey | ScoresByDate;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toFiniteAlignedPairs(x: number[], y: number[]): [number[], number[]] {
  if (x.length !== y.length || x.length < 2) return [[], []];
  const xs: number[] = [];
  const ys: number[] = [];

  for (let i = 0; i < x.length; i++) {
    const xv = x[i];
    const yv = y[i];
    if (!Number.isFinite(xv) || !Number.isFinite(yv)) continue;
    xs.push(xv);
    ys.push(yv);
  }

  return [xs, ys];
}

/**
 * Pearson correlation coefficient r in [-1, 1].
 */
export function pearsonCorrelation(x: number[], y: number[]): number {
  const [xs, ys] = toFiniteAlignedPairs(x, y);
  const n = xs.length;
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let numerator = 0;
  let varianceX = 0;
  let varianceY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    numerator += dx * dy;
    varianceX += dx * dx;
    varianceY += dy * dy;
  }

  if (varianceX === 0 || varianceY === 0) return 0;
  return numerator / Math.sqrt(varianceX * varianceY);
}

/**
 * Finds the strongest absolute correlation for lags in [-maxLag, +maxLag].
 * Positive lag means x leads y by `lag`.
 */
export function laggedCorrelation(
  x: number[],
  y: number[],
  maxLag: number,
): LaggedCorrelationResult {
  const lagLimit = Math.max(0, Math.floor(maxLag));
  if (x.length < 2 || y.length < 2) {
    return { bestLag: 0, bestCorrelation: 0, overlap: 0 };
  }

  let bestLag = 0;
  let bestCorrelation = 0;
  let bestOverlap = 0;

  for (let lag = -lagLimit; lag <= lagLimit; lag++) {
    const xa: number[] = [];
    const ya: number[] = [];
    const n = Math.min(x.length, y.length);

    for (let i = 0; i < n; i++) {
      const j = i + lag;
      if (j < 0 || j >= n) continue;
      const xv = x[i];
      const yv = y[j];
      if (!Number.isFinite(xv) || !Number.isFinite(yv)) continue;
      xa.push(xv);
      ya.push(yv);
    }

    const overlap = xa.length;
    if (overlap < 2) continue;

    const r = pearsonCorrelation(xa, ya);
    const absR = Math.abs(r);
    const absBest = Math.abs(bestCorrelation);

    if (
      absR > absBest ||
      (absR === absBest && overlap > bestOverlap) ||
      (absR === absBest && overlap === bestOverlap && Math.abs(lag) < Math.abs(bestLag))
    ) {
      bestLag = lag;
      bestCorrelation = r;
      bestOverlap = overlap;
    }
  }

  return { bestLag, bestCorrelation, overlap: bestOverlap };
}

function isSeriesByKey(input: ScoresByDateOrSeries): input is SeriesByKey {
  const values = Object.values(input);
  return values.length > 0 && Array.isArray(values[0]);
}

function normalizeToSeries(input: ScoresByDateOrSeries): SeriesByKey {
  if (isSeriesByKey(input)) return input;

  const dates = Object.keys(input).sort();
  const metricSet = new Set<string>();
  for (const date of dates) {
    const metrics = input[date];
    for (const key of Object.keys(metrics)) {
      metricSet.add(key);
    }
  }

  const metrics = Array.from(metricSet).sort();
  const byMetric: SeriesByKey = {};
  for (const metric of metrics) {
    byMetric[metric] = [];
  }

  for (const date of dates) {
    const row = input[date];
    for (const metric of metrics) {
      const value = row[metric];
      byMetric[metric].push(typeof value === 'number' ? value : Number.NaN);
    }
  }

  return byMetric;
}

function erf(x: number): number {
  // Abramowitz and Stegun approximation.
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const p = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const t = 1 / (1 + p * ax);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax));
  return sign * y;
}

function normalCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

function approximatePValue(r: number, n: number): number {
  if (n < 4) return 1;
  const clamped = clamp(r, -0.999999, 0.999999);
  const fisherZ = 0.5 * Math.log((1 + clamped) / (1 - clamped));
  const zScore = Math.abs(fisherZ) * Math.sqrt(n - 3);
  const p = 2 * (1 - normalCdf(zScore));
  return clamp(p, 0, 1);
}

/**
 * Computes a confidence interval for a Pearson correlation coefficient
 * using the Fisher z-transform.
 *
 * @param r  - Pearson correlation coefficient in [-1, 1]
 * @param n  - Sample size (must be >= 4)
 * @param z  - Z-score for desired confidence level (default 1.96 = 95% CI)
 * @returns   [lower, upper] bounds of the confidence interval
 */
export function correlationConfidenceInterval(
  r: number,
  n: number,
  z: number = 1.96,
): [number, number] {
  if (n < 4) return [-1, 1];
  const clamped = clamp(r, -0.999999, 0.999999);
  // Fisher z-transform: z' = atanh(r)
  const zPrime = Math.atanh(clamped);
  // Standard error
  const se = 1 / Math.sqrt(n - 3);
  // CI in z-space, then inverse-transform back
  const lower = Math.tanh(zPrime - z * se);
  const upper = Math.tanh(zPrime + z * se);
  return [lower, upper];
}

function computeConfidence(r: number, n: number, pValue: number): number {
  const effect = clamp((Math.abs(r) - 0.3) / 0.7, 0, 1);
  const sample = clamp((n - 14) / 30, 0, 1);
  const significance = clamp(1 - pValue, 0, 1);
  return clamp(0.45 * effect + 0.35 * significance + 0.2 * sample, 0, 1);
}

/**
 * Computes pairwise correlations from either:
 * - series map: { metric: [values...] }
 * - date map: { "YYYY-MM-DD": { metric: value } }
 */
export function computeAllPairCorrelations(
  scoresByDateOrSeries: ScoresByDateOrSeries,
): CorrelationMatrix {
  const seriesMap = normalizeToSeries(scoresByDateOrSeries);
  const keys = Object.keys(seriesMap).sort();
  const matrix: CorrelationMatrix = [];

  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const keyA = keys[i];
      const keyB = keys[j];
      const [x, y] = toFiniteAlignedPairs(seriesMap[keyA], seriesMap[keyB]);
      const sampleSize = x.length;
      const correlation = pearsonCorrelation(x, y);
      const lagged = laggedCorrelation(x, y, 72);
      const pValue = approximatePValue(correlation, sampleSize);
      const confidence = computeConfidence(correlation, sampleSize, pValue);

      matrix.push({
        keyA,
        keyB,
        correlation,
        sampleSize,
        bestLag: lagged.bestLag,
        bestLagCorrelation: lagged.bestCorrelation,
        pValue,
        confidence,
      });
    }
  }

  return matrix;
}

/**
 * Applies practical significance guardrails and confidence thresholding.
 * Guardrails:
 * - sample size n >= 14
 * - |r| >= 0.3
 * - confidence >= minConfidence
 */
export function detectSignificantPatterns(
  matrix: CorrelationMatrix,
  minConfidence: number,
): SignificantPattern[] {
  const threshold = clamp(minConfidence, 0, 1);
  const patterns: SignificantPattern[] = [];

  for (const pair of matrix) {
    if (pair.sampleSize < 14) continue;
    if (Math.abs(pair.correlation) < 0.3) continue;
    if (pair.confidence < threshold) continue;

    patterns.push({
      ...pair,
      direction: pair.correlation >= 0 ? 'positive' : 'negative',
      strength: Math.abs(pair.correlation) >= 0.7 ? 'strong' : 'moderate',
    });
  }

  patterns.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return Math.abs(b.correlation) - Math.abs(a.correlation);
  });

  return patterns;
}

export function generateInsightNarrative(pattern: SignificantPattern): string {
  const relation = pattern.direction === 'positive' ? 'move together' : 'move in opposite directions';
  const lagHint =
    pattern.bestLag === 0
      ? 'No meaningful lag was observed.'
      : `The strongest relationship appears with a lag of ${pattern.bestLag}.`;
  const confidencePct = Math.round(pattern.confidence * 100);

  return `${pattern.keyA} and ${pattern.keyB} ${relation} (r=${pattern.correlation.toFixed(2)}, n=${pattern.sampleSize}). Confidence ${confidencePct}% (approx p=${pattern.pValue.toFixed(3)}). ${lagHint}`;
}

function insightFingerprint(insight: SignificantPattern): string {
  const keys = [insight.keyA, insight.keyB].sort();
  return `${keys[0]}|${keys[1]}|${insight.direction}|${insight.strength}`;
}

export function rankInsightsByNovelty(
  insights: SignificantPattern[],
  seen: Iterable<string>,
): RankedInsight[] {
  const seenSet = new Set(seen);
  const ranked = insights.map((insight) => {
    const seenBefore = seenSet.has(insightFingerprint(insight));
    const noveltyScore = seenBefore ? 0.2 : 1;
    return { ...insight, noveltyScore };
  });

  ranked.sort((a, b) => {
    const scoreA = a.noveltyScore * 0.65 + a.confidence * 0.35;
    const scoreB = b.noveltyScore * 0.65 + b.confidence * 0.35;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return Math.abs(b.correlation) - Math.abs(a.correlation);
  });

  return ranked;
}
