/**
 * health/sleep-architecture.ts
 *
 * Sleep architecture analysis engine. Computes detailed sleep quality metrics,
 * circadian regularity, and composite quality scores from Apple Health sleep data.
 *
 * Key analyses:
 *  - Per-session sleep architecture (efficiency, latency, WASO, stage distribution)
 *  - Composite quality score (0-100) based on clinical sleep targets
 *  - Circadian pattern analysis (regularity, social jet lag)
 *
 * @module
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SleepSession {
  date: string; // ISO date (YYYY-MM-DD)
  bedtime: string; // ISO datetime
  wakeTime: string; // ISO datetime
  stages?: {
    rem: number; // minutes
    deep: number; // minutes
    light: number; // minutes
    awake: number; // minutes
  };
  totalMinutes: number;
}

export interface SleepArchitectureMetrics {
  /** Percentage of time in bed spent asleep (0-100). */
  sleepEfficiency: number;
  /** Estimated minutes to fall asleep. */
  sleepLatency: number;
  /** Wake after sleep onset in minutes. */
  waso: number;

  /** Stage distribution as percentages of total sleep time. null when no stage data. */
  remPercent: number | null;
  deepPercent: number | null;
  lightPercent: number | null;
  awakePercent: number | null;

  /** Composite quality score (0-100). */
  qualityScore: number;
}

