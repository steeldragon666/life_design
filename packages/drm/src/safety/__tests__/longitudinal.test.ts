import { assessLongitudinalRisk } from '../longitudinal';
import type { LongitudinalParams } from '../longitudinal';

// Helper: create a Date N days ago from now
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// Helper: create a Date N days ago from a reference date
function daysAgoBefore(referenceMs: number, days: number): Date {
  return new Date(referenceMs - days * 24 * 60 * 60 * 1000);
}

describe('assessLongitudinalRisk', () => {
  describe('worsening PHQ-9 trend', () => {
    it('flags PHQ-9 when slope exceeds threshold', () => {
      // Scores increasing steeply over ~3.5 weeks (positive slope > 0.5 pts/week)
      const now = Date.now();
      const params: LongitudinalParams = {
        userId: 'user-1',
        phq9Scores: [
          { score: 5, date: daysAgoBefore(now, 28) },
          { score: 8, date: daysAgoBefore(now, 21) },
          { score: 11, date: daysAgoBefore(now, 14) },
          { score: 15, date: daysAgoBefore(now, 7) },
        ],
        sessionTimestamps: [],
        emotionalValences: [],
        baselineSessionFrequency: 0,
      };

      const result = assessLongitudinalRisk(params);
      const phq9Flag = result.tier2Flags.some((f) => f.includes('PHQ-9'));
      expect(phq9Flag).toBe(true);
    });

    it('returns a non-null phq9Trend when sufficient data is provided', () => {
      const now = Date.now();
      const params: LongitudinalParams = {
        userId: 'user-2',
        phq9Scores: [
          { score: 4, date: daysAgoBefore(now, 20) },
          { score: 9, date: daysAgoBefore(now, 10) },
        ],
        sessionTimestamps: [],
        emotionalValences: [],
        baselineSessionFrequency: 0,
      };

      const result = assessLongitudinalRisk(params);
      expect(result.phq9Trend).not.toBeNull();
      expect(result.phq9Trend?.slope).toBeDefined();
    });
  });

  describe('improving PHQ-9 trend', () => {
    it('does not flag PHQ-9 when scores are improving (negative slope)', () => {
      const now = Date.now();
      const params: LongitudinalParams = {
        userId: 'user-3',
        phq9Scores: [
          { score: 20, date: daysAgoBefore(now, 28) },
          { score: 15, date: daysAgoBefore(now, 21) },
          { score: 10, date: daysAgoBefore(now, 14) },
          { score: 5, date: daysAgoBefore(now, 7) },
        ],
        sessionTimestamps: [],
        emotionalValences: [],
        baselineSessionFrequency: 0,
      };

      const result = assessLongitudinalRisk(params);
      const phq9Flag = result.tier2Flags.some((f) => f.includes('PHQ-9'));
      expect(phq9Flag).toBe(false);
    });
  });

  describe('insufficient data', () => {
    it('returns null phq9Trend when fewer than 2 data points', () => {
      const params: LongitudinalParams = {
        userId: 'user-4',
        phq9Scores: [{ score: 10, date: daysAgo(5) }],
        sessionTimestamps: [],
        emotionalValences: [],
        baselineSessionFrequency: 0,
      };

      const result = assessLongitudinalRisk(params);
      expect(result.phq9Trend).toBeNull();
    });

    it('returns null emotionalValenceTrend with no valence data', () => {
      const params: LongitudinalParams = {
        userId: 'user-5',
        phq9Scores: [],
        sessionTimestamps: [],
        emotionalValences: [],
        baselineSessionFrequency: 1,
      };

      const result = assessLongitudinalRisk(params);
      expect(result.emotionalValenceTrend).toBeNull();
    });
  });

  describe('session frequency delta', () => {
    it('flags session withdrawal when frequency drops more than 50%', () => {
      // Baseline 2 sessions/week → expect 4 in last 2 weeks; give 0
      const now = Date.now();
      const params: LongitudinalParams = {
        userId: 'user-6',
        phq9Scores: [],
        // All sessions from more than 2 weeks ago
        sessionTimestamps: [
          daysAgoBefore(now, 30),
          daysAgoBefore(now, 35),
          daysAgoBefore(now, 40),
        ],
        emotionalValences: [],
        baselineSessionFrequency: 2,
      };

      const result = assessLongitudinalRisk(params);
      const sessionFlag = result.tier2Flags.some((f) => f.toLowerCase().includes('session'));
      expect(sessionFlag).toBe(true);
    });

    it('computes a negative sessionFrequencyDelta when below baseline', () => {
      const now = Date.now();
      const params: LongitudinalParams = {
        userId: 'user-7',
        phq9Scores: [],
        // 0 sessions in last 2 weeks
        sessionTimestamps: [daysAgoBefore(now, 20)],
        emotionalValences: [],
        baselineSessionFrequency: 3,
      };

      const result = assessLongitudinalRisk(params);
      expect(result.sessionFrequencyDelta).not.toBeNull();
      expect(result.sessionFrequencyDelta!).toBeLessThan(0);
    });

    it('returns null sessionFrequencyDelta when baseline is 0', () => {
      const params: LongitudinalParams = {
        userId: 'user-8',
        phq9Scores: [],
        sessionTimestamps: [daysAgo(1), daysAgo(2)],
        emotionalValences: [],
        baselineSessionFrequency: 0,
      };

      const result = assessLongitudinalRisk(params);
      expect(result.sessionFrequencyDelta).toBeNull();
    });
  });

  describe('recommendProfessional', () => {
    it('is true when two or more flags are raised', () => {
      const now = Date.now();
      // Trigger both PHQ-9 worsening AND session withdrawal
      const params: LongitudinalParams = {
        userId: 'user-9',
        phq9Scores: [
          { score: 5, date: daysAgoBefore(now, 28) },
          { score: 12, date: daysAgoBefore(now, 21) },
          { score: 18, date: daysAgoBefore(now, 14) },
          { score: 24, date: daysAgoBefore(now, 7) },
        ],
        sessionTimestamps: [daysAgoBefore(now, 60)],
        emotionalValences: [],
        baselineSessionFrequency: 3,
      };

      const result = assessLongitudinalRisk(params);
      expect(result.tier2Flags.length).toBeGreaterThanOrEqual(2);
      expect(result.recommendProfessional).toBe(true);
    });

    it('is false when no flags raised', () => {
      const params: LongitudinalParams = {
        userId: 'user-10',
        phq9Scores: [],
        sessionTimestamps: [],
        emotionalValences: [],
        baselineSessionFrequency: 0,
      };

      const result = assessLongitudinalRisk(params);
      expect(result.recommendProfessional).toBe(false);
    });
  });

  describe('output shape', () => {
    it('always includes required fields', () => {
      const params: LongitudinalParams = {
        userId: 'user-shape',
        phq9Scores: [],
        sessionTimestamps: [],
        emotionalValences: [],
        baselineSessionFrequency: 1,
      };

      const result = assessLongitudinalRisk(params);
      expect(result.userId).toBe('user-shape');
      expect(Array.isArray(result.tier2Flags)).toBe(true);
      expect(typeof result.recommendProfessional).toBe('boolean');
      expect(result.assessedAt).toBeInstanceOf(Date);
    });
  });
});
