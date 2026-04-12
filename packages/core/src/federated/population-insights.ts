import { FederatedModel, computeModelDrift } from './aggregation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PopulationInsight {
  dimension: string;
  participantCount: number;
  topFeatures: Array<{
    feature: string;
    importance: number; // normalized 0-1
    direction: 'positive' | 'negative';
  }>;
  modelConfidence: number; // based on participant count and convergence
  lastUpdated: string;
}

export interface PopulationTrend {
  dimension: string;
  versions: Array<{
    version: number;
    participantCount: number;
    topFeature: string;
    drift: number; // from previous version
  }>;
  convergenceStatus: 'converging' | 'diverging' | 'stable';
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Extract feature importance from aggregate weights and compute model confidence.
 *
 * Confidence formula: min(1, participantCount / 50)
 * Feature importance is derived from absolute weight magnitude, normalized to 0-1.
 */
export function computePopulationInsight(
  model: FederatedModel,
  featureNames: string[],
): PopulationInsight {
  const absWeights = model.weights.map((w) => Math.abs(w));
  const maxWeight = Math.max(...absWeights, 0);

  const features = featureNames.map((name, i) => {
    const weight = i < model.weights.length ? model.weights[i] : 0;
    const absWeight = Math.abs(weight);
    return {
      feature: name,
      importance: maxWeight > 0 ? absWeight / maxWeight : 0,
      direction: (weight >= 0 ? 'positive' : 'negative') as 'positive' | 'negative',
    };
  });

  // Sort by importance descending
  features.sort((a, b) => b.importance - a.importance);

  const confidence = Math.min(1, model.participantCount / 50);

  return {
    dimension: model.targetDimension,
    participantCount: model.participantCount,
    topFeatures: features,
    modelConfidence: confidence,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Track how a model evolves across versions for a single dimension.
 *
 * Convergence status:
 * - avg drift < 0.05 => converging
 * - avg drift > 0.15 => diverging
 * - otherwise => stable
 */
export function computePopulationTrend(
  models: FederatedModel[],
  featureNames: string[],
): PopulationTrend {
  // Sort by version ascending
  const sorted = [...models].sort((a, b) => a.modelVersion - b.modelVersion);

  const versions = sorted.map((model, i) => {
    const drift =
      i === 0 ? 0 : computeModelDrift(sorted[i - 1].weights, model.weights);

    // Find top feature by absolute weight
    let topFeatureIdx = 0;
    let topAbsWeight = 0;
    for (let j = 0; j < model.weights.length; j++) {
      const abs = Math.abs(model.weights[j]);
      if (abs > topAbsWeight) {
        topAbsWeight = abs;
        topFeatureIdx = j;
      }
    }

    return {
      version: model.modelVersion,
      participantCount: model.participantCount,
      topFeature: featureNames[topFeatureIdx] ?? `feature_${topFeatureIdx}`,
      drift,
    };
  });

  // Compute average drift (excluding first version which has drift=0)
  const driftValues = versions.filter((v) => v.drift > 0).map((v) => v.drift);
  const avgDrift =
    driftValues.length > 0
      ? driftValues.reduce((s, d) => s + d, 0) / driftValues.length
      : 0;

  let convergenceStatus: 'converging' | 'diverging' | 'stable';
  if (avgDrift < 0.05) {
    convergenceStatus = 'converging';
  } else if (avgDrift > 0.15) {
    convergenceStatus = 'diverging';
  } else {
    convergenceStatus = 'stable';
  }

  return {
    dimension: sorted[0]?.targetDimension ?? '',
    versions,
    convergenceStatus,
  };
}

/**
 * Generate a human-readable summary of population insights.
 * Always includes participant count for transparency.
 */
export function generatePopulationSummary(insights: PopulationInsight[]): string {
  if (insights.length === 0) {
    return 'No population insights are available yet. Check back once more participants have contributed.';
  }

  // Use the max participant count across all insights
  const maxParticipants = Math.max(...insights.map((i) => i.participantCount));

  if (insights.length === 1) {
    const insight = insights[0];
    const topFeature = insight.topFeatures[0];
    if (topFeature) {
      return `Across ${insight.participantCount} participants, ${topFeature.feature} is the strongest predictor of ${insight.dimension} scores.`;
    }
    return `Across ${insight.participantCount} participants, population patterns for ${insight.dimension} are being tracked.`;
  }

  // Multiple dimensions: highlight top feature per dimension
  const parts = insights
    .filter((i) => i.topFeatures.length > 0)
    .map((i) => `${i.topFeatures[0].feature} most impacts ${i.dimension} levels`);

  return `Across ${maxParticipants} participants, ${parts.join(', while ')}.`;
}

/**
 * Check if there are enough participants for k-anonymity.
 * Returns true if participantCount >= minThreshold.
 */
export function anonymizationCheck(
  participantCount: number,
  minThreshold: number = 10,
): boolean {
  return participantCount >= minThreshold;
}
