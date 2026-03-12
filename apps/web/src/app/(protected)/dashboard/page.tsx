'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGuest } from '@/lib/guest-context';
import DashboardClient from './dashboard-client';
import {
  Dimension,
  ALL_DIMENSIONS,
  computeOverallScore,
  computeStreak,
  computeAllPairCorrelations,
  detectSignificantPatterns,
} from '@life-design/core';
import { getDeterministicNextNudgeSuggestion } from '@/lib/micro-moments';

export default function DashboardPage() {
  const router = useRouter();
  const { profile, goals, checkins, mentorProfile, conversationMemory, microMoments } = useGuest();

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

  const nextMicroMomentNudge = getDeterministicNextNudgeSuggestion({
    now: new Date(),
    profile,
    goals,
    checkins,
    mentorArchetype: mentorProfile.archetype,
    preferences: microMoments,
  });

  const correlationSeriesByDimension = ALL_DIMENSIONS.reduce<Record<string, number[]>>((acc, dimension) => {
    acc[dimension] = [];
    return acc;
  }, {});

  checkins
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((checkin) => {
      const scoreMap = new Map(checkin.dimension_scores.map((s) => [s.dimension, s.score] as const));
      ALL_DIMENSIONS.forEach((dimension) => {
        const score = scoreMap.get(dimension);
        correlationSeriesByDimension[dimension].push(typeof score === 'number' ? score : Number.NaN);
      });
    });

  const pairCorrelations = computeAllPairCorrelations(correlationSeriesByDimension);
  const significantPatterns = detectSignificantPatterns(pairCorrelations, 0.55).slice(0, 4);
  const correlationInsights = significantPatterns.map((pattern) => ({
    dimensionA: pattern.keyA,
    dimensionB: pattern.keyB,
    coefficient: pattern.correlation,
    lagDays: pattern.bestLag,
    confidence: pattern.confidence,
    insightText:
      pattern.direction === 'positive'
        ? `${pattern.keyA} and ${pattern.keyB} tend to rise together in your recent check-ins.`
        : `${pattern.keyA} and ${pattern.keyB} tend to move in opposite directions in your recent check-ins.`,
  }));
  const highlightedCorrelationPair =
    correlationInsights.length > 0
      ? ([correlationInsights[0].dimensionA, correlationInsights[0].dimensionB] as const)
      : null;
  const daysUntilFirstCorrelation = Math.max(0, 14 - checkins.length);

  return (
    <DashboardClient
      latestScores={latestScores}
      overallScore={overallScore}
      streak={streak}
      recentInsights={recentInsights}
      goalsSummary={goalsSummary}
      nudges={nudges}
      nextMicroMomentNudge={nextMicroMomentNudge}
      profile={profile}
      digestContext={{
        profile,
        goals,
        checkins,
        mentorProfile,
        conversationMemory,
      }}
      correlationInsights={correlationInsights}
      highlightedCorrelationPair={highlightedCorrelationPair}
      daysUntilFirstCorrelation={daysUntilFirstCorrelation}
    />
  );
}
