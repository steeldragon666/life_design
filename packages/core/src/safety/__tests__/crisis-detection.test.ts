import { describe, it, expect } from 'vitest';
import { detectCrisisIndicators, CrisisLevel } from '../crisis-detection';

describe('detectCrisisIndicators', () => {
  // HIGH-SEVERITY PATTERNS
  describe('High-level crisis detection', () => {
    it('detects explicit suicidal ideation', () => {
      const result = detectCrisisIndicators('I want to kill myself');
      expect(result.level).toBe(CrisisLevel.High);
      expect(result.matched).toBe(true);
    });

    it('detects "end myself"', () => {
      const result = detectCrisisIndicators('I want to end myself');
      expect(result.matched).toBe(true);
      expect(result.level).toBe(CrisisLevel.High);
    });

    it('detects "end my life"', () => {
      const result = detectCrisisIndicators('I am going to end my life');
      expect(result.matched).toBe(true);
      expect(result.level).toBe(CrisisLevel.High);
    });

    it('detects self-harm language', () => {
      const result = detectCrisisIndicators('I have been hurting myself');
      expect(result.level).toBe(CrisisLevel.High);
      expect(result.matched).toBe(true);
    });

    it('detects "suicide" keyword', () => {
      const result = detectCrisisIndicators('I have been thinking about suicide');
      expect(result.matched).toBe(true);
      expect(result.level).toBe(CrisisLevel.High);
    });

    it('detects "want to die"', () => {
      const result = detectCrisisIndicators('I just want to die');
      expect(result.matched).toBe(true);
      expect(result.level).toBe(CrisisLevel.High);
    });

    it('detects "better off dead"', () => {
      const result = detectCrisisIndicators("I'd be better off dead");
      expect(result.matched).toBe(true);
      expect(result.level).toBe(CrisisLevel.High);
    });

    it('detects "self-harm"', () => {
      const result = detectCrisisIndicators('I have been engaging in self-harm');
      expect(result.matched).toBe(true);
      expect(result.level).toBe(CrisisLevel.High);
    });

    it('detects "selfharm" (no hyphen)', () => {
      const result = detectCrisisIndicators('selfharm is becoming a problem');
      expect(result.matched).toBe(true);
      expect(result.level).toBe(CrisisLevel.High);
    });

    it('detects "cutting myself"', () => {
      const result = detectCrisisIndicators('I have been cutting myself');
      expect(result.matched).toBe(true);
      expect(result.level).toBe(CrisisLevel.High);
    });

    it('detects "take my life"', () => {
      const result = detectCrisisIndicators("I'm going to take my life");
      expect(result.matched).toBe(true);
      expect(result.level).toBe(CrisisLevel.High);
    });

    it('detects "take my own life"', () => {
      const result = detectCrisisIndicators("I want to take my own life");
      expect(result.matched).toBe(true);
      expect(result.level).toBe(CrisisLevel.High);
    });

    it('detects "end it all"', () => {
      const result = detectCrisisIndicators('I want to end it all');
      expect(result.matched).toBe(true);
      expect(result.level).toBe(CrisisLevel.High);
    });

    it('is case-insensitive', () => {
      const result = detectCrisisIndicators('I WANT TO END IT ALL');
      expect(result.matched).toBe(true);
    });

    it('returns triggers array for matched patterns', () => {
      const result = detectCrisisIndicators('I want to kill myself');
      expect(result.triggers.length).toBeGreaterThan(0);
    });

    it('returns high confidence for high-level matches', () => {
      const result = detectCrisisIndicators('I want to kill myself');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  // MEDIUM-SEVERITY PATTERNS
  describe('Medium-level crisis detection', () => {
    it('detects hopelessness patterns', () => {
      const result = detectCrisisIndicators('I see no point in going on');
      expect(result.level).toBe(CrisisLevel.Medium);
      expect(result.matched).toBe(true);
    });

    it('detects "can\'t go on"', () => {
      const result = detectCrisisIndicators("I can't go on like this");
      expect(result.matched).toBe(true);
      expect(result.level).toBe(CrisisLevel.Medium);
    });

    it('detects "want everything to stop"', () => {
      const result = detectCrisisIndicators('I just want everything to stop');
      expect(result.matched).toBe(true);
      expect(result.level).toBe(CrisisLevel.Medium);
    });

    it('detects "don\'t want to be here"', () => {
      const result = detectCrisisIndicators("I don't want to be here anymore");
      expect(result.matched).toBe(true);
      expect(result.level).toBe(CrisisLevel.Medium);
    });

    it('detects "don\'t want to exist"', () => {
      const result = detectCrisisIndicators("I don't want to exist");
      expect(result.matched).toBe(true);
      expect(result.level).toBe(CrisisLevel.Medium);
    });

    it('detects "don\'t want to wake up"', () => {
      const result = detectCrisisIndicators("I don't want to wake up");
      expect(result.matched).toBe(true);
      expect(result.level).toBe(CrisisLevel.Medium);
    });

    it('detects "wish I was dead"', () => {
      const result = detectCrisisIndicators('I wish I was dead');
      expect(result.matched).toBe(true);
      expect(result.level).toBe(CrisisLevel.Medium);
    });

    it('detects "wish I were never born"', () => {
      const result = detectCrisisIndicators('I wish I were never born');
      expect(result.matched).toBe(true);
      expect(result.level).toBe(CrisisLevel.Medium);
    });

    it('detects "nobody would care"', () => {
      const result = detectCrisisIndicators('Nobody would care if I was gone');
      expect(result.matched).toBe(true);
      expect(result.level).toBe(CrisisLevel.Medium);
    });

    it('detects "everyone would be better off without me"', () => {
      const result = detectCrisisIndicators('Everyone would be better off without me');
      expect(result.matched).toBe(true);
      expect(result.level).toBe(CrisisLevel.Medium);
    });
  });

  // FALSE POSITIVES — MUST NOT flag these
  describe('False positive handling', () => {
    it('does not flag normal conversation', () => {
      const result = detectCrisisIndicators('I had a tough day at work');
      expect(result.matched).toBe(false);
    });

    it('does not flag "killing it"', () => {
      const result = detectCrisisIndicators("I'm really killing it at the gym today");
      expect(result.matched).toBe(false);
    });

    it('does not flag "deadline is killing me"', () => {
      const result = detectCrisisIndicators('This deadline is killing me');
      expect(result.matched).toBe(false);
    });

    it('does not flag "to die for"', () => {
      const result = detectCrisisIndicators('That chocolate cake was to die for');
      expect(result.matched).toBe(false);
    });

    it('does not flag "dying to try"', () => {
      const result = detectCrisisIndicators("I'm dying to try that new restaurant");
      expect(result.matched).toBe(false);
    });

    it('does not flag general sadness', () => {
      const result = detectCrisisIndicators('I feel really sad today');
      expect(result.matched).toBe(false);
    });

    it('does not flag stress', () => {
      const result = detectCrisisIndicators("I'm so stressed about exams");
      expect(result.matched).toBe(false);
    });

    it('does not flag loneliness', () => {
      const result = detectCrisisIndicators('I feel so alone right now');
      expect(result.matched).toBe(false);
    });
  });

  // EDGE CASES
  describe('Edge cases', () => {
    it('handles empty string', () => {
      const result = detectCrisisIndicators('');
      expect(result.matched).toBe(false);
    });

    it('handles whitespace only', () => {
      const result = detectCrisisIndicators('   ');
      expect(result.matched).toBe(false);
    });

    it('prioritises HIGH over MEDIUM when both match', () => {
      // "I want to kill myself, nobody would care" matches both HIGH and MEDIUM
      const result = detectCrisisIndicators('I want to kill myself, nobody would care');
      expect(result.level).toBe(CrisisLevel.High);
    });
  });
});
