import { describe, it, expect } from 'vitest';
import { QUESTIONS, SECTIONS, getQuestionsForSection, getTotalQuestionCount } from '../question-schema';

describe('question-schema', () => {
  it('has exactly 18 questions', () => {
    expect(QUESTIONS).toHaveLength(18);
  });

  it('has 4 sections', () => {
    expect(SECTIONS).toHaveLength(4);
  });

  it('section question counts match', () => {
    expect(getQuestionsForSection('goal')).toHaveLength(3);
    expect(getQuestionsForSection('habits')).toHaveLength(5);
    expect(getQuestionsForSection('energy')).toHaveLength(4);
    expect(getQuestionsForSection('style')).toHaveLength(6);
  });

  it('total question count is 18', () => {
    expect(getTotalQuestionCount()).toBe(18);
  });

  it('every question has required fields', () => {
    for (const q of QUESTIONS) {
      expect(q.id).toBeTruthy();
      expect(q.section).toBeTruthy();
      expect(q.type).toBeTruthy();
      expect(q.question).toBeTruthy();
      if (q.type === 'single_select' || q.type === 'multi_select') {
        expect(q.options).toBeDefined();
        expect(q.options!.length).toBeGreaterThan(1);
      }
      if (q.type === 'scale') {
        expect(q.scaleMin).toBeDefined();
        expect(q.scaleMax).toBeDefined();
      }
    }
  });

  it('multi_select questions have maxSelections', () => {
    const multiSelects = QUESTIONS.filter((q) => q.type === 'multi_select');
    for (const q of multiSelects) {
      expect(q.maxSelections).toBeGreaterThan(0);
    }
  });
});
