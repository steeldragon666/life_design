import { ALL_DIMENSIONS, type Dimension } from '@life-design/core';
import type { NormalisedMLFeatures, SeasonName } from './types';

/**
 * Convert a dimension weight record into an array ordered by ALL_DIMENSIONS.
 * Falls back to 1.0 for any missing dimension.
 */
export function seasonWeightsToArray(weights: Record<Dimension, number>): number[] {
  return ALL_DIMENSIONS.map((dim) => weights[dim] ?? 1.0);
}

/**
 * One-hot encode the active season into the feature vector.
 * Maintenance is the reference category (all season flags = 0).
 */
export function applySeasonEncoding(
  features: NormalisedMLFeatures,
  season: SeasonName,
): NormalisedMLFeatures {
  return {
    ...features,
    season_sprint: season === 'Sprint' ? 1 : 0,
    season_recharge: season === 'Recharge' ? 1 : 0,
    season_exploration: season === 'Exploration' ? 1 : 0,
  };
}

/**
 * Returns a multiplier that adjusts guardian agent sigma thresholds
 * based on the active season and dimension.
 *
 * - Sprint + social: relaxed threshold (1.33x) -- social dips are expected.
 * - Recharge: tighter threshold (0.85x) -- we want earlier warnings.
 * - Default: no adjustment (1.0x).
 */
export function getGuardianThresholdMultiplier(
  season: SeasonName,
  dimension: Dimension,
): number {
  if (season === 'Sprint' && dimension === 'social') return 1.33;
  if (season === 'Recharge') return 0.85;
  return 1.0;
}
