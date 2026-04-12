import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { EMAContext, EMAQuestion, QuestionHistory } from '@life-design/core';
import { selectLocalEMAQuestions } from '../ema-selector';

const mockSelectWithContext = vi.fn<(
  history: QuestionHistory[],
  context: EMAContext,
  maxBurden?: number,
  maxQuestions?: number,
) => EMAQuestion[]>();

vi.mock('@life-design/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@life-design/core')>();
  return {
    ...actual,
    selectQuestionsWithContext: (
      history: QuestionHistory[],
      context: EMAContext,
      maxBurden?: number,
      maxQuestions?: number,
    ) => {
      mockSelectWithContext(history, context, maxBurden, maxQuestions);
      return actual.selectQuestionsWithContext(history, context, maxBurden, maxQuestions);
    },
  };
});

describe('ema-selector', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSelectWithContext.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delegates to core selectQuestionsWithContext', () => {
    vi.setSystemTime(new Date(2026, 3, 12, 14, 0, 0)); // afternoon

    selectLocalEMAQuestions({ recentHistory: [] });

    expect(mockSelectWithContext).toHaveBeenCalledTimes(1);
    const [, context] = mockSelectWithContext.mock.calls[0];
    expect(context.timeOfDay).toBe('afternoon');
  });

  it('returns valid EMAQuestion array', () => {
    vi.setSystemTime(new Date(2026, 3, 12, 10, 0, 0)); // morning

    const result = selectLocalEMAQuestions({ recentHistory: [] });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    for (const q of result) {
      expect(q).toHaveProperty('id');
      expect(q).toHaveProperty('dimension');
      expect(q).toHaveProperty('text');
      expect(q).toHaveProperty('burdenScore');
      expect(q).toHaveProperty('informationValue');
    }
  });

  it('builds context from current time-of-day', () => {
    vi.setSystemTime(new Date(2026, 3, 12, 20, 0, 0)); // evening

    selectLocalEMAQuestions({ recentHistory: [] });

    const [, context] = mockSelectWithContext.mock.calls[0];
    expect(context.timeOfDay).toBe('evening');
  });

  it('passes through mood and lastCheckinHoursAgo', () => {
    vi.setSystemTime(new Date(2026, 3, 12, 14, 0, 0));

    selectLocalEMAQuestions({
      recentHistory: [],
      currentMood: 2,
      lastCheckinHoursAgo: 5,
      recentDimensionScores: { health: 3 },
    });

    const [, context] = mockSelectWithContext.mock.calls[0];
    expect(context.currentMood).toBe(2);
    expect(context.lastCheckinHoursAgo).toBe(5);
    expect(context.recentDimensionScores).toEqual({ health: 3 });
  });

  it('defaults optional fields to null/empty', () => {
    vi.setSystemTime(new Date(2026, 3, 12, 14, 0, 0));

    selectLocalEMAQuestions({ recentHistory: [] });

    const [, context] = mockSelectWithContext.mock.calls[0];
    expect(context.currentMood).toBeNull();
    expect(context.lastCheckinHoursAgo).toBeNull();
    expect(context.recentDimensionScores).toEqual({});
  });
});
