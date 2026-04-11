/**
 * Types for per-user model training pipeline.
 *
 * The server trains a ridge-regression model per user/dimension,
 * serialises weights into a ModelArtifact, and stores them in the
 * model_artifacts table for on-device inference.
 */

export interface ModelArtifact {
  userId: string;
  modelVersion: number;
  createdAt: string; // ISO datetime
  featureNames: string[]; // ordered list of features used
  weights: number[]; // model weights (flat array)
  intercept: number; // bias term
  trainingMetrics: {
    mse: number; // mean squared error
    r2: number; // R² score
    sampleCount: number;
    featureCount: number;
  };
  featureImportance: Record<string, number>; // feature name -> importance score
  targetDimension?: string; // which dimension this model predicts
}

export interface TrainingRequest {
  userId: string;
  targetDimension: string; // which dimension to predict
  minSamples?: number; // minimum samples required (default: 30)
}

export interface TrainingResult {
  success: boolean;
  artifact?: ModelArtifact;
  error?: string;
}
