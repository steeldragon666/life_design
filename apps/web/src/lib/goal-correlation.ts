import { pearsonCorrelation } from '@life-design/core';

type GoalHorizon = 'short' | 'medium' | 'long';
type GoalStatus = 'active' | 'completed' | 'paused' | 'abandoned';

export interface GoalCorrelationGoal {
  id: string;
  title: string;
  horizon: GoalHorizon;
  status: GoalStatus;
  target_date: string;
  description?: string;
}

export interface GoalCorrelationCheckin {
  date: string;
  mood: number;
  dimension_scores: Array<{ dimension: string; score: number }>;
}

export interface GoalProgressInsight {
  goalId: string;
  title: string;
  inferredDimension: string;
  daysRemaining: number;
  timelineProgressPct: number;
  momentumLabel: 'on_track' | 'at_risk' | 'completed';
}

export interface GoalCorrelationInsight {
  goalId: string;
  title: string;
  inferredDimension: string;
  coefficient: number;
  confidence: number;
  insightText: string;
}

const DIMENSION_KEYWORDS: Record<string, string[]> = {
  career: ['career', 'job', 'work', 'business', 'promotion', 'income', 'client', 'leadership'],
  finance: ['finance', 'money', 'budget', 'save', 'debt', 'invest', 'cash', 'wealth'],
  health: ['health', 'sleep', 'stress', 'energy', 'wellness', 'meditation', 'mental'],
  fitness: ['fitness', 'gym', 'run', 'strength', 'workout', 'exercise', 'steps', 'cardio'],
  family: ['family', 'parent', 'child', 'kids', 'home'],
  social: ['social', 'friends', 'community', 'network', 'relationship'],
  romance: ['romance', 'partner', 'dating', 'marriage', 'intimacy'],
  growth: ['growth', 'learn', 'study', 'course', 'reading', 'skill', 'habit'],
};

function normalizeText(value: string): string {
  return value.toLowerCase().trim();
}

function inferGoalDimension(goal: GoalCorrelationGoal): string {
  const haystack = normalizeText(`${goal.title} ${goal.description ?? ''}`);
  let bestDimension = 'growth';
  let bestScore = 0;

  for (const [dimension, keywords] of Object.entries(DIMENSION_KEYWORDS)) {
    const score = keywords.reduce((acc, keyword) => (haystack.includes(keyword) ? acc + 1 : acc), 0);
    if (score > bestScore) {
      bestScore = score;
      bestDimension = dimension;
    }
  }

  return bestDimension;
}

function computeTimelineProgress(goal: GoalCorrelationGoal): number {
  const horizonDays = goal.horizon === 'short' ? 180 : goal.horizon === 'medium' ? 540 : 1825;
  const targetTime = new Date(goal.target_date).getTime();
  if (Number.isNaN(targetTime)) return 0;
  const startedAt = targetTime - horizonDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const progress = ((now - startedAt) / (targetTime - startedAt)) * 100;
  return Math.max(0, Math.min(100, Math.round(progress)));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function confidenceFromSample(sample: number, coefficient: number): number {
  const sampleWeight = clamp01((sample - 7) / 23);
  const effectWeight = clamp01((Math.abs(coefficient) - 0.2) / 0.8);
  return clamp01(sampleWeight * 0.6 + effectWeight * 0.4);
}

export function buildGoalInsights(
  goals: GoalCorrelationGoal[],
  checkins: GoalCorrelationCheckin[],
): {
  progress: GoalProgressInsight[];
  correlations: GoalCorrelationInsight[];
} {
  const progress: GoalProgressInsight[] = [];
  const correlations: GoalCorrelationInsight[] = [];

  if (!goals.length) return { progress, correlations };

  const sortedCheckins = [...checkins].sort((a, b) => a.date.localeCompare(b.date));
  const moodSeries = sortedCheckins.map((item) => item.mood);

  for (const goal of goals) {
    const inferredDimension = inferGoalDimension(goal);
    const timelineProgressPct = computeTimelineProgress(goal);
    const daysRemaining = Math.ceil(
      (new Date(goal.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    const momentumLabel: GoalProgressInsight['momentumLabel'] =
      goal.status === 'completed'
        ? 'completed'
        : daysRemaining < 14 && timelineProgressPct > 85
          ? 'at_risk'
          : 'on_track';

    progress.push({
      goalId: goal.id,
      title: goal.title,
      inferredDimension,
      daysRemaining,
      timelineProgressPct,
      momentumLabel,
    });

    const dimensionSeries = sortedCheckins.map((checkin) => {
      const match = checkin.dimension_scores.find((score) => score.dimension === inferredDimension);
      return typeof match?.score === 'number' ? match.score : Number.NaN;
    });

    const alignedMood: number[] = [];
    const alignedDimension: number[] = [];
    for (let index = 0; index < moodSeries.length; index++) {
      const mood = moodSeries[index];
      const dim = dimensionSeries[index];
      if (!Number.isFinite(mood) || !Number.isFinite(dim)) continue;
      alignedMood.push(mood);
      alignedDimension.push(dim);
    }

    if (alignedMood.length < 7) continue;
    const coefficient = pearsonCorrelation(alignedMood, alignedDimension);
    const confidence = confidenceFromSample(alignedMood.length, coefficient);
    if (Math.abs(coefficient) < 0.25 || confidence < 0.45) continue;

    correlations.push({
      goalId: goal.id,
      title: goal.title,
      inferredDimension,
      coefficient,
      confidence,
      insightText:
        coefficient >= 0
          ? `Your ${goal.title} trajectory tends to improve when ${inferredDimension} scores rise.`
          : `Your ${goal.title} trajectory may dip when ${inferredDimension} scores rise, worth exploring trade-offs.`,
    });
  }

  return {
    progress: progress.sort((a, b) => a.daysRemaining - b.daysRemaining),
    correlations: correlations.sort((a, b) => b.confidence - a.confidence).slice(0, 4),
  };
}
