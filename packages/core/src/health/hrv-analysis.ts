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

export interface HRVMetrics {
  rmssd: number;     // Root mean square of successive differences (ms)
  sdnn: number;      // Standard deviation of NN intervals (ms)
  meanRR: number;    // Mean RR interval (ms)
  meanHR: number;    // Mean heart rate (bpm)
  stressLevel: 'low' | 'moderate' | 'high';
  stressScore: number; // 0-100 (higher = more stressed)
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
  const stressScore = Math.max(0, Math.min(100, Math.round(100 * (1 - rmssd / 100))));

  return {
    rmssd: Math.round(rmssd * 100) / 100,
    sdnn: Math.round(sdnn * 100) / 100,
    meanRR: Math.round(meanRR * 100) / 100,
    meanHR: Math.round(meanHR * 100) / 100,
    stressLevel,
    stressScore,
  };
}
