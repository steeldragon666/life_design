import { describe, it, expect } from 'vitest';
import {
  computeExerciseMoodLag,
  type ExerciseSession,
  type MoodEntry,
} from '../strava-mood';

function exercise(date: string, intensityScore: number, type = 'Run'): ExerciseSession {
  return { date, type, durationMinutes: 30, intensityScore, distanceKm: 5 };
}

function mood(date: string, moodValue: number): MoodEntry {
  return { date, mood: moodValue };
}

describe('computeExerciseMoodLag', () => {
  it('returns empty array for empty input', () => {
    expect(computeExerciseMoodLag([], [], 3)).toEqual([]);
  });

  it('returns empty array when exercises is empty but moods is not', () => {
    const moods = [mood('2024-01-01', 4), mood('2024-01-02', 3)];
    expect(computeExerciseMoodLag([], moods, 3)).toEqual([]);
  });

  it('returns empty array when moods is empty but exercises is not', () => {
    const exercises = [exercise('2024-01-01', 0.8), exercise('2024-01-02', 0.5)];
    expect(computeExerciseMoodLag(exercises, [], 3)).toEqual([]);
  });

  it('returns empty array when not enough pairs for any lag', () => {
    const exercises = [exercise('2024-01-01', 0.8)];
    const moods = [mood('2024-01-01', 4)];
    // Only 1 pair per lag, need at least 2 for Pearson correlation
    const result = computeExerciseMoodLag(exercises, moods, 3);
    // All correlations should have sampleSize < 2 so we get results but correlation = 0
    for (const r of result) {
      expect(r.correlation).toBe(0);
      expect(r.sampleSize).toBeLessThan(2);
    }
  });

  it('detects positive lag-1 correlation when exercise improves mood next day', () => {
    // Higher exercise intensity on day D -> higher mood on D+1
    const exercises = [
      exercise('2024-01-01', 0.9),
      exercise('2024-01-02', 0.1),
      exercise('2024-01-03', 0.8),
      exercise('2024-01-04', 0.2),
      exercise('2024-01-05', 0.7),
      exercise('2024-01-06', 0.3),
      exercise('2024-01-07', 0.9),
      exercise('2024-01-08', 0.1),
    ];
    const moods = [
      mood('2024-01-01', 3),
      mood('2024-01-02', 5), // after high exercise
      mood('2024-01-03', 2), // after low exercise
      mood('2024-01-04', 4), // after high exercise
      mood('2024-01-05', 2), // after low exercise
      mood('2024-01-06', 4), // after high exercise
      mood('2024-01-07', 2), // after low exercise
      mood('2024-01-08', 5), // after high exercise
      mood('2024-01-09', 1), // after low exercise
    ];

    const result = computeExerciseMoodLag(exercises, moods, 2);
    const lag1 = result.find((r) => r.lagDays === 1);
    expect(lag1).toBeDefined();
    expect(lag1!.correlation).toBeGreaterThan(0.5);
  });

  it('returns near-zero correlation for unrelated data', () => {
    // Random-ish exercise intensities with no mood pattern
    const exercises = [
      exercise('2024-01-01', 0.5),
      exercise('2024-01-02', 0.6),
      exercise('2024-01-03', 0.4),
      exercise('2024-01-04', 0.7),
      exercise('2024-01-05', 0.3),
      exercise('2024-01-06', 0.5),
      exercise('2024-01-07', 0.6),
      exercise('2024-01-08', 0.4),
    ];
    const moods = [
      mood('2024-01-01', 3),
      mood('2024-01-02', 3),
      mood('2024-01-03', 3),
      mood('2024-01-04', 3),
      mood('2024-01-05', 3),
      mood('2024-01-06', 3),
      mood('2024-01-07', 3),
      mood('2024-01-08', 3),
    ];

    const result = computeExerciseMoodLag(exercises, moods, 2);
    for (const r of result) {
      expect(Math.abs(r.correlation)).toBeLessThan(0.3);
    }
  });

  it('respects maxLag parameter and returns maxLag+1 results', () => {
    const exercises = [
      exercise('2024-01-01', 0.5),
      exercise('2024-01-02', 0.6),
      exercise('2024-01-03', 0.7),
    ];
    const moods = [
      mood('2024-01-01', 3),
      mood('2024-01-02', 4),
      mood('2024-01-03', 5),
      mood('2024-01-04', 3),
      mood('2024-01-05', 4),
    ];

    const result2 = computeExerciseMoodLag(exercises, moods, 2);
    expect(result2).toHaveLength(3); // lag 0, 1, 2

    const result4 = computeExerciseMoodLag(exercises, moods, 4);
    expect(result4).toHaveLength(5); // lag 0, 1, 2, 3, 4

    // Verify lag values
    expect(result2.map((r) => r.lagDays)).toEqual([0, 1, 2]);
  });

  it('marks small samples as not significant', () => {
    const exercises = [
      exercise('2024-01-01', 0.9),
      exercise('2024-01-02', 0.1),
      exercise('2024-01-03', 0.8),
    ];
    const moods = [
      mood('2024-01-01', 5),
      mood('2024-01-02', 1),
      mood('2024-01-03', 4),
    ];

    const result = computeExerciseMoodLag(exercises, moods, 1);
    for (const r of result) {
      // With only 2-3 data points, should not be significant
      expect(r.significant).toBe(false);
    }
  });

  it('handles multiple exercise types correctly', () => {
    const exercises = [
      exercise('2024-01-01', 0.9, 'Run'),
      exercise('2024-01-02', 0.1, 'Ride'),
      exercise('2024-01-03', 0.8, 'Walk'),
      exercise('2024-01-04', 0.2, 'Run'),
      exercise('2024-01-05', 0.7, 'Ride'),
    ];
    const moods = [
      mood('2024-01-01', 4),
      mood('2024-01-02', 5),
      mood('2024-01-03', 2),
      mood('2024-01-04', 4),
      mood('2024-01-05', 2),
    ];

    // Should not throw and should produce results regardless of exercise type
    const result = computeExerciseMoodLag(exercises, moods, 1);
    expect(result).toHaveLength(2);
    expect(result[0].lagDays).toBe(0);
    expect(result[1].lagDays).toBe(1);
  });

  it('handles gaps in dates correctly', () => {
    // Exercise only on some days, mood on other days
    const exercises = [
      exercise('2024-01-01', 0.9),
      exercise('2024-01-03', 0.1), // gap on Jan 2
      exercise('2024-01-05', 0.8),
    ];
    const moods = [
      mood('2024-01-01', 3),
      mood('2024-01-02', 5),
      mood('2024-01-03', 3),
      mood('2024-01-04', 2),
      mood('2024-01-05', 3),
      mood('2024-01-06', 4),
    ];

    const result = computeExerciseMoodLag(exercises, moods, 1);
    expect(result).toHaveLength(2);
    // Should only pair dates where both exercise and mood+lag exist
    expect(result[0].sampleSize).toBeGreaterThanOrEqual(2);
  });
});
