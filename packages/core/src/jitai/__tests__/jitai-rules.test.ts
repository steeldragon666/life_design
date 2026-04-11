import { describe, it, expect } from 'vitest';
import { evaluateJITAIRules } from '../rules';
import type { JITAIContext, JITAIDecision } from '../types';

function makeContext(overrides: Partial<JITAIContext> = {}): JITAIContext {
  return {
    timeOfDay: 'morning',
    recentMood: null,
    sleepQuality: null,
    activityLevel: null,
    calendarDensity: null,
    lastCheckinHoursAgo: null,
    streakDays: 0,
    hrvStressLevel: null,
    ...overrides,
  };
}

describe('evaluateJITAIRules', () => {
  describe('Rule 1: High stress + evening -> breathing exercise', () => {
    it('should recommend breathing exercise when HRV stress is high and it is evening', () => {
      const ctx = makeContext({ hrvStressLevel: 'high', timeOfDay: 'evening' });
      const result = evaluateJITAIRules(ctx);

      expect(result.shouldIntervene).toBe(true);
      expect(result.interventionType).toBe('breathing_exercise');
      expect(result.urgency).toBe('high');
      expect(result.content).not.toBeNull();
      expect(result.content!.title).toBe('Take a moment');
      expect(result.content!.actionUrl).toBe('/meditations');
      expect(result.reasoning).toContain('High HRV stress');
    });

    it('should not trigger for high stress in the morning', () => {
      const ctx = makeContext({ hrvStressLevel: 'high', timeOfDay: 'morning' });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).not.toBe('breathing_exercise');
    });

    it('should not trigger for moderate stress in the evening', () => {
      const ctx = makeContext({ hrvStressLevel: 'moderate', timeOfDay: 'evening' });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).not.toBe('breathing_exercise');
    });
  });

  describe('Rule 2: No checkin 24h+ + evening -> checkin prompt', () => {
    it('should prompt checkin when last checkin was over 24h ago and it is evening', () => {
      const ctx = makeContext({ lastCheckinHoursAgo: 25, timeOfDay: 'evening' });
      const result = evaluateJITAIRules(ctx);

      expect(result.shouldIntervene).toBe(true);
      expect(result.interventionType).toBe('checkin_prompt');
      expect(result.urgency).toBe('medium');
      expect(result.content).not.toBeNull();
      expect(result.content!.actionUrl).toBe('/checkin');
      expect(result.reasoning).toContain('24h');
    });

    it('should not trigger when last checkin was exactly 24h ago', () => {
      const ctx = makeContext({ lastCheckinHoursAgo: 24, timeOfDay: 'evening' });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).not.toBe('checkin_prompt');
    });

    it('should not trigger when last checkin was recent', () => {
      const ctx = makeContext({ lastCheckinHoursAgo: 5, timeOfDay: 'evening' });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).not.toBe('checkin_prompt');
    });

    it('should not trigger for 24h+ but in the morning', () => {
      const ctx = makeContext({ lastCheckinHoursAgo: 30, timeOfDay: 'morning' });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).not.toBe('checkin_prompt');
    });
  });

  describe('Rule 3: Low mood + sedentary -> activity suggestion', () => {
    it('should suggest activity when mood <= 2 and sedentary', () => {
      const ctx = makeContext({ recentMood: 2, activityLevel: 'sedentary' });
      const result = evaluateJITAIRules(ctx);

      expect(result.shouldIntervene).toBe(true);
      expect(result.interventionType).toBe('activity_suggestion');
      expect(result.urgency).toBe('medium');
      expect(result.content).not.toBeNull();
      expect(result.content!.title).toBe('Movement helps');
      expect(result.reasoning).toContain('Low mood');
    });

    it('should trigger for mood of 1', () => {
      const ctx = makeContext({ recentMood: 1, activityLevel: 'sedentary' });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).toBe('activity_suggestion');
    });

    it('should not trigger for mood of 3 (boundary)', () => {
      const ctx = makeContext({ recentMood: 3, activityLevel: 'sedentary' });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).not.toBe('activity_suggestion');
    });

    it('should not trigger for low mood but active', () => {
      const ctx = makeContext({ recentMood: 1, activityLevel: 'active' });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).not.toBe('activity_suggestion');
    });
  });

  describe('Rule 4: Packed calendar + no checkin 12h+ -> nudge', () => {
    it('should nudge when calendar is packed and no checkin for 12h+', () => {
      const ctx = makeContext({ calendarDensity: 'packed', lastCheckinHoursAgo: 13 });
      const result = evaluateJITAIRules(ctx);

      expect(result.shouldIntervene).toBe(true);
      expect(result.interventionType).toBe('nudge');
      expect(result.urgency).toBe('low');
      expect(result.content).not.toBeNull();
      expect(result.content!.actionUrl).toBe('/checkin');
      expect(result.reasoning).toContain('Packed calendar');
    });

    it('should not trigger when last checkin was exactly 12h ago', () => {
      const ctx = makeContext({ calendarDensity: 'packed', lastCheckinHoursAgo: 12 });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).not.toBe('nudge');
    });

    it('should not trigger for moderate calendar density', () => {
      const ctx = makeContext({ calendarDensity: 'moderate', lastCheckinHoursAgo: 20 });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).not.toBe('nudge');
    });
  });

  describe('Default case: no rules match', () => {
    it('should return no intervention when no rules match', () => {
      const ctx = makeContext();
      const result = evaluateJITAIRules(ctx);

      expect(result.shouldIntervene).toBe(false);
      expect(result.interventionType).toBe('none');
      expect(result.urgency).toBe('low');
      expect(result.content).toBeNull();
      expect(result.reasoning).toContain('No intervention rules matched');
    });

    it('should return no intervention for all-null optional context', () => {
      const ctx = makeContext({
        recentMood: null,
        sleepQuality: null,
        activityLevel: null,
        calendarDensity: null,
        lastCheckinHoursAgo: null,
        hrvStressLevel: null,
      });
      const result = evaluateJITAIRules(ctx);

      expect(result.shouldIntervene).toBe(false);
      expect(result.interventionType).toBe('none');
    });
  });

  describe('Priority: Rule 1 takes precedence over Rule 2', () => {
    it('should return breathing exercise when both Rule 1 and Rule 2 conditions are met', () => {
      const ctx = makeContext({
        hrvStressLevel: 'high',
        timeOfDay: 'evening',
        lastCheckinHoursAgo: 30,
      });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).toBe('breathing_exercise');
      expect(result.urgency).toBe('high');
    });
  });

  describe('Edge cases: null values do not trigger rules', () => {
    it('should not trigger Rule 1 when hrvStressLevel is null', () => {
      const ctx = makeContext({ hrvStressLevel: null, timeOfDay: 'evening' });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).not.toBe('breathing_exercise');
    });

    it('should not trigger Rule 2 when lastCheckinHoursAgo is null', () => {
      const ctx = makeContext({ lastCheckinHoursAgo: null, timeOfDay: 'evening' });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).not.toBe('checkin_prompt');
    });

    it('should not trigger Rule 3 when recentMood is null', () => {
      const ctx = makeContext({ recentMood: null, activityLevel: 'sedentary' });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).not.toBe('activity_suggestion');
    });

    it('should not trigger Rule 3 when activityLevel is null', () => {
      const ctx = makeContext({ recentMood: 1, activityLevel: null });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).not.toBe('activity_suggestion');
    });

    it('should not trigger Rule 4 when lastCheckinHoursAgo is null', () => {
      const ctx = makeContext({ calendarDensity: 'packed', lastCheckinHoursAgo: null });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).not.toBe('nudge');
    });
  });
});
