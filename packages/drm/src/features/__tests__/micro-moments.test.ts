import { determineMicroMoment } from '../micro-moments.js';
import type { MicroMomentContext } from '../micro-moments.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function baseContext(overrides: Partial<MicroMomentContext> = {}): MicroMomentContext {
  return {
    userId: 'u-micro',
    dayOfWeek: 'Tuesday',
    timeOfDay: 'afternoon',
    knownStressors: [],
    interactionPatterns: { preferredTimes: [] },
    dayPatterns: {},
    lastSessionDate: hoursAgo(48), // 2 days ago
    emotionalTrend: 'neutral',
    ...overrides,
  };
}

// ── determineMicroMoment ──────────────────────────────────────────────────────

describe('determineMicroMoment', () => {
  describe('post_crisis_followup priority', () => {
    it('returns post_crisis_followup when trend is negative and session was recent', () => {
      const ctx = baseContext({
        emotionalTrend: 'negative',
        lastSessionDate: hoursAgo(6),
        timeOfDay: 'morning',
        knownStressors: ['job interview'], // even with stressors, crisis takes priority
      });

      const moment = determineMicroMoment(ctx);
      expect(moment).not.toBeNull();
      expect(moment!.type).toBe('post_crisis_followup');
    });

    it('post_crisis overrides pre_event when both conditions met', () => {
      const ctx = baseContext({
        emotionalTrend: 'negative',
        lastSessionDate: hoursAgo(3),
        timeOfDay: 'afternoon',
        knownStressors: ['presentation today'],
      });

      const moment = determineMicroMoment(ctx);
      expect(moment!.type).toBe('post_crisis_followup');
    });

    it('does not trigger post_crisis when session was more than 24 hours ago', () => {
      const ctx = baseContext({
        emotionalTrend: 'negative',
        lastSessionDate: hoursAgo(30), // outside 24-hour window
        timeOfDay: 'morning',
      });

      // Should NOT be post_crisis — might be something else or null
      const moment = determineMicroMoment(ctx);
      if (moment !== null) {
        expect(moment.type).not.toBe('post_crisis_followup');
      }
    });
  });

  describe('pre_event', () => {
    it('returns pre_event when there are known stressors and it is morning', () => {
      const ctx = baseContext({
        knownStressors: ['dentist appointment'],
        timeOfDay: 'morning',
        emotionalTrend: 'neutral',
      });

      const moment = determineMicroMoment(ctx);
      expect(moment).not.toBeNull();
      expect(moment!.type).toBe('pre_event');
    });

    it('returns pre_event when stressors present and afternoon', () => {
      const ctx = baseContext({
        knownStressors: ['work deadline'],
        timeOfDay: 'afternoon',
        emotionalTrend: 'neutral',
      });

      const moment = determineMicroMoment(ctx);
      expect(moment!.type).toBe('pre_event');
    });
  });

  describe('morning_checkin', () => {
    it('returns morning_checkin when morning and day has difficult pattern', () => {
      const ctx = baseContext({
        timeOfDay: 'morning',
        dayOfWeek: 'Monday',
        dayPatterns: { Monday: 'typically higher distress on Mondays' },
        knownStressors: [],
        emotionalTrend: 'neutral',
      });

      const moment = determineMicroMoment(ctx);
      expect(moment).not.toBeNull();
      expect(moment!.type).toBe('morning_checkin');
    });
  });

  describe('pattern_based', () => {
    it('returns pattern_based when day has any pattern noted', () => {
      const ctx = baseContext({
        timeOfDay: 'afternoon',
        dayOfWeek: 'Wednesday',
        dayPatterns: { Wednesday: 'usually busy with meetings' },
        knownStressors: [],
        emotionalTrend: 'neutral',
      });

      const moment = determineMicroMoment(ctx);
      expect(moment).not.toBeNull();
      expect(moment!.type).toBe('pattern_based');
    });
  });

  describe('evening_reflection', () => {
    it('returns evening_reflection when evening, preferred time, and no session today', () => {
      const ctx = baseContext({
        timeOfDay: 'evening',
        interactionPatterns: { preferredTimes: ['evening'] },
        lastSessionDate: hoursAgo(48), // no session today
        knownStressors: [],
        dayPatterns: {},
        emotionalTrend: 'neutral',
      });

      const moment = determineMicroMoment(ctx);
      expect(moment).not.toBeNull();
      expect(moment!.type).toBe('evening_reflection');
    });
  });

  describe('returns null when no moment is appropriate', () => {
    it('returns null when no conditions are met', () => {
      const ctx = baseContext({
        timeOfDay: 'night',
        knownStressors: [],
        dayPatterns: {},
        emotionalTrend: 'positive',
        lastSessionDate: hoursAgo(2), // session today → no evening reflection
      });

      const moment = determineMicroMoment(ctx);
      expect(moment).toBeNull();
    });

    it('returns null for evening when session was recent (same day)', () => {
      const ctx = baseContext({
        timeOfDay: 'evening',
        interactionPatterns: { preferredTimes: ['evening'] },
        lastSessionDate: hoursAgo(1), // session today
        knownStressors: [],
        dayPatterns: {},
        emotionalTrend: 'positive',
      });

      const moment = determineMicroMoment(ctx);
      expect(moment).toBeNull();
    });
  });

  describe('returned MicroMoment structure', () => {
    it('has the correct userId', () => {
      const ctx = baseContext({
        userId: 'special-user',
        emotionalTrend: 'negative',
        lastSessionDate: hoursAgo(4),
        timeOfDay: 'morning',
      });

      const moment = determineMicroMoment(ctx);
      expect(moment).not.toBeNull();
      expect(moment!.userId).toBe('special-user');
    });

    it('has a non-empty id', () => {
      const ctx = baseContext({
        emotionalTrend: 'negative',
        lastSessionDate: hoursAgo(4),
        timeOfDay: 'morning',
      });

      const moment = determineMicroMoment(ctx);
      expect(moment).not.toBeNull();
      expect(moment!.id.length).toBeGreaterThan(0);
    });

    it('deliveredAt is null (not yet sent)', () => {
      const ctx = baseContext({
        emotionalTrend: 'negative',
        lastSessionDate: hoursAgo(4),
        timeOfDay: 'morning',
      });

      const moment = determineMicroMoment(ctx);
      expect(moment).not.toBeNull();
      expect(moment!.deliveredAt).toBeNull();
    });
  });
});
