import { describe, it, expect } from 'vitest';
import { QUESTIONS, SECTIONS, getQuestionsForSection, getTotalQuestionCount } from '../question-schema';

describe('question-schema', () => {
  it('has exactly 79 questions', () => {
    expect(QUESTIONS).toHaveLength(79);
  });

  it('has 8 sections', () => {
    expect(SECTIONS).toHaveLength(8);
  });

  it('section question counts match', () => {
    expect(getQuestionsForSection('goal')).toHaveLength(3);
    expect(getQuestionsForSection('wellbeing')).toHaveLength(15);
    expect(getQuestionsForSection('baseline')).toHaveLength(20);
    expect(getQuestionsForSection('personality')).toHaveLength(10);
    expect(getQuestionsForSection('drive')).toHaveLength(8);
    expect(getQuestionsForSection('satisfaction')).toHaveLength(5);
    expect(getQuestionsForSection('needs')).toHaveLength(12);
    expect(getQuestionsForSection('style')).toHaveLength(6);
  });

  it('total question count is 79', () => {
    expect(getTotalQuestionCount()).toBe(79);
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
