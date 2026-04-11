import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { JITAIContext, JITAIDecision } from '@life-design/core';
import { getTimeOfDay, runLocalJITAI } from '../jitai-inference';

// Spy wrapper: intercept calls to evaluateJITAIRules while preserving real behavior
const mockEvaluate = vi.fn<(ctx: JITAIContext) => JITAIDecision>();

vi.mock('@life-design/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@life-design/core')>();
  return {
    ...actual,
    evaluateJITAIRules: (ctx: JITAIContext) => {
      mockEvaluate(ctx);
      return actual.evaluateJITAIRules(ctx);
    },
  };
});

describe('jitai-inference', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockEvaluate.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getTimeOfDay', () => {
    it.each([
      [5, 'morning'],
      [8, 'morning'],
      [11, 'morning'],
      [12, 'afternoon'],
      [14, 'afternoon'],
      [16, 'afternoon'],
      [17, 'evening'],
      [19, 'evening'],
      [20, 'evening'],
      [21, 'night'],
      [23, 'night'],
      [0, 'night'],
      [3, 'night'],
      [4, 'night'],
    ] as const)('hour %i → %s', (hour, expected) => {
      vi.setSystemTime(new Date(2026, 3, 11, hour, 30, 0));
      expect(getTimeOfDay()).toBe(expected);
    });
  });

  describe('runLocalJITAI', () => {
    it('returns a valid JITAIDecision with minimal input', () => {
      vi.setSystemTime(new Date(2026, 3, 11, 10, 0, 0)); // morning

      const result = runLocalJITAI({});

      expect(result).toHaveProperty('shouldIntervene');
      expect(result).toHaveProperty('interventionType');
      expect(result).toHaveProperty('urgency');
      expect(result).toHaveProperty('reasoning');
      expect(typeof result.shouldIntervene).toBe('boolean');
    });

    it('defaults missing inputs to null/0', () => {
      vi.setSystemTime(new Date(2026, 3, 11, 10, 0, 0));

      runLocalJITAI({});

      expect(mockEvaluate).toHaveBeenCalledWith({
        timeOfDay: 'morning',
        recentMood: null,
        sleepQuality: null,
        activityLevel: null,
        calendarDensity: null,
        lastCheckinHoursAgo: null,
        streakDays: 0,
        hrvStressLevel: null,
      });
    });

    it('passes through provided values correctly', () => {
      vi.setSystemTime(new Date(2026, 3, 11, 14, 0, 0)); // afternoon

      runLocalJITAI({
        recentMood: 3,
        sleepQuality: 4,
        lastCheckinHoursAgo: 6,
        streakDays: 12,
        activityLevel: 'moderate',
        calendarDensity: 'packed',
        hrvStressLevel: 'low',
      });

      expect(mockEvaluate).toHaveBeenCalledWith({
        timeOfDay: 'afternoon',
        recentMood: 3,
        sleepQuality: 4,
        activityLevel: 'moderate',
        calendarDensity: 'packed',
        lastCheckinHoursAgo: 6,
        streakDays: 12,
        hrvStressLevel: 'low',
      });
    });

    it('triggers breathing exercise for high stress + evening', () => {
      vi.setSystemTime(new Date(2026, 3, 11, 19, 0, 0)); // evening

      const result = runLocalJITAI({
        hrvStressLevel: 'high',
      });

      expect(result.shouldIntervene).toBe(true);
      expect(result.interventionType).toBe('breathing_exercise');
      expect(result.urgency).toBe('high');
    });

    it('triggers checkin prompt when no checkin for 24h+ in evening', () => {
      vi.setSystemTime(new Date(2026, 3, 11, 18, 0, 0)); // evening

      const result = runLocalJITAI({
        lastCheckinHoursAgo: 30,
      });

      expect(result.shouldIntervene).toBe(true);
      expect(result.interventionType).toBe('checkin_prompt');
    });

    it('triggers activity suggestion for low mood + sedentary', () => {
      vi.setSystemTime(new Date(2026, 3, 11, 10, 0, 0)); // morning

      const result = runLocalJITAI({
        recentMood: 1,
        activityLevel: 'sedentary',
      });

      expect(result.shouldIntervene).toBe(true);
      expect(result.interventionType).toBe('activity_suggestion');
    });

    it('returns no intervention when no rules match', () => {
      vi.setSystemTime(new Date(2026, 3, 11, 10, 0, 0)); // morning

      const result = runLocalJITAI({
        recentMood: 4,
        sleepQuality: 4,
        streakDays: 5,
      });

      expect(result.shouldIntervene).toBe(false);
      expect(result.interventionType).toBe('none');
    });
  });
});
