import { Dimension } from '../enums';
import type { EMAQuestion } from './question-pool';
import { QUESTION_POOL } from './question-pool';

export interface QuestionHistory {
  questionId: string;
  answeredAt: string; // ISO date
}

/**
 * Select optimal questions for this check-in.
 *
 * Algorithm:
 * 1. Score each question: informationValue * recencyBonus * dimensionCoverage
 * 2. recencyBonus: questions not asked recently get a boost (decay factor)
 * 3. dimensionCoverage: prioritise dimensions with fewer recent data points
 * 4. Respect maxBurden: total burden of selected questions must not exceed maxBurden
 * 5. Return top N questions, sorted by score, respecting burden budget
 *
 * @param recentHistory - Questions answered in the last 7 days
 * @param maxBurden - Maximum total burden score (default: 10)
 * @param maxQuestions - Maximum questions to ask (default: 5)
 */
export function selectQuestions(
  recentHistory: QuestionHistory[],
  maxBurden: number = 10,
  maxQuestions: number = 5,
): EMAQuestion[] {
  if (maxBurden <= 0 || maxQuestions <= 0) return [];

  const now = Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  // Count how many times each question was asked recently
  const questionRecency = new Map<string, number>();
  // Count data points per dimension in recent history
  const dimensionDataPoints = new Map<string, number>();

  for (const entry of recentHistory) {
    const answeredAt = new Date(entry.answeredAt).getTime();
    const age = now - answeredAt;
    if (age <= SEVEN_DAYS_MS) {
      // Track most recent answer time per question
      const existing = questionRecency.get(entry.questionId);
      if (existing === undefined || answeredAt > existing) {
        questionRecency.set(entry.questionId, answeredAt);
      }

      // Count dimension data points
      const question = QUESTION_POOL.find((q) => q.id === entry.questionId);
      if (question) {
        const count = dimensionDataPoints.get(question.dimension) ?? 0;
        dimensionDataPoints.set(question.dimension, count + 1);
      }
    }
  }

  // Score each question
  const scored = QUESTION_POOL.map((q) => {
    // Recency bonus: 1.0 if never asked, decays based on how recently it was asked
    let recencyBonus = 1.0;
    const lastAnswered = questionRecency.get(q.id);
    if (lastAnswered !== undefined) {
      const daysSince = (now - lastAnswered) / (24 * 60 * 60 * 1000);
      // Exponential decay: recently asked -> low bonus, older -> higher bonus
      recencyBonus = Math.min(1.0, daysSince / 7);
    }

    // Dimension coverage: boost dimensions with fewer recent data points
    const dataPoints = dimensionDataPoints.get(q.dimension) ?? 0;
    const coverageBonus = 1.0 / (1.0 + dataPoints);

    const score = q.informationValue * (0.3 + 0.7 * recencyBonus) * (0.4 + 0.6 * coverageBonus);

    return { question: q, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Greedy selection: pick top-scored questions respecting burden budget
  // First pass: ensure dimension coverage by picking best question per dimension
  const selected: EMAQuestion[] = [];
  const selectedDimensions = new Set<string>();
  let remainingBurden = maxBurden;

  // Pass 1: one question per dimension (pick best scoring that fits)
  for (const { question } of scored) {
    if (selected.length >= maxQuestions) break;
    if (selectedDimensions.has(question.dimension)) continue;
    if (question.burdenScore > remainingBurden) continue;

    selected.push(question);
    selectedDimensions.add(question.dimension);
    remainingBurden -= question.burdenScore;
  }

  // Pass 2: fill remaining slots with highest-scored questions
  const selectedIds = new Set(selected.map(q => q.id));
  for (const { question } of scored) {
    if (selected.length >= maxQuestions) break;
    if (selectedIds.has(question.id)) continue;
    if (question.burdenScore > remainingBurden) continue;

    selected.push(question);
    selectedIds.add(question.id);
    remainingBurden -= question.burdenScore;
  }

  return selected;
}

// ---------------------------------------------------------------------------
// Context-aware question selection
// ---------------------------------------------------------------------------

export interface EMAContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  currentMood: number | null;       // 1-5
  lastCheckinHoursAgo: number | null;
  recentDimensionScores: Record<string, number | null>; // dimension -> most recent score (1-5)
}

/**
 * Context-aware wrapper around `selectQuestions`.
 *
 * Adjusts burden budget and question weights based on time of day,
 * current mood, recency of last check-in, and dimension coverage gaps.
 *
 * @param recentHistory - Questions answered in the last 7 days
 * @param context - Current user/environmental context
 * @param maxBurden - Base maximum total burden score (default: 10)
 * @param maxQuestions - Base maximum questions to ask (default: 5)
 */
export function selectQuestionsWithContext(
  recentHistory: QuestionHistory[],
  context: EMAContext,
  maxBurden: number = 10,
  maxQuestions: number = 5,
): EMAQuestion[] {
  let adjustedBurden = maxBurden;
  let adjustedMaxQuestions = maxQuestions;

  // --- Quick re-check-in override (highest priority) ---
  if (context.lastCheckinHoursAgo !== null && context.lastCheckinHoursAgo < 4) {
    adjustedBurden = 3;
    adjustedMaxQuestions = 2;
  } else {
    // --- Time-of-day burden adjustment ---
    switch (context.timeOfDay) {
      case 'morning':
        adjustedBurden = Math.floor(maxBurden * 0.8);
        break;
      case 'night':
        adjustedBurden = Math.floor(maxBurden * 0.7);
        break;
      // afternoon and evening: full burden
    }
  }

  // --- Build adjusted question pool with modified informationValue ---
  const adjustedPool: EMAQuestion[] = QUESTION_POOL.map((q) => {
    let weight = q.informationValue;

    // Low mood prioritisation: boost Health and Social
    if (context.currentMood !== null && context.currentMood <= 2) {
      if (q.dimension === Dimension.Health || q.dimension === Dimension.Social) {
        weight *= 1.5;
      }
    }

    // Dimension gap detection: boost dimensions with null scores
    const dimensionScore = context.recentDimensionScores[q.dimension];
    if (dimensionScore === null || dimensionScore === undefined) {
      // Only boost if the dimension is explicitly listed as null (gap)
      if (q.dimension in context.recentDimensionScores && dimensionScore === null) {
        weight *= 2.0;
      }
    }

    // Cap at 1.0 to stay within expected range for selectQuestions
    weight = Math.min(weight, 1.0);

    // Return a copy (don't mutate the pool)
    return { ...q, informationValue: weight };
  });

  // --- Temporarily swap pool and call selectQuestions ---
  // Since selectQuestions uses QUESTION_POOL directly, we need to work around that.
  // We'll use our own scoring logic that mirrors selectQuestions but with the adjusted pool.
  return selectFromPool(adjustedPool, recentHistory, adjustedBurden, adjustedMaxQuestions);
}

/**
 * Internal: selectQuestions logic operating on a custom pool.
 * Mirrors the algorithm in selectQuestions but accepts an arbitrary pool.
 */
function selectFromPool(
  pool: EMAQuestion[],
  recentHistory: QuestionHistory[],
  maxBurden: number,
  maxQuestions: number,
): EMAQuestion[] {
  if (maxBurden <= 0 || maxQuestions <= 0) return [];

  const now = Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  const questionRecency = new Map<string, number>();
  const dimensionDataPoints = new Map<string, number>();

  for (const entry of recentHistory) {
    const answeredAt = new Date(entry.answeredAt).getTime();
    const age = now - answeredAt;
    if (age <= SEVEN_DAYS_MS) {
      const existing = questionRecency.get(entry.questionId);
      if (existing === undefined || answeredAt > existing) {
        questionRecency.set(entry.questionId, answeredAt);
      }
      const question = pool.find((q) => q.id === entry.questionId);
      if (question) {
        const count = dimensionDataPoints.get(question.dimension) ?? 0;
        dimensionDataPoints.set(question.dimension, count + 1);
      }
    }
  }

  const scored = pool.map((q) => {
    let recencyBonus = 1.0;
    const lastAnswered = questionRecency.get(q.id);
    if (lastAnswered !== undefined) {
      const daysSince = (now - lastAnswered) / (24 * 60 * 60 * 1000);
      recencyBonus = Math.min(1.0, daysSince / 7);
    }

    const dataPoints = dimensionDataPoints.get(q.dimension) ?? 0;
    const coverageBonus = 1.0 / (1.0 + dataPoints);

    const score = q.informationValue * (0.3 + 0.7 * recencyBonus) * (0.4 + 0.6 * coverageBonus);

    return { question: q, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const selected: EMAQuestion[] = [];
  const selectedDimensions = new Set<string>();
  let remainingBurden = maxBurden;

  // Pass 1: one question per dimension
  for (const { question } of scored) {
    if (selected.length >= maxQuestions) break;
    if (selectedDimensions.has(question.dimension)) continue;
    if (question.burdenScore > remainingBurden) continue;

    selected.push(question);
    selectedDimensions.add(question.dimension);
    remainingBurden -= question.burdenScore;
  }

  // Pass 2: fill remaining slots
  const selectedIds = new Set(selected.map((q) => q.id));
  for (const { question } of scored) {
    if (selected.length >= maxQuestions) break;
    if (selectedIds.has(question.id)) continue;
    if (question.burdenScore > remainingBurden) continue;

    selected.push(question);
    selectedIds.add(question.id);
    remainingBurden -= question.burdenScore;
  }

  return selected;
}
