import { describe, it, expect } from 'vitest';
import {
  Dimension,
  DurationType,
  ALL_DIMENSIONS,
  validateCheckIn,
  validateDimensionScores,
  computeOverallScore,
  computeDimensionAverage,
  computeStreak,
} from '@life-design/core';

describe('Check-in flow integration', () => {
  const today = '2025-06-15';

  describe('validation pipeline', () => {
    it('validates a complete quick check-in', () => {
      const checkin = {
        user_id: 'user-1',
        date: today,
        mood: 7,
        duration_type: DurationType.Quick,
      };
      const scores = ALL_DIMENSIONS.map((dim) => ({
        dimension: dim,
        score: 5,
      }));

      const checkinResult = validateCheckIn(checkin);
      const scoresResult = validateDimensionScores(scores);

      expect(checkinResult.valid).toBe(true);
      expect(scoresResult.valid).toBe(true);
    });

    it('validates a complete deep check-in with notes', () => {
      const checkin = {
        user_id: 'user-1',
        date: today,
        mood: 9,
        duration_type: DurationType.Deep,
      };
      const scores = ALL_DIMENSIONS.map((dim) => ({
        dimension: dim,
        score: Math.floor(Math.random() * 10) + 1,
        note: `Note for ${dim}`,
      }));

      const checkinResult = validateCheckIn(checkin);
      const scoresResult = validateDimensionScores(scores);

      expect(checkinResult.valid).toBe(true);
      expect(scoresResult.valid).toBe(true);
    });

    it('rejects invalid mood', () => {
      const result = validateCheckIn({
        user_id: 'user-1',
        date: today,
        mood: 0,
        duration_type: DurationType.Quick,
      });
      expect(result.valid).toBe(false);
    });

    it('rejects invalid date', () => {
      const result = validateCheckIn({
        user_id: 'user-1',
        date: 'not-a-date',
        mood: 5,
        duration_type: DurationType.Quick,
      });
      expect(result.valid).toBe(false);
    });

    it('rejects duplicate dimensions', () => {
      const scores = [
        { dimension: Dimension.Career, score: 5 },
        { dimension: Dimension.Career, score: 8 },
      ];
      const result = validateDimensionScores(scores);
      expect(result.valid).toBe(false);
    });
  });

  describe('scoring pipeline', () => {
    it('computes overall score from dimension scores', () => {
      const scores = [
        { dimension: Dimension.Career, score: 8 },
        { dimension: Dimension.Finance, score: 6 },
        { dimension: Dimension.Health, score: 7 },
        { dimension: Dimension.Fitness, score: 5 },
        { dimension: Dimension.Family, score: 9 },
        { dimension: Dimension.Social, score: 4 },
        { dimension: Dimension.Romance, score: 6 },
        { dimension: Dimension.Growth, score: 8 },
      ];

      const overall = computeOverallScore(scores);
      expect(overall).toBeCloseTo(6.625);
    });

    it('computes dimension average over multiple check-ins', () => {
      const careerScores = [8, 7, 9, 6, 8];
      const avg = computeDimensionAverage(careerScores);
      expect(avg).toBeCloseTo(7.6);
    });

    it('computes streak from consecutive check-in dates', () => {
      const dates = [
        '2025-06-15',
        '2025-06-14',
        '2025-06-13',
        '2025-06-12',
        '2025-06-10', // gap
      ];
      const streak = computeStreak(dates, '2025-06-15');
      expect(streak).toBe(4);
    });

    it('returns 0 streak when no check-in today', () => {
      const dates = ['2025-06-14', '2025-06-13'];
      const streak = computeStreak(dates, '2025-06-15');
      expect(streak).toBe(0);
    });
  });

  describe('end-to-end data shape', () => {
    it('produces the shape expected by the service layer', () => {
      const formOutput = {
        user_id: 'user-1',
        date: today,
        mood: 7,
        durationType: DurationType.Quick,
        scores: ALL_DIMENSIONS.map((dim, i) => ({
          dimension: dim,
          score: (i % 10) + 1,
        })),
      };

      const checkinValid = validateCheckIn({
        user_id: formOutput.user_id,
        date: formOutput.date,
        mood: formOutput.mood,
        duration_type: formOutput.durationType,
      });
      const scoresValid = validateDimensionScores(formOutput.scores);

      expect(checkinValid.valid).toBe(true);
      expect(scoresValid.valid).toBe(true);
      expect(formOutput.scores).toHaveLength(8);

      const overall = computeOverallScore(formOutput.scores);
      expect(overall).toBeGreaterThan(0);
      expect(overall).toBeLessThanOrEqual(10);
    });
  });
});
