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

export interface GrangerResult {
  direction: 'x_causes_y' | 'y_causes_x' | 'bidirectional' | 'none';
  fStatisticXY: number;
  fStatisticYX: number;
  pValueXY: number;
  pValueYX: number;
  assessment: 'suggestive' | 'moderate' | 'strong' | null;
  lagUsed: number;
}

export interface SignificantPattern extends PairCorrelation {
  direction: 'positive' | 'negative';
  strength: 'moderate' | 'strong';
  causalAssessment?: GrangerResult['assessment'];
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

/**
 * Solves ordinary least squares: β = (X'X)^(-1) X'y
 * X is n×p, y is n×1. Returns β (p×1) or null if singular.
 */
function olsSolve(X: number[][], y: number[]): number[] | null {
  const n = X.length;
  const p = X[0].length;

  // Compute X'X (p×p)
  const XtX: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  for (let i = 0; i < p; i++) {
    for (let j = i; j < p; j++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += X[k][i] * X[k][j];
      XtX[i][j] = s;
      XtX[j][i] = s;
    }
  }

  // Compute X'y (p×1)
  const Xty: number[] = new Array(p).fill(0);
  for (let i = 0; i < p; i++) {
    let s = 0;
    for (let k = 0; k < n; k++) s += X[k][i] * y[k];
    Xty[i] = s;
  }

  // Solve via Gaussian elimination with partial pivoting on augmented [XtX | Xty]
  const aug: number[][] = XtX.map((row, i) => [...row, Xty[i]]);

  for (let col = 0; col < p; col++) {
    // Partial pivot
    let maxVal = Math.abs(aug[col][col]);
    let maxRow = col;
    for (let row = col + 1; row < p; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }
    if (maxVal < 1e-12) return null; // singular
    if (maxRow !== col) {
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    }

    const pivot = aug[col][col];
    for (let j = col; j <= p; j++) aug[col][j] /= pivot;

    for (let row = 0; row < p; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = col; j <= p; j++) aug[row][j] -= factor * aug[col][j];
    }
  }

  return aug.map((row) => row[p]);
}

/**
 * Compute RSS (residual sum of squares) for OLS fit.
 */
function computeRSS(X: number[][], y: number[], beta: number[]): number {
  let rss = 0;
  for (let i = 0; i < y.length; i++) {
    let predicted = 0;
    for (let j = 0; j < beta.length; j++) predicted += X[i][j] * beta[j];
    const residual = y[i] - predicted;
    rss += residual * residual;
  }
  return rss;
}

/**
 * Approximate the p-value of an F-statistic using the regularized incomplete beta function.
 * P(F > f) = 1 - I_{d2/(d2+d1*f)}(d2/2, d1/2)
 */
function fDistPValue(f: number, d1: number, d2: number): number {
  if (f <= 0 || d1 <= 0 || d2 <= 0) return 1;
  const x = d2 / (d2 + d1 * f);
  return regularizedBeta(x, d2 / 2, d1 / 2);
}

/**
 * Regularized incomplete beta function I_x(a, b) using a continued fraction expansion.
 */
function regularizedBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Use the symmetry relation when x > (a+1)/(a+b+2)
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - regularizedBeta(1 - x, b, a);
  }

  const lnBeta = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a;

  // Lentz's continued fraction
  const maxIter = 200;
  const eps = 1e-14;
  let c = 1;
  let d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < eps) d = eps;
  d = 1 / d;
  let result = d;

  for (let m = 1; m <= maxIter; m++) {
    // Even step
    let numerator = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 + numerator * d;
    if (Math.abs(d) < eps) d = eps;
    c = 1 + numerator / c;
    if (Math.abs(c) < eps) c = eps;
    d = 1 / d;
    result *= d * c;

    // Odd step
    numerator = -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + numerator * d;
    if (Math.abs(d) < eps) d = eps;
    c = 1 + numerator / c;
    if (Math.abs(c) < eps) c = eps;
    d = 1 / d;
    const delta = d * c;
    result *= delta;

    if (Math.abs(delta - 1) < eps) break;
  }

  return clamp(front * result, 0, 1);
}

/**
 * Log-gamma via Stirling/Lanczos approximation.
 */
function lnGamma(z: number): number {
  if (z <= 0) return 0;
  // Lanczos approximation (g=7)
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];

  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  }

  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (z + i);
  }
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function assessFromPValue(p: number): 'suggestive' | 'moderate' | 'strong' | null {
  if (p < 0.01) return 'strong';
  if (p < 0.05) return 'moderate';
  if (p < 0.10) return 'suggestive';
  return null;
}

/**
 * Simplified Granger causality test.
 *
 * Tests whether lagged values of one series help predict the other,
 * beyond what the series' own lagged values predict.
 *
 * Returns null if insufficient data (need at least maxLag + 5 observations).
 */
