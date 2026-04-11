import type { Dimension } from '../enums';
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
