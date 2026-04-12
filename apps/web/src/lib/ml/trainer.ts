/**
 * LocalTrainer — 3-tier on-device training pipeline.
 *
 * Tier 1 (Cold Start, 0-7 check-ins):
 *   Heuristic weights from weights.json. No training.
 *
 * Tier 2 (Warm, 7-14 check-ins):
 *   Ordinary least squares (OLS) linear regression per dimension.
 *
 * Tier 3 (Personalised, 14+ check-ins):
 *   Gradient-boosted decision stumps (depth 1-3) in pure TypeScript.
 *
 * All persistence goes through Dexie `mlModelWeights` table.
 */

import { Dimension, ALL_DIMENSIONS } from '@life-design/core';
import { db } from '@/lib/db';
import defaultWeights from './models/weights.json';
import type {
  NormalisedMLFeatures,
  TrainingPair,
  PredictionResult,
  FeatureWeight,
  ModelTier,
  ModelWeightsRecord,
  TrainerConfig,
} from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_SCORE = 3;

const DEFAULT_CONFIG: TrainerConfig = {
  minSamplesWarm: 7,
  minSamplesPersonalised: 14,
  learningRate: 0.1,
  maxIterations: 50,
  maxDepth: 3,
  lossFunction: 'mse',
  validationSplit: 0.2,
};

/** Human-readable labels for ML features. */
const FEATURE_LABELS: Record<keyof NormalisedMLFeatures, string> = {
  sleep_duration_score: 'Sleep duration',
  sleep_quality_score: 'Sleep quality',
  physical_strain: 'Physical strain',
  recovery_status: 'Recovery status',
  meeting_load: 'Meeting load',
  context_switching_penalty: 'Context switching',
  deep_work_opportunity: 'Deep work opportunity',
  after_hours_work: 'After-hours work',
  digital_fatigue: 'Digital fatigue',
  doomscroll_index: 'Doomscroll index',
  audio_valence: 'Music mood',
  audio_energy: 'Music energy',
  day_of_week_sin: 'Day (sin)',
  day_of_week_cos: 'Day (cos)',
  is_weekend: 'Weekend',
  season_sprint: 'Sprint season',
  season_recharge: 'Recharge season',
  season_exploration: 'Exploration season',
};

/** Numeric feature keys used for training (excludes boolean / cyclic). */
const NUMERIC_FEATURE_KEYS: (keyof NormalisedMLFeatures)[] = [
  'sleep_duration_score',
  'sleep_quality_score',
  'physical_strain',
  'recovery_status',
  'meeting_load',
  'context_switching_penalty',
  'deep_work_opportunity',
  'after_hours_work',
  'digital_fatigue',
  'doomscroll_index',
  'audio_valence',
  'audio_energy',
];

/** All dimension keys + 'mood' for weight lookup. */
type WeightKey = Dimension | 'mood';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function featureToNumber(
  features: NormalisedMLFeatures,
  key: keyof NormalisedMLFeatures,
): number {
  const val = features[key];
  return typeof val === 'boolean' ? (val ? 1 : 0) : (val as number);
}

function featureVector(features: NormalisedMLFeatures): number[] {
  return NUMERIC_FEATURE_KEYS.map((k) => featureToNumber(features, k));
}

function getWeightsForTarget(
  target: WeightKey,
): Record<string, number> {
  return (defaultWeights as Record<string, Record<string, number>>)[target] ?? {};
}

function topNWeights(
  coefficients: Record<string, number>,
  n = 3,
): FeatureWeight[] {
  return Object.entries(coefficients)
    .filter(([, w]) => w !== 0)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, n)
    .map(([feature, weight]) => ({
      feature: feature as keyof NormalisedMLFeatures,
      weight,
      humanLabel: FEATURE_LABELS[feature as keyof NormalisedMLFeatures] ?? feature,
    }));
}

// ---------------------------------------------------------------------------
// OLS (Ordinary Least Squares) Linear Regression
// ---------------------------------------------------------------------------

interface OLSResult {
  coefficients: number[]; // one per feature
  intercept: number;
}

