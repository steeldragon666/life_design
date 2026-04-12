/**
 * health/hrv-analysis.ts
 *
 * HRV (Heart Rate Variability) stress tracking and regulation analysis.
 *
 * Computes standard time-domain HRV metrics from RR interval data:
 *  - RMSSD: Root mean square of successive differences
 *  - SDNN: Standard deviation of all NN (RR) intervals
 *  - Mean RR and derived mean heart rate
 *  - Stress classification and score
 *
 * @module
 */

export interface RRInterval {
  timestamp: number; // epoch ms
  value: number;     // milliseconds between heartbeats
}

export interface FrequencyDomainMetrics {
  lfPower: number;      // Low frequency power (0.04-0.15 Hz) — sympathetic + parasympathetic
  hfPower: number;      // High frequency power (0.15-0.40 Hz) — parasympathetic
  lfHfRatio: number;    // LF/HF ratio — autonomic balance indicator
  totalPower: number;   // Total spectral power
}

export interface HRVMetrics {
  rmssd: number;     // Root mean square of successive differences (ms)
  sdnn: number;      // Standard deviation of NN intervals (ms)
  meanRR: number;    // Mean RR interval (ms)
  meanHR: number;    // Mean heart rate (bpm)
  stressLevel: 'low' | 'moderate' | 'high';
  stressScore: number; // 0-100 (higher = more stressed)
  frequencyDomain?: FrequencyDomainMetrics; // optional, computed when enough data
}

export interface HRVTrendPoint {
  date: string;           // YYYY-MM-DD
  rmssd: number;
  sdnn: number;
  stressScore: number;
  stressLevel: 'low' | 'moderate' | 'high';
}

export interface HRVTrend {
  points: HRVTrendPoint[];
  trendDirection: 'improving' | 'stable' | 'worsening';
  averageStressScore: number;
  baselineRMSSD: number;       // rolling 7-day average
}

/**
 * Compute HRV metrics from RR intervals.
 * RMSSD = sqrt(mean(successive_differences^2))
 * SDNN = stdev(all_intervals)
 * Stress classification based on RMSSD:
 *   - RMSSD >= 50ms -> low stress
 *   - 20ms <= RMSSD < 50ms -> moderate stress
 *   - RMSSD < 20ms -> high stress
 * Stress score: inversely proportional to RMSSD, clamped 0-100
 */
export function computeHRVMetrics(intervals: RRInterval[]): HRVMetrics | null {
  if (intervals.length < 2) return null;

  const values = intervals.map(i => i.value);

  // Mean RR
  const sum = values.reduce((a, b) => a + b, 0);
  const meanRR = sum / values.length;

  // SDNN (population standard deviation)
  const squaredDiffs = values.map(v => (v - meanRR) ** 2);
  const sdnn = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);

  // RMSSD
  let sumSquaredSuccessive = 0;
  for (let i = 1; i < values.length; i++) {
    sumSquaredSuccessive += (values[i] - values[i - 1]) ** 2;
  }
  const rmssd = Math.sqrt(sumSquaredSuccessive / (values.length - 1));

  // Mean HR
  const meanHR = meanRR > 0 ? 60000 / meanRR : 0;

  // Stress classification
  const stressLevel = rmssd >= 50 ? 'low' : rmssd >= 20 ? 'moderate' : 'high';

  // Stress score: 0-100, inversely proportional to RMSSD
  // RMSSD of 100ms -> score ~0, RMSSD of 0ms -> score 100
  const stressScore = Math.max(0, Math.min(100, Math.round(100 * Math.exp(-rmssd / 50))));

  const metrics: HRVMetrics = {
    rmssd: Math.round(rmssd * 100) / 100,
    sdnn: Math.round(sdnn * 100) / 100,
    meanRR: Math.round(meanRR * 100) / 100,
    meanHR: Math.round(meanHR * 100) / 100,
    stressLevel,
    stressScore,
  };

  // Attach frequency domain metrics when enough data is available
  const freqDomain = computeFrequencyDomainMetrics(intervals);
  if (freqDomain) {
    metrics.frequencyDomain = freqDomain;
  }

  return metrics;
}

