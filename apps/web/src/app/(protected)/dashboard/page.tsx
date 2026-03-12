'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGuest } from '@/lib/guest-context';
import DashboardClient from './dashboard-client';
import { Dimension, GoalStatus, computeOverallScore, computeStreak } from '@life-design/core';

export default function DashboardPage() {
  const router = useRouter();
  const { profile, goals, checkins } = useGuest();

  // Redirect to onboarding if not onboarded
  useEffect(() => {
    if (!profile?.onboarded) {
      router.push('/onboarding');
    }
  }, [profile, router]);

  if (!profile?.onboarded) {
    return null;
  }

  // Build latest scores from most recent checkin
  const latestCheckin = checkins[checkins.length - 1];
  const latestScores = latestCheckin?.dimension_scores || [];

  // Compute overall score
  const overallScore = latestScores.length > 0
    ? computeOverallScore(latestScores as { dimension: Dimension; score: number }[])
    : 0;

  // Compute streak
  const today = new Date().toISOString().slice(0, 10);
  const streakDates = checkins.map((c) => c.date);
  const streak = computeStreak(streakDates, today);

  // Build dimension trends
  const dimensionTrends: Record<string, { date: string; score: number }[]> = {};
  checkins.forEach((checkin) => {
    checkin.dimension_scores.forEach((ds) => {
      if (!dimensionTrends[ds.dimension]) {
        dimensionTrends[ds.dimension] = [];
      }
      dimensionTrends[ds.dimension].push({
        date: checkin.date,
        score: ds.score,
      });
    });
  });

  // Build goals summary
  const activeGoals = goals.filter((g) => g.status === 'active');
  const goalsSummary = {
    total: activeGoals.length,
    byHorizon: {
      short: activeGoals.filter((g) => g.horizon === 'short').length,
      medium: activeGoals.filter((g) => g.horizon === 'medium').length,
      long: activeGoals.filter((g) => g.horizon === 'long').length,
    },
    nearestDeadline: activeGoals.length > 0
      ? activeGoals.reduce((nearest, g) => {
          const gDate = new Date(g.target_date).getTime();
          const nDate = nearest ? new Date(nearest.target_date).getTime() : Infinity;
          return gDate < nDate ? g : nearest;
        }, null as any)
      : null,
  };

  // Mock insights (in production, these would come from AI analysis)
  const recentInsights = checkins.length > 2 ? [
    {
      id: '1',
      type: 'suggestion' as const,
      title: 'Keep up the momentum!',
      body: `You've checked in ${checkins.length} times. Consistency is key to achieving your goals.`,
      dimension: null,
    },
  ] : [];

  // Mock nudges based on profile
  const nudges = profile.interests?.length ? [
    {
      title: 'Personalized for you',
      body: `Based on your interest in ${profile.interests[0]}, consider setting a related goal.`,
    },
  ] : [];

  return (
    <DashboardClient
      latestScores={latestScores}
      overallScore={overallScore}
      streak={streak}
      dimensionTrends={dimensionTrends}
      recentInsights={recentInsights}
      goalsSummary={goalsSummary}
      nudges={nudges}
      profile={profile}
    />
  );
}
