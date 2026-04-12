import { selectQuestionsWithContext } from '@life-design/core';
import type { QuestionHistory, EMAContext, EMAQuestion } from '@life-design/core';
import { getTimeOfDay } from './jitai-inference';

export interface LocalEMAInput {
  recentHistory: QuestionHistory[];
  currentMood?: number | null;
  lastCheckinHoursAgo?: number | null;
  recentDimensionScores?: Record<string, number | null>;
}

/**
 * Thin client-side wrapper around selectQuestionsWithContext.
 * Builds an EMAContext from partial/raw input and the current time,
 * then delegates to the core context-aware selector.
 */
export function selectLocalEMAQuestions(input: LocalEMAInput): EMAQuestion[] {
  const context: EMAContext = {
    timeOfDay: getTimeOfDay(),
    currentMood: input.currentMood ?? null,
    lastCheckinHoursAgo: input.lastCheckinHoursAgo ?? null,
    recentDimensionScores: input.recentDimensionScores ?? {},
  };

  return selectQuestionsWithContext(input.recentHistory, context);
}