/**
 * Compute frequency domain HRV metrics using SDNN/RMSSD proxy approach.
 *
 * Uses the ratio of SDNN to RMSSD as a proxy for LF/HF since SDNN captures
 * both LF+HF while RMSSD primarily reflects HF.
 * Formula: lfHfRatio ≈ (sdnn/rmssd)^2 - 1, clamped to >= 0
 *
 * Requires minimum 60 intervals (about 1 minute of data).
 * Returns null if insufficient data.
 */
export function computeFrequencyDomainMetrics(intervals: RRInterval[]): FrequencyDomainMetrics | null {
  if (intervals.length < 60) return null;

  const values = intervals.map(i => i.value);

  // Compute SDNN
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sdnn = Math.sqrt(values.map(v => (v - mean) ** 2).reduce((a, b) => a + b, 0) / values.length);

  // Compute RMSSD
  let sumSquaredSuccessive = 0;
  for (let i = 1; i < values.length; i++) {
    sumSquaredSuccessive += (values[i] - values[i - 1]) ** 2;
  }
  const rmssd = Math.sqrt(sumSquaredSuccessive / (values.length - 1));

  // Total power proxy: SDNN^2 (total variance)
  const totalVariance = sdnn ** 2;

  // HF power proxy: RMSSD^2 / 2 (successive-difference variance reflects HF)
  const hfPower = (rmssd ** 2) / 2;

  // LF power: remainder of total variance not accounted for by HF
  const lfPower = Math.max(0, totalVariance - hfPower);

  // LF/HF ratio: (sdnn/rmssd)^2 - 1, clamped to >= 0
  const lfHfRatio = rmssd > 0 ? Math.max(0, (sdnn / rmssd) ** 2 - 1) : 0;

  return {
    lfPower: Math.round(lfPower * 100) / 100,
    hfPower: Math.round(hfPower * 100) / 100,
    lfHfRatio: Math.round(lfHfRatio * 100) / 100,
    totalPower: Math.round((lfPower + hfPower) * 100) / 100,
  };
}

/**
 * Compute HRV trend from daily summaries.
 *
 * - Determines trend direction by comparing first-half vs second-half average stress scores.
 * - Calculates baselineRMSSD as mean of last 7 entries' RMSSD (or all if <7).
 * - Requires minimum 3 data points; throws if fewer are provided.
 */
export function computeHRVTrend(points: HRVTrendPoint[]): HRVTrend {
  if (points.length < 3) {
    throw new Error('computeHRVTrend requires at least 3 data points');
  }

  // Average stress score
  const totalStress = points.reduce((sum, p) => sum + p.stressScore, 0);
  const averageStressScore = Math.round(totalStress / points.length);

  // Baseline RMSSD: mean of last 7 (or all)
  const baselineEntries = points.slice(-7);
  const baselineRMSSD =
    Math.round(
      (baselineEntries.reduce((sum, p) => sum + p.rmssd, 0) / baselineEntries.length) * 100,
    ) / 100;

  // Trend direction: compare first-half vs second-half average stress
  const midpoint = Math.floor(points.length / 2);
  const firstHalf = points.slice(0, midpoint);
  const secondHalf = points.slice(midpoint);

  const firstHalfAvgStress =
    firstHalf.reduce((sum, p) => sum + p.stressScore, 0) / firstHalf.length;
  const secondHalfAvgStress =
    secondHalf.reduce((sum, p) => sum + p.stressScore, 0) / secondHalf.length;

  const diff = secondHalfAvgStress - firstHalfAvgStress;
  const threshold = 5; // require meaningful change

  let trendDirection: 'improving' | 'stable' | 'worsening';
  if (diff < -threshold) {
    trendDirection = 'improving'; // stress decreasing = improving
  } else if (diff > threshold) {
    trendDirection = 'worsening'; // stress increasing = worsening
  } else {
    trendDirection = 'stable';
  }

  return {
    points,
    trendDirection,
    averageStressScore,
    baselineRMSSD,
  };
}