export function grangerCausality(
  x: number[],
  y: number[],
  maxLag: number = 3,
): GrangerResult | null {
  const lag = Math.max(1, Math.floor(maxLag));

  // Filter out rows where either x or y is NaN/non-finite
  const validIndices: number[] = [];
  const minLen = Math.min(x.length, y.length);
  for (let i = 0; i < minLen; i++) {
    if (Number.isFinite(x[i]) && Number.isFinite(y[i])) {
      validIndices.push(i);
    }
  }

  // Re-index to contiguous arrays after filtering
  // We need contiguous data for lag analysis, so find contiguous runs
  // and use the longest one, OR simply re-map to sequential indices
  const xClean: number[] = validIndices.map((i) => x[i]);
  const yClean: number[] = validIndices.map((i) => y[i]);

  const n = xClean.length;
  if (n < lag + 5) return null;

  // Number of usable observations after creating lagged variables
  const T = n - lag;

  // Build design matrices for X→Y test
  // Restricted: Y[t] = a0 + Σ(ai * Y[t-i]) for i=1..lag
  // Unrestricted: Y[t] = a0 + Σ(ai * Y[t-i]) + Σ(bi * X[t-i]) for i=1..lag

  const yTarget: number[] = [];
  const xRestricted: number[][] = [];
  const xUnrestricted: number[][] = [];

  for (let t = lag; t < n; t++) {
    yTarget.push(yClean[t]);

    const restricted: number[] = [1]; // intercept
    for (let i = 1; i <= lag; i++) restricted.push(yClean[t - i]);
    xRestricted.push(restricted);

    const unrestricted: number[] = [1]; // intercept
    for (let i = 1; i <= lag; i++) unrestricted.push(yClean[t - i]);
    for (let i = 1; i <= lag; i++) unrestricted.push(xClean[t - i]);
    xUnrestricted.push(unrestricted);
  }

  // Also build for Y→X test
  const xTarget: number[] = [];
  const xRestrictedYX: number[][] = [];
  const xUnrestrictedYX: number[][] = [];

  for (let t = lag; t < n; t++) {
    xTarget.push(xClean[t]);

    const restricted: number[] = [1];
    for (let i = 1; i <= lag; i++) restricted.push(xClean[t - i]);
    xRestrictedYX.push(restricted);

    const unrestricted: number[] = [1];
    for (let i = 1; i <= lag; i++) unrestricted.push(xClean[t - i]);
    for (let i = 1; i <= lag; i++) unrestricted.push(yClean[t - i]);
    xUnrestrictedYX.push(unrestricted);
  }

  // Compute F-statistic for X→Y
  const betaRestXY = olsSolve(xRestricted, yTarget);
  const betaUnrestXY = olsSolve(xUnrestricted, yTarget);
  if (!betaRestXY || !betaUnrestXY) return null;

  const rssRestXY = computeRSS(xRestricted, yTarget, betaRestXY);
  const rssUnrestXY = computeRSS(xUnrestricted, yTarget, betaUnrestXY);

  const p = lag; // number of additional parameters
  const dfResid = T - 2 * p - 1;
  if (dfResid <= 0) return null;

  const fXY = ((rssRestXY - rssUnrestXY) / p) / (rssUnrestXY / dfResid);

  // Compute F-statistic for Y→X
  const betaRestYX = olsSolve(xRestrictedYX, xTarget);
  const betaUnrestYX = olsSolve(xUnrestrictedYX, xTarget);
  if (!betaRestYX || !betaUnrestYX) return null;

  const rssRestYX = computeRSS(xRestrictedYX, xTarget, betaRestYX);
  const rssUnrestYX = computeRSS(xUnrestrictedYX, xTarget, betaUnrestYX);

  const fYX = ((rssRestYX - rssUnrestYX) / p) / (rssUnrestYX / dfResid);

  // Compute p-values
  const pValueXY = fDistPValue(Math.max(0, fXY), p, dfResid);
  const pValueYX = fDistPValue(Math.max(0, fYX), p, dfResid);

  // Determine direction
  const xyCausal = pValueXY < 0.10;
  const yxCausal = pValueYX < 0.10;

  let direction: GrangerResult['direction'];
  if (xyCausal && yxCausal) direction = 'bidirectional';
  else if (xyCausal) direction = 'x_causes_y';
  else if (yxCausal) direction = 'y_causes_x';
  else direction = 'none';

  // Assessment based on the stronger signal
  const minP = Math.min(pValueXY, pValueYX);
  const assessment = (xyCausal || yxCausal) ? assessFromPValue(minP) : null;

  return {
    direction,
    fStatisticXY: Math.max(0, fXY),
    fStatisticYX: Math.max(0, fYX),
    pValueXY: clamp(pValueXY, 0, 1),
    pValueYX: clamp(pValueYX, 0, 1),
    assessment,
    lagUsed: lag,
  };
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