function olsRegression(X: number[][], y: number[]): OLSResult {
  const n = X.length;
  const p = X[0]!.length;

  // X with intercept column
  const Xa = X.map((row) => [...row, 1]);
  const cols = p + 1;

  // X^T X
  const XtX: number[][] = Array.from({ length: cols }, () =>
    new Array(cols).fill(0) as number[],
  );
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < cols; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) sum += Xa[k]![i]! * Xa[k]![j]!;
      XtX[i]![j] = sum;
    }
  }

  // X^T y
  const Xty: number[] = new Array(cols).fill(0) as number[];
  for (let i = 0; i < cols; i++) {
    let sum = 0;
    for (let k = 0; k < n; k++) sum += Xa[k]![i]! * y[k]!;
    Xty[i] = sum;
  }

  // Solve via Gaussian elimination with partial pivoting
  const augmented = XtX.map((row, i) => [...row, Xty[i]!]);

  for (let col = 0; col < cols; col++) {
    // Partial pivoting
    let maxRow = col;
    let maxVal = Math.abs(augmented[col]![col]!);
    for (let row = col + 1; row < cols; row++) {
      const v = Math.abs(augmented[row]![col]!);
      if (v > maxVal) {
        maxVal = v;
        maxRow = row;
      }
    }
    if (maxRow !== col) {
      [augmented[col], augmented[maxRow]] = [augmented[maxRow]!, augmented[col]!];
    }

    const pivot = augmented[col]![col]!;
    if (Math.abs(pivot) < 1e-12) continue; // singular — skip

    for (let row = col + 1; row < cols; row++) {
      const factor = augmented[row]![col]! / pivot;
      for (let j = col; j <= cols; j++) {
        augmented[row]![j]! -= factor * augmented[col]![j]!;
      }
    }
  }

  // Back substitution
  const beta = new Array(cols).fill(0) as number[];
  for (let i = cols - 1; i >= 0; i--) {
    let sum = augmented[i]![cols]!;
    for (let j = i + 1; j < cols; j++) {
      sum -= augmented[i]![j]! * beta[j]!;
    }
    const diag = augmented[i]![i]!;
    beta[i] = Math.abs(diag) < 1e-12 ? 0 : sum / diag;
  }

  return {
    coefficients: beta.slice(0, p),
    intercept: beta[p]!,
  };
}

// ---------------------------------------------------------------------------
// Gradient-Boosted Decision Stumps
// ---------------------------------------------------------------------------

interface TreeNode {
  featureIndex: number;
  threshold: number;
  leftValue: number;
  rightValue: number;
  leftChild?: TreeNode;
  rightChild?: TreeNode;
}

interface BoostingModel {
  trees: TreeNode[];
  intercept: number;
  learningRate: number;
}

function buildStump(
  X: number[][],
  residuals: number[],
  maxDepth: number,
  depth = 0,
): TreeNode {
  const n = X.length;
  const p = X[0]!.length;

  const mean = residuals.reduce((a, b) => a + b, 0) / n;

  if (depth >= maxDepth || n <= 2) {
    return {
      featureIndex: 0,
      threshold: 0,
      leftValue: mean,
      rightValue: mean,
    };
  }

  let bestFeature = 0;
  let bestThreshold = 0.5;
  let bestLoss = Infinity;
  let bestLeftMean = mean;
  let bestRightMean = mean;

  for (let f = 0; f < p; f++) {
    // Collect unique thresholds
    const vals = [...new Set(X.map((row) => row[f]!))].sort((a, b) => a - b);

    for (let t = 0; t < vals.length - 1; t++) {
      const threshold = (vals[t]! + vals[t + 1]!) / 2;

      let leftSum = 0;
      let leftCount = 0;
      let rightSum = 0;
      let rightCount = 0;

      for (let i = 0; i < n; i++) {
        if (X[i]![f]! <= threshold) {
          leftSum += residuals[i]!;
          leftCount++;
        } else {
          rightSum += residuals[i]!;
          rightCount++;
        }
      }

      if (leftCount === 0 || rightCount === 0) continue;

      const leftMean = leftSum / leftCount;
      const rightMean = rightSum / rightCount;

      // MSE
      let loss = 0;
      for (let i = 0; i < n; i++) {
        const pred = X[i]![f]! <= threshold ? leftMean : rightMean;
        loss += (residuals[i]! - pred) ** 2;
      }

      if (loss < bestLoss) {
        bestLoss = loss;
        bestFeature = f;
        bestThreshold = threshold;
        bestLeftMean = leftMean;
        bestRightMean = rightMean;
      }
    }
  }

  const node: TreeNode = {
    featureIndex: bestFeature,
    threshold: bestThreshold,
    leftValue: bestLeftMean,
    rightValue: bestRightMean,
  };

  // Recurse for deeper trees
  if (depth + 1 < maxDepth) {
    const leftIndices: number[] = [];
    const rightIndices: number[] = [];
    for (let i = 0; i < n; i++) {
      if (X[i]![bestFeature]! <= bestThreshold) leftIndices.push(i);
      else rightIndices.push(i);
    }

    if (leftIndices.length > 1) {
      const leftX = leftIndices.map((i) => X[i]!);
      const leftRes = leftIndices.map((i) => residuals[i]! - bestLeftMean);
      node.leftChild = buildStump(leftX, leftRes, maxDepth, depth + 1);
    }
    if (rightIndices.length > 1) {
      const rightX = rightIndices.map((i) => X[i]!);
      const rightRes = rightIndices.map((i) => residuals[i]! - bestRightMean);
      node.rightChild = buildStump(rightX, rightRes, maxDepth, depth + 1);
    }
  }

  return node;
}

