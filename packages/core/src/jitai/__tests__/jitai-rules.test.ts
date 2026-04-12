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
    weatherMoodImpact: null,
    sadRisk: false,
    outdoorFriendly: null,
    socialIsolationRisk: false,
    screenTimeCompulsive: false,
    screenTimeSleepRisk: false,
    ...overrides,
  };
}

describe('evaluateJITAIRules', () => {
  describe('Rule 1: High stress -> breathing exercise (any time of day)', () => {
    it('should recommend breathing exercise when HRV stress is high in the evening', () => {
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

    it('should also trigger for high stress in the morning', () => {
      const ctx = makeContext({ hrvStressLevel: 'high', timeOfDay: 'morning' });
      const result = evaluateJITAIRules(ctx);

      expect(result.shouldIntervene).toBe(true);
      expect(result.interventionType).toBe('breathing_exercise');
      expect(result.urgency).toBe('high');
    });

    it('should also trigger for high stress in the afternoon', () => {
      const ctx = makeContext({ hrvStressLevel: 'high', timeOfDay: 'afternoon' });
      const result = evaluateJITAIRules(ctx);

      expect(result.shouldIntervene).toBe(true);
      expect(result.interventionType).toBe('breathing_exercise');
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

  describe('Rule 5: SAD risk -> light therapy suggestion', () => {
    it('should suggest light therapy when SAD risk is true', () => {
      const ctx = makeContext({ sadRisk: true });
      const result = evaluateJITAIRules(ctx);

      expect(result.shouldIntervene).toBe(true);
      expect(result.interventionType).toBe('light_therapy');
      expect(result.urgency).toBe('medium');
      expect(result.content).not.toBeNull();
      expect(result.content!.title).toBe('Low light alert');
      expect(result.reasoning).toContain('SAD');
    });

    it('should not trigger when sadRisk is false', () => {
      const ctx = makeContext({ sadRisk: false });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).not.toBe('light_therapy');
    });
  });

  describe('Rule 6: Bad weather + low mood -> indoor activity suggestion', () => {
    it('should suggest indoor activity when weather mood impact < -0.3 and mood <= 2', () => {
      const ctx = makeContext({ weatherMoodImpact: -0.5, recentMood: 2 });
      const result = evaluateJITAIRules(ctx);

      expect(result.shouldIntervene).toBe(true);
      expect(result.interventionType).toBe('activity_suggestion');
      expect(result.urgency).toBe('low');
      expect(result.content).not.toBeNull();
      expect(result.reasoning).toContain('weather');
    });

    it('should trigger for very low mood and very bad weather', () => {
      const ctx = makeContext({ weatherMoodImpact: -0.8, recentMood: 1 });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).toBe('activity_suggestion');
    });

    it('should not trigger when weatherMoodImpact is exactly -0.3 (boundary)', () => {
      const ctx = makeContext({ weatherMoodImpact: -0.3, recentMood: 2 });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).not.toBe('activity_suggestion');
    });

    it('should not trigger when mood is 3 (above threshold)', () => {
      const ctx = makeContext({ weatherMoodImpact: -0.5, recentMood: 3 });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).not.toBe('activity_suggestion');
    });

    it('should not trigger when weatherMoodImpact is null', () => {
      const ctx = makeContext({ weatherMoodImpact: null, recentMood: 1 });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).not.toBe('activity_suggestion');
    });

    it('should not trigger when recentMood is null', () => {
      const ctx = makeContext({ weatherMoodImpact: -0.5, recentMood: null });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).not.toBe('activity_suggestion');
    });
  });

  describe('Rule 7: Social isolation risk -> social nudge', () => {
    it('should nudge when social isolation risk is true', () => {
      const ctx = makeContext({ socialIsolationRisk: true });
      const result = evaluateJITAIRules(ctx);

      expect(result.shouldIntervene).toBe(true);
      expect(result.interventionType).toBe('nudge');
      expect(result.urgency).toBe('medium');
      expect(result.content).not.toBeNull();
      expect(result.content!.title).toBe('Stay connected');
      expect(result.reasoning).toContain('isolation');
    });

    it('should not trigger when socialIsolationRisk is false', () => {
      const ctx = makeContext({ socialIsolationRisk: false });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).not.toBe('nudge');
    });
  });

  describe('Rule 8: Screen time sleep risk + evening -> digital sunset', () => {
    it('should suggest digital sunset when screenTimeSleepRisk is true and evening', () => {
      const ctx = makeContext({ screenTimeSleepRisk: true, timeOfDay: 'evening' });
      const result = evaluateJITAIRules(ctx);

      expect(result.shouldIntervene).toBe(true);
      expect(result.interventionType).toBe('digital_sunset');
      expect(result.urgency).toBe('medium');
      expect(result.content).not.toBeNull();
      expect(result.content!.title).toBe('Digital sunset');
      expect(result.reasoning).toContain('Screen time sleep disruption');
    });

    it('should not trigger when screenTimeSleepRisk is false', () => {
      const ctx = makeContext({ screenTimeSleepRisk: false, timeOfDay: 'evening' });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).not.toBe('digital_sunset');
    });

    it('should not trigger when timeOfDay is not evening', () => {
      const ctx = makeContext({ screenTimeSleepRisk: true, timeOfDay: 'morning' });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).not.toBe('digital_sunset');
    });

    it('should not trigger during afternoon', () => {
      const ctx = makeContext({ screenTimeSleepRisk: true, timeOfDay: 'afternoon' });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).not.toBe('digital_sunset');
    });
  });

  describe('Priority: higher rules take precedence over new rules', () => {
    it('should return breathing exercise over SAD risk when both match', () => {
      const ctx = makeContext({ hrvStressLevel: 'high', sadRisk: true });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).toBe('breathing_exercise');
    });

    it('should return Rule 3 activity suggestion over Rule 6 when both match', () => {
      const ctx = makeContext({
        recentMood: 1,
        activityLevel: 'sedentary',
        weatherMoodImpact: -0.5,
      });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).toBe('activity_suggestion');
      expect(result.reasoning).toContain('Low mood');
    });

    it('should return SAD risk (Rule 5) over digital sunset (Rule 8) when both match', () => {
      const ctx = makeContext({ sadRisk: true, screenTimeSleepRisk: true, timeOfDay: 'evening' });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).toBe('light_therapy');
    });

    it('should return digital sunset (Rule 8) over bad weather (Rule 6) when both match', () => {
      const ctx = makeContext({
        screenTimeSleepRisk: true,
        timeOfDay: 'evening',
        weatherMoodImpact: -0.5,
        recentMood: 1,
      });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).toBe('digital_sunset');
    });

    it('should return SAD risk (Rule 5) over social isolation (Rule 7) when both match', () => {
      const ctx = makeContext({ sadRisk: true, socialIsolationRisk: true });
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).toBe('light_therapy');
    });
  });

  describe('Edge cases: null values do not trigger new rules', () => {
    it('should not trigger Rule 5 when sadRisk is false (default)', () => {
      const ctx = makeContext();
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).not.toBe('light_therapy');
    });

    it('should not trigger Rule 7 when socialIsolationRisk is false (default)', () => {
      const ctx = makeContext();
      const result = evaluateJITAIRules(ctx);

      expect(result.interventionType).not.toBe('nudge');
    });
  });
});
