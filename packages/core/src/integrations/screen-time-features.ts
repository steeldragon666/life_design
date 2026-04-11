import type { ScreenTimeEntry } from '../connectors/screen-time';

export interface ScreenTimeFeatures {
  totalDailyMinutes: number;
  socialMediaRatio: number;        // 0-1
  productivityRatio: number;       // 0-1
  lateNightUsageMinutes: number;
  avgPickupsPerDay: number;
  digitalWellnessScore: number;    // 1-5 (higher = healthier usage)
}

/**
 * Extract digital phenotyping features from screen time entries.
 *
 * Digital wellness score is inversely related to total time, social media ratio,
 * and late night usage:
 *   Score 5 = <2h total, minimal social, no late night
 *   Score 1 = >6h total, high social media, heavy late night
 */
export function extractScreenTimeFeatures(entries: ScreenTimeEntry[]): ScreenTimeFeatures | null {
  if (entries.length === 0) return null;

  const totalDailyMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0);

  const socialMediaMinutes = entries
    .filter((e) => e.appCategory === 'social_media')
    .reduce((sum, e) => sum + e.durationMinutes, 0);

  const productivityMinutes = entries
    .filter((e) => e.appCategory === 'productivity')
    .reduce((sum, e) => sum + e.durationMinutes, 0);

  const socialMediaRatio = totalDailyMinutes > 0 ? socialMediaMinutes / totalDailyMinutes : 0;
  const productivityRatio = totalDailyMinutes > 0 ? productivityMinutes / totalDailyMinutes : 0;

  // Late night = entries with lastUseTime at or after 22:00
  const lateNightUsageMinutes = entries
    .filter((e) => isLateNight(e.lastUseTime))
    .reduce((sum, e) => sum + e.durationMinutes, 0);

  const avgPickupsPerDay = entries.reduce((sum, e) => sum + e.pickupCount, 0) / entries.length;

  const digitalWellnessScore = computeWellnessScore(
    totalDailyMinutes,
    socialMediaRatio,
    lateNightUsageMinutes,
  );

  return {
    totalDailyMinutes,
    socialMediaRatio,
    productivityRatio,
    lateNightUsageMinutes,
    avgPickupsPerDay,
    digitalWellnessScore,
  };
}

/**
 * Check if a time string (HH:mm) is at or after 22:00 (or before 05:00 for next-day usage).
 */
function isLateNight(time: string): boolean {
  const [hours] = time.split(':').map(Number);
  return hours >= 22 || hours < 5;
}

/**
 * Compute a 1-5 wellness score inversely proportional to unhealthy patterns.
 *
 * Three penalty dimensions (each 0-1, higher = worse):
 *   - Total time: 0 at <=120min, 1 at >=360min
 *   - Social media ratio: direct 0-1
 *   - Late night: 0 at 0min, 1 at >=60min
 *
 * Combined penalty averaged and mapped: score = 5 - 4 * avgPenalty, clamped to [1, 5].
 */
function computeWellnessScore(
  totalMinutes: number,
  socialMediaRatio: number,
  lateNightMinutes: number,
): number {
  const timePenalty = clamp01((totalMinutes - 120) / (360 - 120));
  const socialPenalty = clamp01(socialMediaRatio);
  const lateNightPenalty = clamp01(lateNightMinutes / 60);

  const avgPenalty = (timePenalty + socialPenalty + lateNightPenalty) / 3;
  const raw = 5 - 4 * avgPenalty;

  // Round to 1 decimal place and clamp
  return Math.round(Math.max(1, Math.min(5, raw)) * 10) / 10;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
