import type { ScreenTimeFeatures } from '../integrations/screen-time-features';

export interface DigitalPhenotype {
  // Usage patterns
  averageDailyMinutes: number;
  averagePickupsPerDay: number;
  lateNightFrequency: number; // 0-1, fraction of days with >30min late-night usage

  // App category distribution
  categoryDistribution: Record<string, number>; // category -> fraction (0-1)
  dominantCategory: string;

  // Behavioral indicators
  compulsiveUseScore: number; // 0-100, based on pickup frequency + session fragmentation
  socialMediaDependenceScore: number; // 0-100, based on social media ratio + late-night social
  circadianDisruptionScore: number; // 0-100, based on late-night usage patterns

  // Trend
  usageTrend: 'increasing' | 'stable' | 'decreasing';

  // JITAI-relevant flags
  highCompulsiveUse: boolean; // compulsiveUseScore > 60
  socialMediaConcern: boolean; // socialMediaDependenceScore > 50
  sleepDisruptionRisk: boolean; // circadianDisruptionScore > 40
}

/**
 * Compute a digital phenotype from multi-day screen time features.
 * Requires at least 3 days of data; returns null otherwise.
 */
export function computeDigitalPhenotype(
  dailyFeatures: ScreenTimeFeatures[],
  dates: string[],
): DigitalPhenotype | null {
  if (dailyFeatures.length < 3 || dates.length < 3) {
    return null;
  }

  const n = dailyFeatures.length;

  // Average daily minutes
  const averageDailyMinutes =
    dailyFeatures.reduce((sum, f) => sum + f.totalDailyMinutes, 0) / n;

  // Average pickups per day
  const averagePickupsPerDay =
    dailyFeatures.reduce((sum, f) => sum + f.avgPickupsPerDay, 0) / n;

  // Late-night frequency: fraction of days with > 30min late-night usage
  const lateNightDays = dailyFeatures.filter(
    (f) => f.lateNightUsageMinutes > 30,
  ).length;
  const lateNightFrequency = lateNightDays / n;

  // Category distribution
  const avgSocialRatio =
    dailyFeatures.reduce((sum, f) => sum + f.socialMediaRatio, 0) / n;
  const avgProductivityRatio =
    dailyFeatures.reduce((sum, f) => sum + f.productivityRatio, 0) / n;
  const otherRatio = Math.max(0, 1 - avgSocialRatio - avgProductivityRatio);

  const categoryDistribution: Record<string, number> = {
    social_media: avgSocialRatio,
    productivity: avgProductivityRatio,
    other: otherRatio,
  };

  // Dominant category
  const dominantCategory = Object.entries(categoryDistribution).reduce(
    (best, [cat, ratio]) => (ratio > best[1] ? [cat, ratio] : best),
    ['other', -1] as [string, number],
  )[0];

  // Compulsive use score (0-100)
  // Based on pickup frequency (main driver) and total time
  // High pickups relative to time = fragmented, compulsive checking
  const pickupScore = clamp100((averagePickupsPerDay / 100) * 60); // 100 pickups/day -> 60 points
  const timeScore = clamp100(((averageDailyMinutes - 120) / 300) * 40); // >120min adds up to 40 points
  const compulsiveUseScore = Math.round(clamp100(pickupScore + timeScore));

  // Social media dependence score (0-100)
  // Based on social media ratio and late-night social usage
  const socialRatioScore = clamp100(avgSocialRatio * 100); // direct mapping
  const avgLateNight =
    dailyFeatures.reduce((sum, f) => sum + f.lateNightUsageMinutes, 0) / n;
  const lateNightSocialBonus = clamp100(
    (avgLateNight / 60) * avgSocialRatio * 50,
  );
  const socialMediaDependenceScore = Math.round(
    clamp100(socialRatioScore * 0.7 + lateNightSocialBonus + lateNightFrequency * 20),
  );

  // Circadian disruption score (0-100)
  // Based on average late-night minutes and frequency
  const avgLateNightMinutes = avgLateNight;
  const minutesComponent = clamp100((avgLateNightMinutes / 90) * 70); // 90min -> 70 points
  const frequencyComponent = lateNightFrequency * 30; // full frequency -> 30 points
  const circadianDisruptionScore = Math.round(
    clamp100(minutesComponent + frequencyComponent),
  );

  // Usage trend: compare first half vs second half average
  const mid = Math.floor(n / 2);
  const firstHalfAvg =
    dailyFeatures.slice(0, mid).reduce((s, f) => s + f.totalDailyMinutes, 0) /
    mid;
  const secondHalfAvg =
    dailyFeatures.slice(mid).reduce((s, f) => s + f.totalDailyMinutes, 0) /
    (n - mid);
  const trendDelta = secondHalfAvg - firstHalfAvg;
  const trendThreshold = averageDailyMinutes * 0.1; // 10% change threshold
  let usageTrend: 'increasing' | 'stable' | 'decreasing';
  if (trendDelta > trendThreshold) {
    usageTrend = 'increasing';
  } else if (trendDelta < -trendThreshold) {
    usageTrend = 'decreasing';
  } else {
    usageTrend = 'stable';
  }

  // JITAI flags
  const highCompulsiveUse = compulsiveUseScore > 60;
  const socialMediaConcern = socialMediaDependenceScore > 50;
  const sleepDisruptionRisk = circadianDisruptionScore > 40;

  return {
    averageDailyMinutes,
    averagePickupsPerDay,
    lateNightFrequency,
    categoryDistribution,
    dominantCategory,
    compulsiveUseScore,
    socialMediaDependenceScore,
    circadianDisruptionScore,
    usageTrend,
    highCompulsiveUse,
    socialMediaConcern,
    sleepDisruptionRisk,
  };
}

/**
 * Generate a human-readable insight from a digital phenotype.
 */
export function generateScreenTimeInsight(phenotype: DigitalPhenotype): string {
  const parts: string[] = [];

  // Overall usage summary
  const hours = (phenotype.averageDailyMinutes / 60).toFixed(1);
  parts.push(
    `Your average daily screen time is ${hours} hours, mostly ${formatCategory(phenotype.dominantCategory)}.`,
  );

  // Trend
  if (phenotype.usageTrend === 'increasing') {
    parts.push('Your usage has been trending upward recently.');
  } else if (phenotype.usageTrend === 'decreasing') {
    parts.push('Your usage has been trending downward — nice progress.');
  }

  // Concerns
  if (phenotype.sleepDisruptionRisk) {
    const pct = Math.round(phenotype.lateNightFrequency * 100);
    parts.push(
      `Late-night phone use on ${pct}% of days may be affecting your sleep.`,
    );
  }

  if (phenotype.socialMediaConcern) {
    const pct = Math.round(
      (phenotype.categoryDistribution['social_media'] ?? 0) * 100,
    );
    parts.push(
      `Social media accounts for ${pct}% of your screen time, which is above recommended levels.`,
    );
  }

  if (phenotype.highCompulsiveUse) {
    parts.push(
      `You're picking up your phone about ${Math.round(phenotype.averagePickupsPerDay)} times per day, suggesting frequent checking behavior.`,
    );
  }

  // If no concerns, give positive feedback
  if (
    !phenotype.sleepDisruptionRisk &&
    !phenotype.socialMediaConcern &&
    !phenotype.highCompulsiveUse
  ) {
    parts.push('Your digital habits look well-balanced.');
  }

  return parts.join(' ');
}

function formatCategory(category: string): string {
  return category.replace(/_/g, ' ');
}

function clamp100(value: number): number {
  return Math.max(0, Math.min(100, value));
}
