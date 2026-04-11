import { pearsonCorrelation } from '../correlation';

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
  if (exercises.length === 0 && moods.length === 0) return [];

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

    results.push({
      lagDays: lag,
      correlation,
      sampleSize,
      significant,
    });
  }

  return results;
}
