import { createClient } from '@/lib/supabase/server';
import {
  OptInTier,
  isFeatureAvailable,
  computePopulationInsight,
  computePopulationTrend,
  generatePopulationSummary,
  anonymizationCheck,
} from '@life-design/core';
import type { FederatedModel, PopulationInsight } from '@life-design/core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function convergenceColor(status: 'converging' | 'diverging' | 'stable') {
  switch (status) {
    case 'converging':
      return 'bg-green-100 text-green-800';
    case 'stable':
      return 'bg-yellow-100 text-yellow-800';
    case 'diverging':
      return 'bg-red-100 text-red-800';
  }
}

function convergenceLabel(status: 'converging' | 'diverging' | 'stable') {
  switch (status) {
    case 'converging':
      return 'Converging';
    case 'stable':
      return 'Stable';
    case 'diverging':
      return 'Diverging';
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PopulationInsightsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold">Population Patterns</h1>
        <p className="text-stone-600">Please sign in to view population insights.</p>
      </div>
    );
  }

  // Check user has opted in to federated learning (Full tier)
  const { data: profile } = await supabase
    .from('profiles')
    .select('opt_in_tier')
    .eq('id', user.id)
    .single();

  const userTier = (profile?.opt_in_tier as OptInTier) ?? OptInTier.Basic;
  const hasAccess = isFeatureAvailable(userTier, OptInTier.Full);

  if (!hasAccess) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold">Population Patterns</h1>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-8 text-center">
          <p className="mb-4 text-stone-600">
            Population insights require the Full data-sharing tier. This allows
            your anonymized model gradients to contribute to community patterns.
          </p>
          <a
            href="/settings"
            className="inline-flex items-center rounded-lg bg-sage-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sage-600"
          >
            Update sharing preferences
          </a>
        </div>
      </div>
    );
  }

  // Fetch latest federated models
  const { data: rawModels } = await supabase
    .from('federated_models')
    .select('target_dimension, model_version, weights, bias, total_samples, participant_count, created_at')
    .order('model_version', { ascending: false });

  // Fetch feature names from model_artifacts (use any recent artifact to get feature labels)
  const { data: artifactRow } = await supabase
    .from('model_artifacts')
    .select('feature_names')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const featureNames: string[] = artifactRow?.feature_names ?? [];

  if (!rawModels || rawModels.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold">Population Patterns</h1>
        <div className="rounded-xl border border-stone-200 bg-white p-8 text-center">
          <p className="text-stone-500">
            No federated models have been created yet. Population patterns will
            appear here once enough participants contribute to federated learning
            rounds.
          </p>
        </div>
      </div>
    );
  }

  // Group models by dimension, keeping all versions for trend analysis
  const modelsByDimension = new Map<string, FederatedModel[]>();
  for (const row of rawModels) {
    const model: FederatedModel = {
      targetDimension: row.target_dimension,
      modelVersion: row.model_version,
      weights: Array.isArray(row.weights) ? row.weights : [],
      bias: typeof row.bias === 'number' ? row.bias : Number(row.bias) || 0,
      totalSamples: row.total_samples,
      participantCount: row.participant_count,
    };
    const existing = modelsByDimension.get(model.targetDimension) ?? [];
    existing.push(model);
    modelsByDimension.set(model.targetDimension, existing);
  }

  // For each dimension, get the latest model for insights
  const insights: PopulationInsight[] = [];
  const trends: Array<ReturnType<typeof computePopulationTrend>> = [];

  for (const [dimension, models] of modelsByDimension) {
    const sorted = models.sort((a, b) => b.modelVersion - a.modelVersion);
    const latest = sorted[0];

    // Check k-anonymity before showing any data
    if (!anonymizationCheck(latest.participantCount)) {
      continue;
    }

    insights.push(computePopulationInsight(latest, featureNames));
    if (models.length > 1) {
      trends.push(computePopulationTrend(models, featureNames));
    }
  }

  // Check if all dimensions were filtered out due to low participant count
  const maxParticipants = rawModels.reduce(
    (max, r) => Math.max(max, r.participant_count),
    0,
  );

  if (insights.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold">Population Patterns</h1>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
          <p className="text-amber-800">
            Not enough participants yet. Population insights require at least 10
            contributors for privacy. Currently {maxParticipants} participant
            {maxParticipants === 1 ? ' has' : 's have'} contributed.
          </p>
        </div>
      </div>
    );
  }

  const summary = generatePopulationSummary(insights);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Population Patterns</h1>
      <p className="mb-6 text-sm text-stone-500">
        Aggregated patterns from anonymous participants. These reflect
        population-level trends, not individual recommendations.
      </p>

      {/* Summary */}
      <div className="mb-6 rounded-xl border border-stone-200 bg-white p-5">
        <p className="text-stone-700">{summary}</p>
      </div>

      {/* Insight cards */}
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
        {insights.map((insight) => {
          const trend = trends.find((t) => t.dimension === insight.dimension);
          return (
            <div
              key={insight.dimension}
              className="rounded-xl border border-stone-200 bg-white p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold capitalize text-stone-900">
                  {insight.dimension.replace(/_/g, ' ')}
                </h3>
                {trend && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${convergenceColor(trend.convergenceStatus)}`}
                  >
                    {convergenceLabel(trend.convergenceStatus)}
                  </span>
                )}
              </div>

              <p className="mb-3 text-xs text-stone-400">
                {insight.participantCount} participants | Confidence:{' '}
                {Math.round(insight.modelConfidence * 100)}%
              </p>

              <div className="space-y-2">
                {insight.topFeatures.slice(0, 3).map((feature) => (
                  <div key={feature.feature} className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-stone-700">
                          {feature.feature.replace(/_/g, ' ')}
                        </span>
                        <span
                          className={
                            feature.direction === 'positive'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {feature.direction === 'positive' ? '+' : '-'}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-stone-100">
                        <div
                          className={`h-1.5 rounded-full ${
                            feature.direction === 'positive'
                              ? 'bg-green-400'
                              : 'bg-red-400'
                          }`}
                          style={{ width: `${Math.round(feature.importance * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Transparency disclaimer */}
      <div className="mt-6 rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
        <p className="text-xs text-stone-500">
          This data is aggregated from {Math.max(...insights.map((i) => i.participantCount))}{' '}
          participants. No individual data is ever shared. These are population
          patterns, not personal recommendations.
        </p>
      </div>
    </div>
  );
}
