import { createClient } from '@/lib/supabase/server';
import {
  getLatestScores,
  getStreakData,
} from '@/lib/services/dashboard-service';
import { getInsights } from '@/lib/services/insights-service';
import { getGoals } from '@/lib/services/goal-service';
import { computeStreak, computeOverallScore, Dimension, GoalStatus } from '@life-design/core';
import TodayFeed from '@/components/timeline/today-feed';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Guest mode — render with empty data
    return (
      <TodayFeed
        latestScores={[]}
        overallScore={0}
        streak={0}
        recentInsights={[]}
        activeGoals={[]}
        nudges={[]}
      />
    );
  }

  // Fetch first name for greeting
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', user.id)
    .maybeSingle();

  const today = new Date().toISOString().slice(0, 10);

  const [latestResult, streakResult, insightsResult, goalsResult] = await Promise.all([
    getLatestScores(user.id),
    getStreakData(user.id),
    getInsights(user.id, 3),
    getGoals(user.id, { status: GoalStatus.Active }),
  ]);

  const latestScores = (latestResult.data ?? []) as { dimension: string; score: number }[];
  const streakDates = streakResult.data ?? [];
  const streak = computeStreak(streakDates, today);
  const overallScore = latestScores.length > 0
    ? computeOverallScore(latestScores as { dimension: Dimension; score: number }[])
    : 0;

  const recentInsights = (insightsResult.data ?? []) as {
    id: string;
    type: string;
    title: string;
    body: string;
    dimension: string | null;
  }[];

  const activeGoals = (goalsResult.data ?? []) as Array<{
    id: string;
    title: string;
    horizon: string;
    target_date: string | null;
    goal_milestones?: Array<{ id: string; completed: boolean }>;
  }>;

  const firstName =
    (profile as { first_name?: string } | null)?.first_name ??
    user.email?.split('@')[0] ??
    undefined;

  return (
    <TodayFeed
      firstName={firstName}
      latestScores={latestScores}
      overallScore={overallScore}
      streak={streak}
      recentInsights={recentInsights}
      activeGoals={activeGoals}
      nudges={[]}
    />
  );
}