function predictTree(node: TreeNode, x: number[]): number {
  if (x[node.featureIndex]! <= node.threshold) {
    if (node.leftChild) return node.leftValue + predictTree(node.leftChild, x);
    return node.leftValue;
  }
  if (node.rightChild) return node.rightValue + predictTree(node.rightChild, x);
  return node.rightValue;
}

function trainGradientBoosting(
  X: number[][],
  y: number[],
  config: TrainerConfig,
): BoostingModel {
  const n = X.length;
  const intercept = y.reduce((a, b) => a + b, 0) / n;
  const predictions = new Array(n).fill(intercept) as number[];
  const trees: TreeNode[] = [];

  for (let iter = 0; iter < config.maxIterations; iter++) {
    // Compute residuals
    const residuals = y.map((yi, i) => yi - predictions[i]!);

    // Check convergence
    const mse =
      residuals.reduce((a, r) => a + r * r, 0) / n;
    if (mse < 0.01) break;

    // Build tree on residuals
    const tree = buildStump(X, residuals, config.maxDepth);
    trees.push(tree);

    // Update predictions
    for (let i = 0; i < n; i++) {
      predictions[i]! += config.learningRate * predictTree(tree, X[i]!);
    }
  }

  return { trees, intercept, learningRate: config.learningRate };
}

function predictBoosting(model: BoostingModel, x: number[]): number {
  let pred = model.intercept;
  for (const tree of model.trees) {
    pred += model.learningRate * predictTree(tree, x);
  }
  return pred;
}

// ---------------------------------------------------------------------------
// Feature Importance from Gradient Boosting
// ---------------------------------------------------------------------------

function extractBoostingCoefficients(
  model: BoostingModel,
  featureKeys: (keyof NormalisedMLFeatures)[],
): Record<string, number> {
  const importance: Record<string, number> = {};
  for (const key of featureKeys) importance[key] = 0;

  function accumulateImportance(node: TreeNode, weight: number) {
    const key = featureKeys[node.featureIndex];
    if (key) {
      // Use absolute difference between left and right as importance proxy
      const diff = Math.abs(node.leftValue - node.rightValue) * weight;
      importance[key] = (importance[key] ?? 0) + diff;
    }
    if (node.leftChild) accumulateImportance(node.leftChild, weight * 0.5);
    if (node.rightChild) accumulateImportance(node.rightChild, weight * 0.5);
  }

  for (const tree of model.trees) {
    accumulateImportance(tree, model.learningRate);
  }

  // Normalise to sum = 1
  const total = Object.values(importance).reduce(
    (a, b) => a + Math.abs(b),
    0,
  );
  if (total > 0) {
    for (const key of Object.keys(importance)) {
      importance[key] = importance[key]! / total;
    }
  }

  return importance;
}

// ---------------------------------------------------------------------------
// LocalTrainer
// ---------------------------------------------------------------------------

export class LocalTrainer {
  private config: TrainerConfig;
  private currentModel: ModelWeightsRecord | null = null;
  private boostingModels = new Map<string, BoostingModel>();

