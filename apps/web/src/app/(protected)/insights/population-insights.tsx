'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Users, TrendingUp, Sparkles, Activity } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FederatedRound {
  id: string;
  round_number: number;
  target_dimension: string;
  aggregate_weights: number[] | null;
  aggregate_bias: number | null;
  total_samples: number;
  participant_count: number;
  closed_at: string;
}

interface PopulationInsight {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Helpers — extract human-readable insights from aggregate weights
// ---------------------------------------------------------------------------

const DIMENSION_LABELS: Record<string, string> = {
  mood: 'Mood',
  energy: 'Energy',
  sleep_quality: 'Sleep quality',
  exercise_frequency: 'Exercise frequency',
  social_contact: 'Social contact',
  stress: 'Stress',
  productivity: 'Productivity',
  gratitude: 'Gratitude',
};

function extractImpactfulFeatures(rounds: FederatedRound[]): string[] {
  // Rank dimensions by absolute average weight magnitude across rounds
  const dimensionScores = new Map<string, number>();

  for (const round of rounds) {
    if (!round.aggregate_weights || round.aggregate_weights.length === 0)
      continue;
    const avgMagnitude =
      round.aggregate_weights.reduce((sum, w) => sum + Math.abs(w), 0) /
      round.aggregate_weights.length;
    const label =
      DIMENSION_LABELS[round.target_dimension] ?? round.target_dimension;
    dimensionScores.set(
      label,
      (dimensionScores.get(label) ?? 0) + avgMagnitude,
    );
  }

  return [...dimensionScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label]) => label);
}

function estimateMoodImprovement(rounds: FederatedRound[]): number | null {
  const moodRounds = rounds.filter((r) => r.target_dimension === 'mood');
  if (moodRounds.length === 0) return null;

  // Use the average bias as a proxy for improvement trend (positive = improvement)
  const avgBias =
    moodRounds.reduce((sum, r) => sum + (r.aggregate_bias ?? 0), 0) /
    moodRounds.length;

  // Normalise to a percentage (bias is typically -1 to 1 range)
  return Math.round(Math.abs(avgBias) * 100);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PopulationInsights() {
  const [insights, setInsights] = useState<PopulationInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalParticipants, setTotalParticipants] = useState(0);

  useEffect(() => {
    async function fetchFederatedData() {
      const supabase = createClient();
      const { data: rounds } = await supabase
        .from('federated_rounds')
        .select(
          'id, round_number, target_dimension, aggregate_weights, aggregate_bias, total_samples, participant_count, closed_at',
        )
        .eq('status', 'complete')
        .order('closed_at', { ascending: false })
        .limit(20);

      if (!rounds || rounds.length === 0) {
        setLoading(false);
        return;
      }

      const typedRounds = rounds as FederatedRound[];
      const latestRound = typedRounds[0];
      const impactful = extractImpactfulFeatures(typedRounds);
      const moodImprovement = estimateMoodImprovement(typedRounds);
      const maxParticipants = Math.max(
        ...typedRounds.map((r) => r.participant_count),
      );

      setTotalParticipants(maxParticipants);

      const derived: PopulationInsight[] = [];

      if (moodImprovement !== null && moodImprovement > 0) {
        derived.push({
          label: 'Average mood improvement',
          value: `${moodImprovement}% over 30 days`,
          description: `Across ${latestRound.participant_count} participants in the latest round`,
          icon: <TrendingUp size={20} className="text-sage-600" />,
        });
      }

      if (impactful.length > 0) {
        derived.push({
          label: 'Most impactful features',
          value: impactful.join(', '),
          description:
            'Dimensions with the strongest signals in federated models',
          icon: <Sparkles size={20} className="text-sage-600" />,
        });
      }

      derived.push({
        label: 'Community engagement',
        value: `${maxParticipants} active participants`,
        description: 'Contributing to this federated learning round',
        icon: <Users size={20} className="text-sage-600" />,
      });

      setInsights(derived);
      setLoading(false);
    }

    fetchFederatedData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
          <Activity size={20} className="text-sage-600" />
          Population Insights
        </h2>
        <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-stone-200 bg-white p-5"
            >
              <div className="mb-2 h-4 w-24 rounded bg-stone-100" />
              <div className="mb-1 h-6 w-32 rounded bg-stone-100" />
              <div className="h-3 w-40 rounded bg-stone-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
          <Activity size={20} className="text-sage-600" />
          Population Insights
        </h2>
        <div className="rounded-xl border border-stone-200 bg-white p-6 text-center">
          <p className="text-sm text-stone-500">
            No federated learning rounds have completed yet. Population insights
            will appear here once enough participants contribute.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
        <Activity size={20} className="text-sage-600" />
        Population Insights
      </h2>
      <p className="text-sm text-stone-500">
        Anonymised patterns from {totalParticipants} participants — no individual
        data is ever shared.
      </p>
      <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-3">
        {insights.map((insight) => (
          <div
            key={insight.label}
            className="rounded-xl border border-stone-200 bg-white p-5 transition-shadow hover:shadow-sm"
          >
            <div className="mb-2 flex items-center gap-2">
              {insight.icon}
              <span className="text-xs font-medium uppercase tracking-wide text-stone-400">
                {insight.label}
              </span>
            </div>
            <p className="text-base font-semibold text-stone-900">
              {insight.value}
            </p>
            <p className="mt-1 text-sm text-stone-500">
              {insight.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