export interface CircadianMetrics {
  /** Average bedtime as HH:MM (24h). */
  averageBedtime: string;
  /** Average wake time as HH:MM (24h). */
  averageWakeTime: string;
  /** Standard deviation of bedtime in minutes. */
  bedtimeVariability: number;
  /** Standard deviation of wake time in minutes. */
  wakeTimeVariability: number;
  /** Regularity score (0-100, higher = more regular). */
  regularityScore: number;
  /** Social jet lag: difference between weekend and weekday midpoint of sleep, in minutes. */
  socialJetLag: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the minutes-since-midnight from an ISO datetime string.
 * For times after midnight but before a cutoff (e.g. 04:00), we add 24*60
 * to keep bedtime math continuous across midnight.
 */
function minutesSinceMidnight(iso: string, wrapAfterMidnight = false): number {
  const d = new Date(iso);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const total = h * 60 + m;
  // If wrapping is enabled, treat 00:00-05:59 as 24:00-29:59
  // so that bedtimes like 23:30 and 00:30 are close together.
  if (wrapAfterMidnight && total < 360) {
    return total + 1440;
  }
  return total;
}

function formatMinutesAsHHMM(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = Math.round(wrapped % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map((v) => (v - avg) ** 2);
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

/**
 * Clamp a value between min and max.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ---------------------------------------------------------------------------
// Per-session analysis
// ---------------------------------------------------------------------------

/**
 * Analyze a single sleep session and compute architecture metrics.
 *
 * When stage data is absent, stage percentages are null and the quality score
 * is computed from the metrics that are available (efficiency, latency, duration).
 */
export function analyzeSleepSession(session: SleepSession): SleepArchitectureMetrics {
  const bedtime = new Date(session.bedtime).getTime();
  const wakeTime = new Date(session.wakeTime).getTime();
  const timeInBedMinutes = (wakeTime - bedtime) / 60_000;

  // Compute stage percentages and WASO
  let remPercent: number | null = null;
  let deepPercent: number | null = null;
  let lightPercent: number | null = null;
  let awakePercent: number | null = null;
  let waso = 0;
  let sleepLatency = 0;

  if (session.stages) {
    const { rem, deep, light, awake } = session.stages;
    const totalStageMinutes = rem + deep + light + awake;

    if (totalStageMinutes > 0) {
      remPercent = (rem / totalStageMinutes) * 100;
      deepPercent = (deep / totalStageMinutes) * 100;
      lightPercent = (light / totalStageMinutes) * 100;
      awakePercent = (awake / totalStageMinutes) * 100;
    }

    waso = awake;

    // Estimate sleep latency: difference between time in bed and tracked stage time
    const stageTrackedTime = rem + deep + light + awake;
    sleepLatency = Math.max(0, timeInBedMinutes - stageTrackedTime);
  } else {
    // Without stage data, estimate latency as difference between time in bed and reported totalMinutes
    sleepLatency = Math.max(0, timeInBedMinutes - session.totalMinutes);
  }

  // Sleep efficiency: actual sleep / time in bed
  const actualSleepMinutes = session.stages
    ? session.stages.rem + session.stages.deep + session.stages.light
    : session.totalMinutes;
  const sleepEfficiency = timeInBedMinutes > 0
    ? (actualSleepMinutes / timeInBedMinutes) * 100
    : 0;

  const metrics: SleepArchitectureMetrics = {
    sleepEfficiency: round2(clamp(sleepEfficiency, 0, 100)),
    sleepLatency: round2(sleepLatency),
    waso: round2(waso),
    remPercent: remPercent !== null ? round2(remPercent) : null,
    deepPercent: deepPercent !== null ? round2(deepPercent) : null,
    lightPercent: lightPercent !== null ? round2(lightPercent) : null,
    awakePercent: awakePercent !== null ? round2(awakePercent) : null,
    qualityScore: 0, // computed below
  };

  metrics.qualityScore = computeSleepQualityScore(metrics, session.totalMinutes);
  return metrics;
}

// ---------------------------------------------------------------------------
// Quality score
// ---------------------------------------------------------------------------

/**
 * Compute a composite sleep quality score (0-100) based on clinical targets.
 *
 * Scoring weights:
 *  - Sleep efficiency (target >= 85%): 25%
 *  - Deep sleep % (target 15-20%): 20%
 *  - REM sleep % (target 20-25%): 20%
 *  - WASO (target < 30 min): 15%
 *  - Sleep latency (target < 20 min): 10%
 *  - Duration (target 420-540 min / 7-9h): 10%
 */
export function computeSleepQualityScore(
  metrics: SleepArchitectureMetrics,
  totalMinutes?: number,
): number {
  // Efficiency: 85%+ = full score, linear ramp from 50% to 85%
  const effScore = clamp((metrics.sleepEfficiency - 50) / (85 - 50), 0, 1);

  // WASO: 0 min = perfect, >60 min = 0
  const wasoScore = clamp(1 - metrics.waso / 60, 0, 1);

  // Latency: <10 min = perfect, >40 min = 0
  const latencyScore = clamp(1 - (metrics.sleepLatency - 10) / 30, 0, 1);

  // Duration: 420-540 min (7-9h) = perfect, <300 or >660 = 0
  let durationScore = 1;
  if (totalMinutes !== undefined) {
    if (totalMinutes >= 420 && totalMinutes <= 540) {
      durationScore = 1;
    } else if (totalMinutes < 420) {
      durationScore = clamp((totalMinutes - 180) / (420 - 180), 0, 1);
    } else {
      durationScore = clamp(1 - (totalMinutes - 540) / (660 - 540), 0, 1);
    }
  }

  // Stage-based scores (only if stage data is available)
  let deepScore = 0.5; // neutral default when no data
  let remScore = 0.5;

  if (metrics.deepPercent !== null) {
    // Deep sleep: 15-20% is ideal. Score based on how close to that range.
    if (metrics.deepPercent >= 15 && metrics.deepPercent <= 25) {
      deepScore = 1;
    } else if (metrics.deepPercent < 15) {
      deepScore = clamp(metrics.deepPercent / 15, 0, 1);
    } else {
      deepScore = clamp(1 - (metrics.deepPercent - 25) / 15, 0, 1);
    }
  }

  if (metrics.remPercent !== null) {
    // REM: 20-25% is ideal.
    if (metrics.remPercent >= 20 && metrics.remPercent <= 30) {
      remScore = 1;
    } else if (metrics.remPercent < 20) {
      remScore = clamp(metrics.remPercent / 20, 0, 1);
    } else {
      remScore = clamp(1 - (metrics.remPercent - 30) / 15, 0, 1);
    }
  }

  // Weighted combination
  const hasStages = metrics.deepPercent !== null;
  let score: number;

  if (hasStages) {
    score =
      effScore * 25 +
      deepScore * 20 +
      remScore * 20 +
      wasoScore * 15 +
      latencyScore * 10 +
      durationScore * 10;
  } else {
    // Without stage data, redistribute stage weights to other factors
    score =
      effScore * 35 +
      wasoScore * 25 +
      latencyScore * 20 +
      durationScore * 20;
  }

  return round2(clamp(score, 0, 100));
}

// ---------------------------------------------------------------------------
// Circadian analysis
// ---------------------------------------------------------------------------

/**
 * Analyze circadian regularity over multiple sleep sessions (ideally 7+ days).
 *
 * Computes average bed/wake times, variability, regularity score, and social
 * jet lag (weekend vs weekday midpoint-of-sleep difference).
 */
export function analyzeCircadianPattern(sessions: SleepSession[]): CircadianMetrics {
  if (sessions.length === 0) {
    return {
      averageBedtime: '00:00',
      averageWakeTime: '00:00',
      bedtimeVariability: 0,
      wakeTimeVariability: 0,
      regularityScore: 0,
      socialJetLag: 0,
    };
  }

  // Extract bedtime and wake time as minutes-since-midnight
  // Wrap bedtimes after midnight to keep them continuous with late-night bedtimes
  const bedtimeMinutes = sessions.map((s) => minutesSinceMidnight(s.bedtime, true));
  const wakeMinutes = sessions.map((s) => minutesSinceMidnight(s.wakeTime, false));

  const avgBedtime = mean(bedtimeMinutes);
  const avgWakeTime = mean(wakeMinutes);
  const bedtimeVar = stddev(bedtimeMinutes);
  const wakeTimeVar = stddev(wakeMinutes);

  // Regularity score: based on variability (lower variability = higher score)
  // Perfect regularity (0 min variability) = 100
  // 120+ min variability = 0
  const combinedVar = (bedtimeVar + wakeTimeVar) / 2;
  const regularityScore = round2(clamp((1 - combinedVar / 120) * 100, 0, 100));

  // Social jet lag: difference between weekend and weekday sleep midpoints
  const weekdaySessions: SleepSession[] = [];
  const weekendSessions: SleepSession[] = [];

  for (const s of sessions) {
    const day = new Date(s.date).getDay();
    // 0 = Sunday, 6 = Saturday — weekend nights are Fri (5) and Sat (6)
    // But the "date" is the night of sleep. A Friday-night session has date = Friday.
    // We consider the date's day-of-week: 0=Sun, 5=Fri, 6=Sat as weekend-ish.
    if (day === 0 || day === 5 || day === 6) {
      weekendSessions.push(s);
    } else {
      weekdaySessions.push(s);
    }
  }

  let socialJetLag = 0;
  if (weekdaySessions.length > 0 && weekendSessions.length > 0) {
    const weekdayMidpoints = weekdaySessions.map((s) => {
      const bed = minutesSinceMidnight(s.bedtime, true);
      const wake = minutesSinceMidnight(s.wakeTime, false);
      // Wake is next day, so add 1440 if wake < bed
      const adjustedWake = wake < bed ? wake + 1440 : wake;
      return (bed + adjustedWake) / 2;
    });
    const weekendMidpoints = weekendSessions.map((s) => {
      const bed = minutesSinceMidnight(s.bedtime, true);
      const wake = minutesSinceMidnight(s.wakeTime, false);
      const adjustedWake = wake < bed ? wake + 1440 : wake;
      return (bed + adjustedWake) / 2;
    });

    socialJetLag = Math.abs(mean(weekendMidpoints) - mean(weekdayMidpoints));
  }

  return {
    averageBedtime: formatMinutesAsHHMM(avgBedtime),
    averageWakeTime: formatMinutesAsHHMM(avgWakeTime),
    bedtimeVariability: round2(bedtimeVar),
    wakeTimeVariability: round2(wakeTimeVar),
    regularityScore,
    socialJetLag: round2(socialJetLag),
  };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