  constructor(config?: Partial<TrainerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  async predict(features: NormalisedMLFeatures): Promise<PredictionResult> {
    await this.loadCurrentModel();

    const sampleSize = this.currentModel?.sampleSize ?? 0;
    const tier = this.determineTier(sampleSize);

    switch (tier) {
      case 'cold':
        return this.predictColdStart(features);
      case 'warm':
        return this.predictWarm(features);
      case 'personalized':
        return this.predictPersonalised(features);
    }
  }

  async train(pairs: TrainingPair[]): Promise<ModelWeightsRecord> {
    const sampleSize = pairs.length;
    const tier = this.determineTier(sampleSize);

    let coefficients: Record<string, number> = {};
    let validationLoss = 0;
    const subjectivityGaps: Record<string, number> = {};

    if (tier === 'cold') {
      // No training needed — use heuristic weights
      for (const dim of ALL_DIMENSIONS) {
        const weights = getWeightsForTarget(dim);
        for (const [k, v] of Object.entries(weights)) {
          coefficients[`${dim}:${k}`] = v;
        }
      }
      const moodWeights = getWeightsForTarget('mood');
      for (const [k, v] of Object.entries(moodWeights)) {
        coefficients[`mood:${k}`] = v;
      }
    } else if (tier === 'warm') {
      const result = this.trainWarm(pairs);
      coefficients = result.coefficients;
      validationLoss = result.validationLoss;
    } else {
      const result = this.trainPersonalised(pairs);
      coefficients = result.coefficients;
      validationLoss = result.validationLoss;
    }

    // Compute subjectivity gaps
    this.computeSubjectivityGaps(pairs, features =>
      this.predictWithCoefficients(features, coefficients, tier, sampleSize),
      subjectivityGaps,
    );

    // Build model record
    const version = (this.currentModel?.version ?? 0) + 1;
    const record: ModelWeightsRecord = {
      id: 'current',
      tier,
      version,
      updatedAt: Date.now(),
      sampleSize,
      coefficients,
      subjectivityGaps,
      validationLoss,
    };

    // Persist: rotate current → previous, save new current
    await this.persistModel(record);
    this.currentModel = record;

    return record;
  }

  getModelInfo(): ModelWeightsRecord | null {
    return this.currentModel;
  }

  // -----------------------------------------------------------------------
  // Tier determination
  // -----------------------------------------------------------------------

  private determineTier(sampleSize: number): ModelTier {
    if (sampleSize >= this.config.minSamplesPersonalised) return 'personalized';
    if (sampleSize >= this.config.minSamplesWarm) return 'warm';
    return 'cold';
  }

  // -----------------------------------------------------------------------
  // Cold Start prediction
  // -----------------------------------------------------------------------

  private predictColdStart(features: NormalisedMLFeatures): PredictionResult {
    const scores = {} as Record<Dimension, number>;
    const confidence = {} as Record<Dimension, number>;
    const topWeightsMap = {} as Record<Dimension, FeatureWeight[]>;

    for (const dim of ALL_DIMENSIONS) {
      const weights = getWeightsForTarget(dim);
      let sum = 0;
      for (const [feature, weight] of Object.entries(weights)) {
        const val = featureToNumber(
          features,
          feature as keyof NormalisedMLFeatures,
        );
        sum += weight * (val - 0.5);
      }
      scores[dim] = clamp(BASE_SCORE + sum * 5, 1, 5);
      confidence[dim] = 0.3;
      topWeightsMap[dim] = topNWeights(weights);
    }

    // Mood
    const moodWeights = getWeightsForTarget('mood');
    let moodSum = 0;
    for (const [feature, weight] of Object.entries(moodWeights)) {
      const val = featureToNumber(
        features,
        feature as keyof NormalisedMLFeatures,
      );
      moodSum += weight * (val - 0.5);
    }
    const mood = clamp(BASE_SCORE + moodSum * 5, 1, 5);

    return { scores, mood, confidence, topWeights: topWeightsMap };
  }

  // -----------------------------------------------------------------------
  // Warm prediction (OLS)
  // -----------------------------------------------------------------------

  private predictWarm(features: NormalisedMLFeatures): PredictionResult {
    if (!this.currentModel) return this.predictColdStart(features);

    const sampleSize = this.currentModel.sampleSize;
    const warmConfidence =
      0.3 + 0.3 * (sampleSize - this.config.minSamplesWarm) / (this.config.minSamplesPersonalised - this.config.minSamplesWarm);
    const coefficients = this.currentModel.coefficients;

    return this.predictWithCoefficients(
      features,
      coefficients,
      'warm',
      sampleSize,
      warmConfidence,
    );
  }

  // -----------------------------------------------------------------------
  // Personalised prediction (Gradient Boosting)
  // -----------------------------------------------------------------------

  private predictPersonalised(features: NormalisedMLFeatures): PredictionResult {
    if (!this.currentModel) return this.predictColdStart(features);

    const scores = {} as Record<Dimension, number>;
    const confidence = {} as Record<Dimension, number>;
    const topWeightsMap = {} as Record<Dimension, FeatureWeight[]>;
    const x = featureVector(features);
    const coefficients = this.currentModel.coefficients;
    const gaps = this.currentModel.subjectivityGaps;

    for (const dim of ALL_DIMENSIONS) {
      const model = this.boostingModels.get(dim);
      if (model) {
        scores[dim] = clamp(predictBoosting(model, x), 1, 5);
        const dimCoeffs = extractBoostingCoefficients(model, NUMERIC_FEATURE_KEYS);
        topWeightsMap[dim] = topNWeights(dimCoeffs);
      } else {
        // Fallback to coefficient-based prediction
        const pred = this.predictDimensionFromCoefficients(
          features,
          coefficients,
          dim,
        );
        scores[dim] = pred;
        topWeightsMap[dim] = topNWeights(
          this.extractDimensionCoefficients(coefficients, dim),
        );
      }

      // Confidence from validation loss (inverse relationship)
      let conf = clamp(1 - this.currentModel.validationLoss / 10, 0.3, 0.95);
      // Apply subjectivity gap dampening
      if ((gaps[dim] ?? 0) > 0.3) {
        conf = Math.min(conf, 0.5);
      }
      confidence[dim] = conf;
    }

    // Mood
    const moodModel = this.boostingModels.get('mood');
    const mood = moodModel
      ? clamp(predictBoosting(moodModel, x), 1, 5)
      : this.predictDimensionFromCoefficients(features, coefficients, 'mood' as unknown as Dimension);

    return { scores, mood, confidence, topWeights: topWeightsMap };
  }

  // -----------------------------------------------------------------------
  // Training: Warm (OLS per dimension)
  // -----------------------------------------------------------------------

  private trainWarm(pairs: TrainingPair[]): {
    coefficients: Record<string, number>;
    validationLoss: number;
  } {
    const coefficients: Record<string, number> = {};
    let totalLoss = 0;
    let lossCount = 0;

    const X = pairs.map((p) => featureVector(p.features));

    for (const dim of ALL_DIMENSIONS) {
      const validPairs = pairs.filter(
        (p) => p.labels[dim] !== undefined,
      );
      if (validPairs.length < 3) {
        // Not enough data — use heuristic weights
        const weights = getWeightsForTarget(dim);
        for (const [k, v] of Object.entries(weights)) {
          coefficients[`${dim}:${k}`] = v;
        }
        continue;
      }

      const Xd = validPairs.map((p) => featureVector(p.features));
      const yd = validPairs.map((p) => p.labels[dim]!);

      const ols = olsRegression(Xd, yd);

      // Store coefficients
      NUMERIC_FEATURE_KEYS.forEach((key, i) => {
        coefficients[`${dim}:${key}`] = ols.coefficients[i]!;
      });
      coefficients[`${dim}:intercept`] = ols.intercept;

      // Compute validation loss (in-sample for warm tier)
      const predictions = Xd.map((x) => {
        let pred = ols.intercept;
        for (let i = 0; i < x.length; i++) {
          pred += ols.coefficients[i]! * x[i]!;
        }
        return clamp(pred, 1, 5);
      });
      const mse =
        predictions.reduce((acc, pred, i) => acc + (pred - yd[i]!) ** 2, 0) /
        predictions.length;
      totalLoss += mse;
      lossCount++;
    }

    // Train mood
    const moodPairs = pairs.filter((p) => p.mood !== undefined);
    if (moodPairs.length >= 3) {
      const Xm = moodPairs.map((p) => featureVector(p.features));
      const ym = moodPairs.map((p) => p.mood);
      const ols = olsRegression(Xm, ym);

      NUMERIC_FEATURE_KEYS.forEach((key, i) => {
        coefficients[`mood:${key}`] = ols.coefficients[i]!;
      });
      coefficients['mood:intercept'] = ols.intercept;
    }

    return {
      coefficients,
      validationLoss: lossCount > 0 ? totalLoss / lossCount : 0,
    };
  }

  // -----------------------------------------------------------------------
  // Training: Personalised (Gradient Boosting per dimension)
  // -----------------------------------------------------------------------

  private trainPersonalised(pairs: TrainingPair[]): {
    coefficients: Record<string, number>;
    validationLoss: number;
  } {
    const coefficients: Record<string, number> = {};
    let totalLoss = 0;
    let lossCount = 0;

    this.boostingModels.clear();

    for (const dim of ALL_DIMENSIONS) {
      const validPairs = pairs.filter(
        (p) => p.labels[dim] !== undefined,
      );
      if (validPairs.length < this.config.minSamplesPersonalised) {
        // Fall back to OLS for this dimension
        const Xd = validPairs.map((p) => featureVector(p.features));
        const yd = validPairs.map((p) => p.labels[dim]!);
        if (Xd.length >= 3) {
          const ols = olsRegression(Xd, yd);
          NUMERIC_FEATURE_KEYS.forEach((key, i) => {
            coefficients[`${dim}:${key}`] = ols.coefficients[i]!;
          });
          coefficients[`${dim}:intercept`] = ols.intercept;
        }
        continue;
      }

      // Split into train / validation
      const splitIdx = Math.floor(
        validPairs.length * (1 - this.config.validationSplit),
      );
      const trainPairs = validPairs.slice(0, splitIdx);
      const valPairs = validPairs.slice(splitIdx);

      const Xtrain = trainPairs.map((p) => featureVector(p.features));
      const ytrain = trainPairs.map((p) => p.labels[dim]!);

      const model = trainGradientBoosting(Xtrain, ytrain, this.config);
      this.boostingModels.set(dim, model);

      // Extract approximate coefficients for storage
      const dimCoeffs = extractBoostingCoefficients(model, NUMERIC_FEATURE_KEYS);
      for (const [k, v] of Object.entries(dimCoeffs)) {
        coefficients[`${dim}:${k}`] = v;
      }
      coefficients[`${dim}:intercept`] = model.intercept;

      // Validation loss
      if (valPairs.length > 0) {
        const Xval = valPairs.map((p) => featureVector(p.features));
        const yval = valPairs.map((p) => p.labels[dim]!);
        const valPreds = Xval.map((x) =>
          clamp(predictBoosting(model, x), 1, 5),
        );
        const mse =
          valPreds.reduce(
            (acc, pred, i) => acc + (pred - yval[i]!) ** 2,
            0,
          ) / valPreds.length;
        totalLoss += mse;
        lossCount++;
      }
    }

    // Train mood boosting model
    const moodPairs = pairs.filter((p) => p.mood !== undefined);
    if (moodPairs.length >= this.config.minSamplesPersonalised) {
      const splitIdx = Math.floor(
        moodPairs.length * (1 - this.config.validationSplit),
      );
      const trainPairs = moodPairs.slice(0, splitIdx);
      const Xtrain = trainPairs.map((p) => featureVector(p.features));
      const ytrain = trainPairs.map((p) => p.mood);

      const model = trainGradientBoosting(Xtrain, ytrain, this.config);
      this.boostingModels.set('mood', model);

      const moodCoeffs = extractBoostingCoefficients(model, NUMERIC_FEATURE_KEYS);
      for (const [k, v] of Object.entries(moodCoeffs)) {
        coefficients[`mood:${k}`] = v;
      }
      coefficients['mood:intercept'] = model.intercept;
    }

    return {
      coefficients,
      validationLoss: lossCount > 0 ? totalLoss / lossCount : 0,
    };
  }

  // -----------------------------------------------------------------------
  // Subjectivity Gap Detection
  // -----------------------------------------------------------------------

  private computeSubjectivityGaps(
    pairs: TrainingPair[],
    predictFn: (
      features: NormalisedMLFeatures,
    ) => PredictionResult,
    gaps: Record<string, number>,
  ): void {
    for (const dim of ALL_DIMENSIONS) {
      const dimPairs = pairs.filter(
        (p) => p.labels[dim] !== undefined,
      );
      if (dimPairs.length < 3) continue;

      // Compute per-pair absolute errors
      const errors = dimPairs.map((p) => {
        const pred = predictFn(p.features);
        return Math.abs(pred.scores[dim] - p.labels[dim]!);
      });

      const mae = errors.reduce((a, b) => a + b, 0) / errors.length;
      const highErrorCount = errors.filter((e) => e > 2.0).length;

      // Record dampening factor if consistently high error
      if (mae > 2.0 && highErrorCount >= 3) {
        gaps[dim] = clamp(mae / 5.0, 0, 1); // Dampening proportional to MAE
      }
    }
  }

  // -----------------------------------------------------------------------
  // Coefficient-based prediction helpers
  // -----------------------------------------------------------------------

  private predictWithCoefficients(
    features: NormalisedMLFeatures,
    coefficients: Record<string, number>,
    tier: ModelTier,
    sampleSize: number,
    overrideConfidence?: number,
  ): PredictionResult {
    const scores = {} as Record<Dimension, number>;
    const confidence = {} as Record<Dimension, number>;
    const topWeightsMap = {} as Record<Dimension, FeatureWeight[]>;

    for (const dim of ALL_DIMENSIONS) {
      scores[dim] = this.predictDimensionFromCoefficients(
        features,
        coefficients,
        dim,
      );
      const dimCoeffs = this.extractDimensionCoefficients(coefficients, dim);
      topWeightsMap[dim] = topNWeights(dimCoeffs);

      if (overrideConfidence !== undefined) {
        confidence[dim] = clamp(overrideConfidence, 0, 1);
      } else {
        confidence[dim] = 0.3;
      }
    }

    const mood = this.predictDimensionFromCoefficients(
      features,
      coefficients,
      'mood' as unknown as Dimension,
    );

    return { scores, mood, confidence, topWeights: topWeightsMap };
  }

  private predictDimensionFromCoefficients(
    features: NormalisedMLFeatures,
    coefficients: Record<string, number>,
    dim: Dimension | string,
  ): number {
    const prefix = `${dim}:`;
    const intercept = coefficients[`${prefix}intercept`];

    if (intercept !== undefined) {
      // OLS-style: intercept + Σ(coeff × feature)
      let pred = intercept;
      for (const key of NUMERIC_FEATURE_KEYS) {
        const coeff = coefficients[`${prefix}${key}`];
        if (coeff !== undefined) {
          pred += coeff * featureToNumber(features, key);
        }
      }
      return clamp(pred, 1, 5);
    }

    // Heuristic-style: baseScore + Σ(weight × (feature - 0.5)) × 5
    let sum = 0;
    for (const key of NUMERIC_FEATURE_KEYS) {
      const weight = coefficients[`${prefix}${key}`];
      if (weight !== undefined) {
        sum += weight * (featureToNumber(features, key) - 0.5);
      }
    }
    return clamp(BASE_SCORE + sum * 5, 1, 5);
  }

  private extractDimensionCoefficients(
    coefficients: Record<string, number>,
    dim: Dimension | string,
  ): Record<string, number> {
    const prefix = `${dim}:`;
    const result: Record<string, number> = {};
    for (const [key, value] of Object.entries(coefficients)) {
      if (key.startsWith(prefix) && !key.endsWith(':intercept')) {
        result[key.slice(prefix.length)] = value;
      }
    }
    return result;
  }

  // -----------------------------------------------------------------------
  // Model Persistence
  // -----------------------------------------------------------------------

  private async loadCurrentModel(): Promise<void> {
    if (this.currentModel) return;
    try {
      const record = await db.mlModelWeights.get('current');
      if (record) {
        this.currentModel = record;
      }
    } catch {
      // DB not available (e.g., in tests without Dexie) — stay with null
    }
  }

  private async persistModel(record: ModelWeightsRecord): Promise<void> {
    try {
      // Rotate: current → previous
      const existing = await db.mlModelWeights.get('current');
      if (existing) {
        await db.mlModelWeights.put({ ...existing, id: 'previous' });
      }
      // Save new current
      await db.mlModelWeights.put(record);
    } catch {
      // DB not available — model is still in memory
    }
  }
}
