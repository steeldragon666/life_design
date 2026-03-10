import { createClient } from '@/lib/supabase/server';
import {
  getLatestScores,
  getScoreHistory,
  getStreakData,
} from '@/lib/services/dashboard-service';
import { computeStreak, computeOverallScore, DIMENSION_LABELS, Dimension } from '@life-design/core';
import DashboardClient from './dashboard-client';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p>Loading...</p>;
  }

  const today = new Date().toISOString().slice(0, 10);

  const [latestResult, historyResult, streakResult] = await Promise.all([
    getLatestScores(user.id),
    getScoreHistory(user.id, 30),
    getStreakData(user.id),
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

  return (
    <DashboardClient
      latestScores={latestScores as { dimension: string; score: number }[]}
      overallScore={overallScore}
      streak={streak}
      dimensionTrends={dimensionTrends}
    />
  );
}
