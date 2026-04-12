import type { ModelArtifact } from '@life-design/core';
import { PersonalModel } from './personal-model';

export interface NOf1Prediction {
  value: number; // predicted score (1-5)
  confidence: number; // 0-1 confidence based on model R² and feature coverage
  predictionInterval: [number, number]; // prediction interval
  explanation: Array<{
    feature: string;
    contribution: number; // how much this feature pushed the prediction
    direction: 'positive' | 'negative';
  }>;
  isStale: boolean; // model older than staleness threshold
  anomalyFeatures: string[]; // features with values >2σ from expected
}

export interface NOf1Config {
  maxInteractionDepth?: number; // default 2 (pairwise interactions only)
  confidenceLevel?: number; // default 0.95
  stalenessThresholdDays?: number; // default 7
}

const DEFAULT_CONFIG: Required<NOf1Config> = {
  maxInteractionDepth: 2,
  confidenceLevel: 0.95,
  stalenessThresholdDays: 7,
};

/**
 * Z-score multipliers for common confidence levels (approximation).
 * Maps confidence level to the corresponding z critical value.
 */
function zForConfidence(level: number): number {
  // Common approximations
  if (level >= 0.99) return 2.576;
  if (level >= 0.95) return 1.96;
  if (level >= 0.9) return 1.645;
  if (level >= 0.8) return 1.282;
  // Linear interpolation fallback for unusual values
  return 1.96 * (level / 0.95);
}

/**
 * N-of-1 personalised prediction model.
 *
 * Wraps PersonalModel and adds:
 * - Confidence estimation based on R² and feature coverage
 * - Prediction intervals
 * - Feature contribution explanations
 * - Staleness detection
 * - Anomaly detection via z-score on input features
 * - Interaction feature generation
 */
export class NOf1Model {
  private personalModel: PersonalModel;
  private artifact: ModelArtifact;
  private config: Required<NOf1Config>;

  constructor(artifact: ModelArtifact, config?: NOf1Config) {
    this.artifact = artifact;
    this.personalModel = new PersonalModel(artifact);
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Run prediction with full N-of-1 analysis.
   */
  predict(features: Record<string, number>): NOf1Prediction {
    const value = this.personalModel.predict(features);
    const confidence = this.computeConfidence(features);
    const predictionInterval = this.computePredictionInterval(value, confidence);
    const explanation = this.computeExplanation(features);
    const isStale = this.checkStaleness();
    const anomalyFeatures = this.detectAnomalies(features);

    return {
      value,
      confidence,
      predictionInterval,
      explanation,
      isStale,
      anomalyFeatures,
    };
  }

  /**
   * Generate pairwise interaction feature names.
   */
  getInteractionFeatureNames(): string[] {
    const names = this.artifact.featureNames;
    const interactions: string[] = [];
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        interactions.push(`${names[i]}*${names[j]}`);
      }
    }
    return interactions;
  }

  /**
   * Compute pairwise interaction feature values.
   */
  computeInteractionFeatures(
    features: Record<string, number>,
  ): Record<string, number> {
    const names = this.artifact.featureNames;
    const result: Record<string, number> = {};
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const a = features[names[i]] ?? 0;
        const b = features[names[j]] ?? 0;
        result[`${names[i]}*${names[j]}`] = a * b;
      }
    }
    return result;
  }

  /**
   * Confidence = R² * featureCoverage.
   * featureCoverage = fraction of model features present in input.
   */
  private computeConfidence(features: Record<string, number>): number {
    const r2 = Math.max(0, Math.min(1, this.artifact.trainingMetrics.r2));
    const totalFeatures = this.artifact.featureNames.length;
    if (totalFeatures === 0) return 0;

    const presentFeatures = this.artifact.featureNames.filter(
      (name) => features[name] !== undefined,
    ).length;
    const coverage = presentFeatures / totalFeatures;

    return Math.max(0, Math.min(1, r2 * coverage));
  }

  /**
   * Prediction interval based on MSE and confidence level.
   * Width scales inversely with confidence (higher confidence = narrower interval
   * from good model, but wider z-multiplier is offset by lower MSE).
   */
  private computePredictionInterval(
    value: number,
    confidence: number,
  ): [number, number] {
    const mse = this.artifact.trainingMetrics.mse;
    const rmse = Math.sqrt(mse);
    const z = zForConfidence(this.config.confidenceLevel);

    // Scale interval width: lower model confidence => wider interval
    const effectiveConfidence = Math.max(0.01, confidence);
    const halfWidth = (z * rmse) / Math.sqrt(effectiveConfidence);

    const lower = Math.max(1, Math.round((value - halfWidth) * 10) / 10);
    const upper = Math.min(5, Math.round((value + halfWidth) * 10) / 10);

    return [lower, upper];
  }

  /**
   * Compute per-feature contributions to the prediction.
   * contribution_i = weight_i * feature_value_i
   */
  private computeExplanation(
    features: Record<string, number>,
  ): NOf1Prediction['explanation'] {
    const { featureNames, weights } = this.artifact;
    const entries: NOf1Prediction['explanation'] = [];

    for (let i = 0; i < featureNames.length; i++) {
      const featureValue = features[featureNames[i]] ?? 0;
      const contribution = weights[i] * featureValue;
      entries.push({
        feature: featureNames[i],
        contribution,
        direction: contribution >= 0 ? 'positive' : 'negative',
      });
    }

    // Sort by absolute contribution descending
    entries.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
    return entries;
  }

  /**
   * Check if the model is older than the staleness threshold.
   */
  private checkStaleness(): boolean {
    const createdAt = new Date(this.artifact.createdAt).getTime();
    const thresholdMs =
      this.config.stalenessThresholdDays * 24 * 60 * 60 * 1000;
    return Date.now() - createdAt >= thresholdMs;
  }

  /**
   * Detect input features that are >2 standard deviations from the training mean.
   */
  private detectAnomalies(features: Record<string, number>): string[] {
    const stats = this.artifact.featureStats;
    if (!stats) return [];

    const anomalies: string[] = [];
    for (const [name, value] of Object.entries(features)) {
      const stat = stats[name];
      if (!stat || stat.std === 0) continue;
      const zScore = Math.abs((value - stat.mean) / stat.std);
      if (zScore > 2) {
        anomalies.push(name);
      }
    }
    return anomalies;
  }

  /** Delegate to PersonalModel */
  getFeatureImportance() {
    return this.personalModel.getFeatureImportance();
  }

  get dimension(): string {
    return this.personalModel.dimension;
  }
}
