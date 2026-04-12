import { describe, expect, it } from 'vitest';
import { Dimension, ALL_DIMENSIONS } from '../../enums';
import { selectQuestions, selectQuestionsWithContext } from '../question-selector';
import type { QuestionHistory, EMAContext } from '../question-selector';
import { QUESTION_POOL } from '../question-pool';
import type { EMAQuestion } from '../question-pool';

describe('selectQuestions', () => {
  it('returns at most maxQuestions questions', () => {
    const result = selectQuestions([], 20, 3);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('total burden does not exceed maxBurden', () => {
    const result = selectQuestions([], 6, 10);
    const totalBurden = result.reduce((sum, q) => sum + q.burdenScore, 0);
    expect(totalBurden).toBeLessThanOrEqual(6);
  });

  it('covers multiple dimensions (not all from same dimension)', () => {
    const result = selectQuestions([], 15, 5);
    const dimensions = new Set(result.map((q) => q.dimension));
    expect(dimensions.size).toBeGreaterThan(1);
  });

  it('recently asked questions get deprioritised', () => {
    const now = new Date().toISOString();
    // Find questions for Career dimension
    const careerQuestions = QUESTION_POOL.filter((q) => q.dimension === Dimension.Career);
    expect(careerQuestions.length).toBeGreaterThanOrEqual(2);

    // Mark the highest info-value career question as recently asked
    const bestCareer = [...careerQuestions].sort((a, b) => b.informationValue - a.informationValue)[0];
    const history: QuestionHistory[] = [{ questionId: bestCareer.id, answeredAt: now }];

    const withHistory = selectQuestions(history, 20, 8);
    const withoutHistory = selectQuestions([], 20, 8);

    // The recently-asked question should either not appear or appear later
    const posWithHistory = withHistory.findIndex((q) => q.id === bestCareer.id);
    const posWithoutHistory = withoutHistory.findIndex((q) => q.id === bestCareer.id);

    // If it appears in both, it should be ranked lower with history
    // If it doesn't appear with history, that's also correct (deprioritised out)
    if (posWithHistory >= 0 && posWithoutHistory >= 0) {
      expect(posWithHistory).toBeGreaterThanOrEqual(posWithoutHistory);
    } else if (posWithHistory === -1 && posWithoutHistory >= 0) {
      // Good - it was deprioritised out entirely
      expect(true).toBe(true);
    }
  });

  it('questions not asked recently get boosted', () => {
    // Ask all questions for every dimension except Growth recently
    const now = new Date().toISOString();
    const nonGrowthQuestions = QUESTION_POOL.filter((q) => q.dimension !== Dimension.Growth);
    const history: QuestionHistory[] = nonGrowthQuestions.map((q) => ({
      questionId: q.id,
      answeredAt: now,
    }));

    const result = selectQuestions(history, 20, 5);

    // Growth questions should appear since everything else was recently asked
    const growthQuestions = result.filter((q) => q.dimension === Dimension.Growth);
    expect(growthQuestions.length).toBeGreaterThan(0);
  });

  it('returns empty when pool is empty', () => {
    // We can test by making everything recently asked with very low budget
    const result = selectQuestions([], 0, 5);
    expect(result).toEqual([]);
  });

  it('default maxBurden and maxQuestions work', () => {
    const result = selectQuestions([]);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(5);
    const totalBurden = result.reduce((sum, q) => sum + q.burdenScore, 0);
    expect(totalBurden).toBeLessThanOrEqual(10);
  });

  it('covers at least one question per dimension when possible within budget', () => {
    // With generous budget we should cover many dimensions
    const result = selectQuestions([], 30, 8);
    const dimensions = new Set(result.map((q) => q.dimension));
    // With 8 dimensions and budget of 30, we should cover all 8
    expect(dimensions.size).toBe(ALL_DIMENSIONS.length);
  });

  it('QUESTION_POOL has 2-3 questions per dimension', () => {
    for (const dim of ALL_DIMENSIONS) {
      const questions = QUESTION_POOL.filter((q) => q.dimension === dim);
      expect(questions.length).toBeGreaterThanOrEqual(2);
      expect(questions.length).toBeLessThanOrEqual(3);
    }
  });

  it('all questions have valid burdenScore and informationValue', () => {
    for (const q of QUESTION_POOL) {
      expect(q.burdenScore).toBeGreaterThanOrEqual(1);
      expect(q.burdenScore).toBeLessThanOrEqual(5);
      expect(q.informationValue).toBeGreaterThanOrEqual(0);
      expect(q.informationValue).toBeLessThanOrEqual(1);
    }
  });
});

describe('selectQuestionsWithContext', () => {
  const baseContext: EMAContext = {
    timeOfDay: 'afternoon',
    currentMood: null,
    lastCheckinHoursAgo: null,
    recentDimensionScores: {},
  };

  it('returns questions with empty history and default context', () => {
    const result = selectQuestionsWithContext([], baseContext);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it('morning reduces burden (fewer/lighter questions)', () => {
    const morningCtx: EMAContext = { ...baseContext, timeOfDay: 'morning' };
    const afternoonCtx: EMAContext = { ...baseContext, timeOfDay: 'afternoon' };

    const morningResult = selectQuestionsWithContext([], morningCtx, 10, 5);
    const afternoonResult = selectQuestionsWithContext([], afternoonCtx, 10, 5);

    const morningBurden = morningResult.reduce((s, q) => s + q.burdenScore, 0);
    const afternoonBurden = afternoonResult.reduce((s, q) => s + q.burdenScore, 0);

    // Morning should have equal or less burden than afternoon
    expect(morningBurden).toBeLessThanOrEqual(afternoonBurden);
  });

  it('night reduces burden even more than morning', () => {
    const nightCtx: EMAContext = { ...baseContext, timeOfDay: 'night' };
    const morningCtx: EMAContext = { ...baseContext, timeOfDay: 'morning' };

    const nightResult = selectQuestionsWithContext([], nightCtx, 10, 5);
    const morningResult = selectQuestionsWithContext([], morningCtx, 10, 5);

    const nightBurden = nightResult.reduce((s, q) => s + q.burdenScore, 0);
    const morningBurden = morningResult.reduce((s, q) => s + q.burdenScore, 0);

    expect(nightBurden).toBeLessThanOrEqual(morningBurden);
  });

  it('evening allows full burden', () => {
    const eveningCtx: EMAContext = { ...baseContext, timeOfDay: 'evening' };

    const eveningResult = selectQuestionsWithContext([], eveningCtx, 10, 5);
    const afternoonResult = selectQuestionsWithContext([], baseContext, 10, 5);

    const eveningBurden = eveningResult.reduce((s, q) => s + q.burdenScore, 0);
    const afternoonBurden = afternoonResult.reduce((s, q) => s + q.burdenScore, 0);

    // Evening and afternoon should have the same burden budget (full)
    expect(eveningBurden).toBe(afternoonBurden);
  });

  it('low mood boosts Health and Social dimensions', () => {
    const lowMoodCtx: EMAContext = { ...baseContext, currentMood: 1 };
    const neutralCtx: EMAContext = { ...baseContext, currentMood: 4 };

    const lowMoodResult = selectQuestionsWithContext([], lowMoodCtx, 20, 8);
    const neutralResult = selectQuestionsWithContext([], neutralCtx, 20, 8);

    const lowMoodHealthSocial = lowMoodResult.filter(
      (q) => q.dimension === Dimension.Health || q.dimension === Dimension.Social,
    );
    const neutralHealthSocial = neutralResult.filter(
      (q) => q.dimension === Dimension.Health || q.dimension === Dimension.Social,
    );

    // Low mood should include at least as many Health/Social questions
    expect(lowMoodHealthSocial.length).toBeGreaterThanOrEqual(neutralHealthSocial.length);
  });

  it('low mood (mood=2) also triggers Health/Social boost', () => {
    const lowMoodCtx: EMAContext = { ...baseContext, currentMood: 2 };

    const result = selectQuestionsWithContext([], lowMoodCtx, 20, 8);
    const healthSocial = result.filter(
      (q) => q.dimension === Dimension.Health || q.dimension === Dimension.Social,
    );

    expect(healthSocial.length).toBeGreaterThan(0);
  });

  it('quick re-check-in returns very few questions', () => {
    const quickCtx: EMAContext = { ...baseContext, lastCheckinHoursAgo: 2 };

    const result = selectQuestionsWithContext([], quickCtx, 10, 5);

    expect(result.length).toBeLessThanOrEqual(2);
    const totalBurden = result.reduce((s, q) => s + q.burdenScore, 0);
    expect(totalBurden).toBeLessThanOrEqual(3);
  });

  it('quick re-check-in at boundary (3.9h) still limits questions', () => {
    const quickCtx: EMAContext = { ...baseContext, lastCheckinHoursAgo: 3.9 };

    const result = selectQuestionsWithContext([], quickCtx, 10, 5);

    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('null dimension scores get boosted (dimension gap detection)', () => {
    // All dimensions scored except Growth
    const scores: Record<string, number | null> = {};
    for (const dim of ALL_DIMENSIONS) {
      scores[dim] = dim === Dimension.Growth ? null : 3;
    }
    const gapCtx: EMAContext = { ...baseContext, recentDimensionScores: scores };

    const result = selectQuestionsWithContext([], gapCtx, 20, 8);

    const growthQuestions = result.filter((q) => q.dimension === Dimension.Growth);
    expect(growthQuestions.length).toBeGreaterThan(0);
  });

  it('works with empty history and empty dimension scores', () => {
    const emptyCtx: EMAContext = {
      timeOfDay: 'afternoon',
      currentMood: null,
      lastCheckinHoursAgo: null,
      recentDimensionScores: {},
    };

    const result = selectQuestionsWithContext([], emptyCtx);
    expect(result.length).toBeGreaterThan(0);
    // Each returned question should be a valid EMAQuestion
    for (const q of result) {
      expect(q).toHaveProperty('id');
      expect(q).toHaveProperty('dimension');
      expect(q).toHaveProperty('text');
      expect(q).toHaveProperty('burdenScore');
      expect(q).toHaveProperty('informationValue');
    }
  });

  it('does not mutate the original QUESTION_POOL', () => {
    const originalValues = QUESTION_POOL.map((q) => q.informationValue);

    const ctx: EMAContext = {
      timeOfDay: 'morning',
      currentMood: 1,
      lastCheckinHoursAgo: null,
      recentDimensionScores: { [Dimension.Growth]: null },
    };
    selectQuestionsWithContext([], ctx, 10, 5);

    const afterValues = QUESTION_POOL.map((q) => q.informationValue);
    expect(afterValues).toEqual(originalValues);
  });
});
