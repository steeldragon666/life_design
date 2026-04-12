import { pearsonCorrelation, correlationConfidenceInterval } from '../correlation';

export interface ExerciseSession {
  date: string;           // YYYY-MM-DD
  type: string;           // 'Run', 'Ride', 'Walk', etc.
  durationMinutes: number;
  intensityScore: number; // 0-1 normalized
  distanceKm: number;
}

export interface MoodEntry {
  date: string;           // YYYY-MM-DD
  mood: number;           // 1-5
}

export interface ExerciseMoodCorrelation {
  lagDays: number;        // 0 = same day, 1 = next day, etc.
  correlation: number;    // -1 to 1
  sampleSize: number;
  significant: boolean;   // p < 0.05 approximation
  confidenceInterval: [number, number]; // [lower, upper] 95% CI
}

export interface ExerciseConsistencyMetrics {
  totalSessions: number;
  averageFrequencyPerWeek: number;
  consistencyScore: number;
  preferredExerciseType: string | null;
  averageDuration: number;
  bestLagForMood: ExerciseMoodCorrelation | null;
}

/**
 * Add `lagDays` days to a YYYY-MM-DD string and return the resulting YYYY-MM-DD.
 */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Compute exercise-mood correlation with configurable lag.
 * For each lag (0 to maxLag days), align exercise intensity with mood
 * measured `lag` days later and compute Pearson correlation.
 */
export function computeExerciseMoodLag(
  exercises: ExerciseSession[],
  moods: MoodEntry[],
  maxLag: number = 3,
): ExerciseMoodCorrelation[] {
  if (exercises.length === 0 || moods.length === 0) return [];

  // Build date-indexed maps
  const exerciseByDate = new Map<string, number>();
  for (const e of exercises) {
    // If multiple exercises on same day, take the max intensity
    const existing = exerciseByDate.get(e.date);
    if (existing === undefined || e.intensityScore > existing) {
      exerciseByDate.set(e.date, e.intensityScore);
    }
  }

  const moodByDate = new Map<string, number>();
  for (const m of moods) {
    moodByDate.set(m.date, m.mood);
  }

  const results: ExerciseMoodCorrelation[] = [];

  for (let lag = 0; lag <= maxLag; lag++) {
    // Pair exercise intensity on date D with mood on date D+lag
    const intensities: number[] = [];
    const moodValues: number[] = [];

    for (const [date, intensity] of exerciseByDate) {
      const moodDate = lag === 0 ? date : addDays(date, lag);
      const moodVal = moodByDate.get(moodDate);
      if (moodVal !== undefined) {
        intensities.push(intensity);
        moodValues.push(moodVal);
      }
    }

    const sampleSize = intensities.length;
    const correlation = pearsonCorrelation(intensities, moodValues);

    // Significance: |r| > 2/sqrt(n) as rough p<0.05 threshold
    const significant = sampleSize >= 4 && Math.abs(correlation) > 2 / Math.sqrt(sampleSize);

    const confidenceInterval = correlationConfidenceInterval(correlation, sampleSize);

    results.push({
      lagDays: lag,
      correlation,
      sampleSize,
      significant,
      confidenceInterval,
    });
  }

  return results;
}

/**
 * Get ISO week number for a date string.
 */
function getISOWeek(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00Z');
  const dayOfWeek = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Analyze exercise consistency over a time window.
 */
export function analyzeExerciseConsistency(
  exercises: ExerciseSession[],
  moods: MoodEntry[],
  windowDays: number,
): ExerciseConsistencyMetrics {
  const totalSessions = exercises.length;

  if (totalSessions === 0) {
    return {
      totalSessions: 0,
      averageFrequencyPerWeek: 0,
      consistencyScore: 0,
      preferredExerciseType: null,
      averageDuration: 0,
      bestLagForMood: null,
    };
  }

  const totalWeeks = windowDays / 7;
  const averageFrequencyPerWeek = totalSessions / totalWeeks;

  // Consistency: ratio of weeks with at least one exercise
  const weeksWithExercise = new Set(exercises.map((e) => getISOWeek(e.date)));
  const consistencyScore = weeksWithExercise.size / totalWeeks;

  // Preferred exercise type
  const typeCounts = new Map<string, number>();
  for (const e of exercises) {
    typeCounts.set(e.type, (typeCounts.get(e.type) || 0) + 1);
  }
  let preferredExerciseType: string | null = null;
  let maxCount = 0;
  for (const [type, count] of typeCounts) {
    if (count > maxCount) {
      maxCount = count;
      preferredExerciseType = type;
    }
  }

  // Average duration
  const averageDuration = exercises.reduce((sum, e) => sum + e.durationMinutes, 0) / totalSessions;

  // Best lag for mood
  const lagResults = computeExerciseMoodLag(exercises, moods, 3);
  let bestLagForMood: ExerciseMoodCorrelation | null = null;
  let bestAbsCorr = 0;
  for (const r of lagResults) {
    if (r.significant && Math.abs(r.correlation) > bestAbsCorr) {
      bestAbsCorr = Math.abs(r.correlation);
      bestLagForMood = r;
    }
  }

  return {
    totalSessions,
    averageFrequencyPerWeek,
    consistencyScore,
    preferredExerciseType,
    averageDuration,
    bestLagForMood,
  };
}

/**
 * Generate a human-readable insight from exercise consistency metrics.
 */
export function generateExerciseMoodInsight(metrics: ExerciseConsistencyMetrics): string {
  if (metrics.totalSessions === 0) {
    return 'No exercise sessions recorded in this period. Try adding some activities to see how they affect your mood.';
  }

  const freqStr = metrics.averageFrequencyPerWeek % 1 === 0
    ? metrics.averageFrequencyPerWeek.toString()
    : metrics.averageFrequencyPerWeek.toFixed(1);
  const consistencyPct = Math.round(metrics.consistencyScore * 100);

  let insight = `You exercised ${freqStr} times per week with ${consistencyPct}% weekly consistency.`;

  if (metrics.preferredExerciseType) {
    insight += ` Your preferred activity was ${metrics.preferredExerciseType}.`;
  }

  if (metrics.bestLagForMood && metrics.bestLagForMood.significant) {
    const lag = metrics.bestLagForMood.lagDays;
    if (lag === 0) {
      insight += ' Exercise correlated with improved mood on the same day.';
    } else if (lag === 1) {
      insight += ' Exercise correlated with improved mood the day after.';
    } else {
      insight += ` Exercise correlated with improved mood ${lag} days later.`;
    }
  }

  return insight;
}
