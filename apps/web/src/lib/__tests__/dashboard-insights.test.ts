import { describe, expect, it } from 'vitest';
import { buildGoalInsights } from '@/lib/goal-correlation';
import { buildDashboardInsights } from '@/lib/dashboard-insights';

function dateDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function dateDaysAhead(daysAhead: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

describe('dashboard insight pipeline', () => {
  it('builds deterministic goal and cross-domain insights from live signals', () => {
    const checkins = Array.from({ length: 12 }, (_, index) => {
      const mood = 4 + index * 0.4;
      return {
        date: dateDaysAgo(12 - index),
        mood,
        dimension_scores: [
          { dimension: 'career', score: mood },
          { dimension: 'health', score: 6 + index * 0.1 },
        ],
      };
    });

    const goalSignals = buildGoalInsights(
      [
        {
          id: 'goal-1',
          title: 'Career promotion sprint',
          horizon: 'short',
          status: 'active',
          target_date: dateDaysAhead(5),
          description: 'Improve work outcomes and leadership visibility',
        },
      ],
      checkins,
    );

    expect(goalSignals.progress.length).toBeGreaterThan(0);
    expect(goalSignals.progress[0].inferredDimension).toBe('career');
    expect(goalSignals.correlations.length).toBeGreaterThan(0);

    const insights = buildDashboardInsights({
      checkins,
      latestScores: [
        { dimension: 'career', score: 7.8 },
        { dimension: 'health', score: 5.2 },
      ],
      streak: 6,
      goalProgress: goalSignals.progress,
      goalCorrelations: goalSignals.correlations,
      crossDomainCorrelations: [
        {
          dimensionA: 'career',
          dimensionB: 'health',
          coefficient: 0.62,
          lagDays: 0,
          confidence: 0.77,
          insightText: 'Career and health are rising together this cycle.',
        },
      ],
    });

    expect(insights.length).toBeGreaterThan(0);
    expect(insights.some((item) => item.type === 'goal_risk')).toBe(true);
    expect(insights.some((item) => item.type === 'correlation')).toBe(true);
    expect(insights[0].type).toBe('goal_risk');
  });
});
