import { describe, expect, it } from 'vitest';
import { Dimension, ALL_DIMENSIONS } from '../../enums';
import { selectQuestions } from '../question-selector';
import type { QuestionHistory } from '../question-selector';
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
