/**
 * SHAP explainability layer for linear models.
 *
 * For a linear model, the marginal contribution (SHAP value) of each feature is:
 *   shap_i = weight_i * feature_value_i
 *
 * This module provides pure, testable functions to compute SHAP explanations
 * and generate human-readable summaries.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface SHAPContribution {
  feature: string;
  value: number; // raw feature value
  shapValue: number; // contribution to prediction
  direction: 'positive' | 'negative';
}

export interface SHAPExplanation {
  predictedValue: number;
  baseValue: number; // intercept
  contributions: SHAPContribution[];
  topPositive: SHAPContribution[]; // top 3 positive contributors
  topNegative: SHAPContribution[]; // top 3 negative contributors
  summary: string; // human-readable explanation
}

// ── Feature categorization ───────────────────────────────────────────────────

const CATEGORY_PREFIXES: [string[], string][] = [
  [['sleep_'], 'Sleep'],
  [['exercise_', 'steps_'], 'Exercise'],
  [['mood_', 'valence_'], 'Mood'],
  [['stress_', 'hrv_'], 'Stress'],
  [['social_', 'calendar_'], 'Social'],
  [['weather_', 'sunlight_'], 'Environment'],
  [['screen_'], 'Screen Time'],
  [['journal_'], 'Journaling'],
];

/**
 * Convert a snake_case feature name to Title Case.
 */
function toTitleCase(snakeName: string): string {
  return snakeName
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Map an internal feature name to a user-friendly category and display name.
 */
export function categorizeFeature(featureName: string): {
  category: string;
  friendlyName: string;
} {
  // Handle interaction features like "sleep_quality*exercise_minutes"
  if (featureName.includes('*')) {
    const parts = featureName.split('*');
    const friendlyParts = parts.map((p) => toTitleCase(p.trim()));
    return {
      category: 'Other',
      friendlyName: friendlyParts.join(' * '),
    };
  }

  for (const [prefixes, category] of CATEGORY_PREFIXES) {
    for (const prefix of prefixes) {
      if (featureName.startsWith(prefix)) {
        return { category, friendlyName: toTitleCase(featureName) };
      }
    }
  }

  return { category: 'Other', friendlyName: toTitleCase(featureName) };
}

// ── SHAP computation ─────────────────────────────────────────────────────────

/**
 * Resolve the raw value of a feature, computing interaction products when needed.
 */
function resolveFeatureValue(
  featureName: string,
  features: Record<string, number>,
  interactionFeatures?: string[],
): number {
  // Check if this is an interaction feature
  if (interactionFeatures?.includes(featureName) && featureName.includes('*')) {
    const parts = featureName.split('*');
    return parts.reduce((product, part) => {
      return product * (features[part.trim()] ?? 0);
    }, 1);
  }

  return features[featureName] ?? 0;
}

/**
 * Compute linear SHAP values for a set of features.
 *
 * @param weights       Model weights (one per feature)
 * @param intercept     Model intercept (base value)
 * @param featureNames  Ordered feature names matching weights
 * @param featureValues Raw feature values (keyed by name)
 * @param interactionFeatures Optional list of interaction feature names
 */
export function computeSHAPValues(
  weights: number[],
  intercept: number,
  featureNames: string[],
  featureValues: Record<string, number>,
  interactionFeatures?: string[],
): SHAPExplanation {
  const contributions: SHAPContribution[] = [];
  let predictedValue = intercept;

  for (let i = 0; i < featureNames.length; i++) {
    const featureName = featureNames[i];
    const value = resolveFeatureValue(
      featureName,
      featureValues,
      interactionFeatures,
    );
    const shapValue = weights[i] * value;
    predictedValue += shapValue;

    contributions.push({
      feature: featureName,
      value,
      shapValue,
      direction: shapValue >= 0 ? 'positive' : 'negative',
    });
  }

  // Sort by absolute SHAP value descending
  contributions.sort(
    (a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue),
  );

  const positives = contributions
    .filter((c) => c.shapValue > 0)
    .sort((a, b) => b.shapValue - a.shapValue)
    .slice(0, 3);

  const negatives = contributions
    .filter((c) => c.shapValue < 0)
    .sort((a, b) => a.shapValue - b.shapValue)
    .slice(0, 3);

  const explanation: SHAPExplanation = {
    predictedValue,
    baseValue: intercept,
    contributions,
    topPositive: positives,
    topNegative: negatives,
    summary: '',
  };

  explanation.summary = generateExplanationText(explanation, 'overall');

  return explanation;
}

// ── Human-readable explanation ───────────────────────────────────────────────

/**
 * Format a single contribution for display: "friendly name (+0.6)" or "friendly name (-0.3)"
 */
function formatContribution(c: SHAPContribution): string {
  const { friendlyName } = categorizeFeature(c.feature);
  const sign = c.shapValue >= 0 ? '+' : '';
  const rounded = Math.round(c.shapValue * 10) / 10;
  return `${friendlyName} (${sign}${rounded})`;
}

/**
 * Generate a human-readable explanation of a SHAP result.
 */
export function generateExplanationText(
  explanation: SHAPExplanation,
  targetDimension: string,
): string {
  const { predictedValue, topPositive, topNegative } = explanation;
  const score = Math.round(predictedValue * 10) / 10;

  const hasPositive = topPositive.length > 0;
  const hasNegative = topNegative.length > 0;

  if (!hasPositive && !hasNegative) {
    return `Your ${targetDimension} score of ${score} is close to your baseline.`;
  }

  const positiveText = topPositive.map(formatContribution).join(', ');
  const negativeText = topNegative.map(formatContribution).join(', ');

  if (hasPositive && hasNegative) {
    return `Your ${targetDimension} score of ${score} was mainly driven by ${positiveText}, partially offset by ${negativeText}.`;
  }

  if (hasPositive) {
    return `Your ${targetDimension} score of ${score} was mainly driven by ${positiveText}.`;
  }

  // Only negatives
  return `Your ${targetDimension} score of ${score} was mainly pulled down by ${negativeText}.`;
}
