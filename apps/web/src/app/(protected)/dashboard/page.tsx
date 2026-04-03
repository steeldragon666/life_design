import { createClient } from '@/lib/supabase/server';
import {
  getLatestScores,
  getScoreHistory,
  getStreakData,
} from '@/lib/services/dashboard-service';
import { getInsights } from '@/lib/services/insights-service';
import { getGoals } from '@/lib/services/goal-service';
import { computeStreak, computeOverallScore, DIMENSION_LABELS, Dimension, GoalStatus } from '@life-design/core';
import DashboardClient from './dashboard-client';

import { getGranularContext } from '@life-design/core';
import { generateNudges } from '@/lib/services/nudge-engine';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Guest mode — render dashboard client with empty server data;
    // the client component will hydrate from localStorage via useDashboardData()
    return (
      <DashboardClient
        latestScores={[]}
        overallScore={0}
        streak={0}
        dimensionTrends={{}}
        recentInsights={[]}
        goalsSummary={{ total: 0, byHorizon: { short: 0, medium: 0, long: 0 }, nearestDeadline: null }}
        activeGoals={[]}
        nudges={[]}
      />
    );
  }

  // Fetch profile for context (including first_name for personalised greeting)
  const { data: profile } = await supabase
    .from('profiles')
    .select('postcode, profession, interests, first_name')
    .eq('id', user.id)
    .single();

  const today = new Date().toISOString().slice(0, 10);

  const [latestResult, historyResult, streakResult, insightsResult, goalsResult, worldContext] = await Promise.all([
    getLatestScores(user.id),
    getScoreHistory(user.id, 30),
    getStreakData(user.id),
    getInsights(user.id, 3),
    getGoals(user.id, { status: GoalStatus.Active }),
    profile?.postcode ? getGranularContext(profile.postcode, profile.profession, profile.interests ?? []) : Promise.resolve(null),
  ]);

  const latestScores = latestResult.data ?? [];
  const history = historyResult.data ?? [];
  const streakDates = streakResult.data ?? [];

  const streak = computeStreak(streakDates, today);
  const overallScore = latestScores.length > 0
    ? computeOverallScore(latestScores as { dimension: Dimension; score: number }[])
    : 0;

  // Build per-dimension trend data from history
  const dimensionTrends: Record<string, { date: string; score: number }[]> = {};
  for (const checkin of history) {
    const scores = (checkin as { date: string; dimension_scores: { dimension: string; score: number }[] }).dimension_scores ?? [];
    for (const ds of scores) {
      if (!dimensionTrends[ds.dimension]) {
        dimensionTrends[ds.dimension] = [];
      }
      dimensionTrends[ds.dimension].push({
        date: (checkin as { date: string }).date,
        score: ds.score,
      });
    }
  }

  const recentInsights = (insightsResult.data ?? []) as {
    id: string;
    type: 'trend' | 'correlation' | 'suggestion' | 'goal_progress' | 'goal_risk';
    title: string;
    body: string;
    dimension: string | null;
  }[];

  // Build goals summary
  const activeGoals = (goalsResult.data ?? []) as Array<{
    [key: string]: unknown;
    id: string;
    title: string;
    horizon: string;
    target_date: string | null;
    goal_dimensions?: Array<{ dimension: string }>;
    goal_milestones?: Array<{ id: string; completed: boolean }>;
  }>;
  const goalsSummary = {
    total: activeGoals.length,
    byHorizon: {
      short: activeGoals.filter((g) => g.horizon === 'short').length,
      medium: activeGoals.filter((g) => g.horizon === 'medium').length,
      long: activeGoals.filter((g) => g.horizon === 'long').length,
    },
    nearestDeadline: activeGoals.length > 0
      ? activeGoals.reduce((nearest, g) => {
          const gDate = new Date(g.target_date as string).getTime();
          const nDate = nearest ? new Date(nearest.target_date as string).getTime() : Infinity;
          return gDate < nDate ? g : nearest;
        }, null as Record<string, unknown> | null)
      : null,
  };

  const scoresRecord = Object.fromEntries(
    (latestScores as { dimension: string; score: number }[]).map(s => [s.dimension, s.score])
  );
  const nudges = worldContext
    ? await generateNudges(scoresRecord, activeGoals, worldContext)
    : [];

  // Derive firstName: prefer profile field, fall back to email prefix
  const firstName =
    (profile as { first_name?: string } | null)?.first_name ??
    user.email?.split('@')[0] ??
    undefined;

  return (
    <DashboardClient
      latestScores={latestScores as { dimension: string; score: number }[]}
      overallScore={overallScore}
      streak={streak}
      dimensionTrends={dimensionTrends}
      recentInsights={recentInsights}
      goalsSummary={goalsSummary}
      activeGoals={activeGoals}
      nudges={nudges}
      firstName={firstName}
    />
  );
}
