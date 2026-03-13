import { DIMENSION_LABELS } from '@life-design/core';
import type { GoalCorrelationInsight, GoalProgressInsight } from '@/lib/goal-correlation';

type InsightType = 'trend' | 'correlation' | 'suggestion' | 'goal_progress' | 'goal_risk';

interface DashboardCheckin {
  date: string;
  mood: number;
  dimension_scores: Array<{ dimension: string; score: number }>;
}

interface CrossDomainCorrelationInsight {
  dimensionA: string;
  dimensionB: string;
  coefficient: number;
  lagDays: number;
  confidence: number;
  insightText: string;
}

interface BuildDashboardInsightsInput {
  checkins: DashboardCheckin[];
  latestScores: Array<{ dimension: string; score: number }>;
  streak: number;
  goalProgress: GoalProgressInsight[];
  goalCorrelations: GoalCorrelationInsight[];
  crossDomainCorrelations: CrossDomainCorrelationInsight[];
}

export interface DashboardInsight {
  id: string;
  type: InsightType;
  title: string;
  body: string;
  dimension: string | null;
}

function prettifyDimension(dimension: string): string {
  return DIMENSION_LABELS[dimension as keyof typeof DIMENSION_LABELS] ?? dimension;
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildDashboardInsights({
  checkins,
  latestScores,
  streak,
  goalProgress,
  goalCorrelations,
  crossDomainCorrelations,
}: BuildDashboardInsightsInput): DashboardInsight[] {
  const insights: DashboardInsight[] = [];

  const atRiskGoals = goalProgress.filter((item) => item.momentumLabel === 'at_risk').slice(0, 2);
  for (const goal of atRiskGoals) {
    insights.push({
      id: `goal-risk-${goal.goalId}`,
      type: 'goal_risk',
      title: `Goal risk: ${goal.title}`,
      body: `${goal.daysRemaining} days left with ${goal.timelineProgressPct}% timeline elapsed. Schedule a focused sprint this week.`,
      dimension: goal.inferredDimension,
    });
  }

  const nearTermGoals = goalProgress
    .filter((item) => item.momentumLabel === 'on_track' && item.daysRemaining >= 0 && item.daysRemaining <= 30)
    .slice(0, 1);
  for (const goal of nearTermGoals) {
    insights.push({
      id: `goal-progress-${goal.goalId}`,
      type: 'goal_progress',
      title: `Momentum building on ${goal.title}`,
      body: `${goal.daysRemaining} days to target. Keep the ${goal.inferredDimension} habit consistent to close strong.`,
      dimension: goal.inferredDimension,
    });
  }

  const primaryGoalCorrelation = goalCorrelations[0];
  if (primaryGoalCorrelation) {
    insights.push({
      id: `goal-corr-${primaryGoalCorrelation.goalId}`,
      type: 'correlation',
      title: `Goal driver identified`,
      body: primaryGoalCorrelation.insightText,
      dimension: primaryGoalCorrelation.inferredDimension,
    });
  }

  const crossDomain = crossDomainCorrelations[0];
  if (crossDomain) {
    insights.push({
      id: `cross-corr-${crossDomain.dimensionA}-${crossDomain.dimensionB}`,
      type: 'correlation',
      title: `${prettifyDimension(crossDomain.dimensionA)} ↔ ${prettifyDimension(crossDomain.dimensionB)}`,
      body: crossDomain.insightText,
      dimension: crossDomain.dimensionA,
    });
  }

  const sortedCheckins = [...checkins].sort((a, b) => a.date.localeCompare(b.date));
  if (sortedCheckins.length >= 4) {
    const recentMood = average(sortedCheckins.slice(-3).map((item) => item.mood));
    const priorMood = average(sortedCheckins.slice(-6, -3).map((item) => item.mood));
    const delta = recentMood - priorMood;
    if (Math.abs(delta) >= 0.4) {
      insights.push({
        id: 'mood-trend',
        type: 'trend',
        title: delta > 0 ? 'Mood trend is improving' : 'Mood trend is softening',
        body:
          delta > 0
            ? `Recent check-ins are up ${delta.toFixed(1)} points vs. the prior window. Preserve the routines that worked.`
            : `Recent check-ins are down ${Math.abs(delta).toFixed(1)} points. Reduce load and run a lighter ritual today.`,
        dimension: 'mood',
      });
    }
  }

  const weakestDimension = [...latestScores].sort((a, b) => a.score - b.score)[0];
  if (weakestDimension) {
    insights.push({
      id: `weak-dimension-${weakestDimension.dimension}`,
      type: 'suggestion',
      title: `Support your ${prettifyDimension(weakestDimension.dimension)}`,
      body: `${prettifyDimension(weakestDimension.dimension)} is currently your lowest signal. Add one small action today to stabilize it.`,
      dimension: weakestDimension.dimension,
    });
  }

  if (streak > 0) {
    insights.push({
      id: 'streak-suggestion',
      type: 'suggestion',
      title: `Protect your ${streak}-day streak`,
      body: 'A short check-in keeps the learning loop active. Consistency compounds your insight quality.',
      dimension: null,
    });
  }

  const priority: Record<InsightType, number> = {
    goal_risk: 0,
    goal_progress: 1,
    correlation: 2,
    trend: 3,
    suggestion: 4,
  };

  return insights
    .sort((a, b) => priority[a.type] - priority[b.type])
    .slice(0, 6);
}
