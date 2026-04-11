import { describe, it, expect } from 'vitest';
import type {
  ModelArtifact,
  TrainingRequest,
  TrainingResult,
} from '../model-types';

describe('ModelArtifact', () => {
  it('should accept a valid model artifact', () => {
    const artifact: ModelArtifact = {
      userId: 'user-123',
      modelVersion: 1,
      createdAt: '2026-04-11T00:00:00.000Z',
      featureNames: ['sleep_hours', 'exercise_minutes', 'mood_score'],
      weights: [0.42, 0.18, 0.35],
      intercept: 1.5,
      trainingMetrics: {
        mse: 0.023,
        r2: 0.87,
        sampleCount: 120,
        featureCount: 3,
      },
      featureImportance: {
        sleep_hours: 0.44,
        exercise_minutes: 0.19,
        mood_score: 0.37,
      },
    };

    expect(artifact.userId).toBe('user-123');
    expect(artifact.weights).toHaveLength(3);
    expect(artifact.featureNames).toHaveLength(artifact.weights.length);
    expect(artifact.trainingMetrics.r2).toBeGreaterThanOrEqual(0);
    expect(artifact.trainingMetrics.r2).toBeLessThanOrEqual(1);
    expect(artifact.trainingMetrics.sampleCount).toBe(120);
    expect(artifact.trainingMetrics.featureCount).toBe(3);
  });

  it('should support empty feature lists for a trivial model', () => {
    const artifact: ModelArtifact = {
      userId: 'user-456',
      modelVersion: 1,
      createdAt: new Date().toISOString(),
      featureNames: [],
      weights: [],
      intercept: 0,
      trainingMetrics: { mse: 0, r2: 0, sampleCount: 0, featureCount: 0 },
      featureImportance: {},
    };

    expect(artifact.featureNames).toHaveLength(0);
    expect(artifact.weights).toHaveLength(0);
    expect(artifact.intercept).toBe(0);
  });
});

describe('TrainingRequest', () => {
  it('should accept required fields only', () => {
    const req: TrainingRequest = {
      userId: 'user-123',
      targetDimension: 'mental',
    };

    expect(req.userId).toBe('user-123');
    expect(req.targetDimension).toBe('mental');
    expect(req.minSamples).toBeUndefined();
  });

  it('should accept optional minSamples', () => {
    const req: TrainingRequest = {
      userId: 'user-123',
      targetDimension: 'physical',
      minSamples: 50,
    };

    expect(req.minSamples).toBe(50);
  });
});

describe('TrainingResult', () => {
  it('should represent a successful training', () => {
    const result: TrainingResult = {
      success: true,
      artifact: {
        userId: 'user-123',
        modelVersion: 2,
        createdAt: '2026-04-11T12:00:00.000Z',
        featureNames: ['sleep_hours'],
        weights: [0.8],
        intercept: 2.0,
        trainingMetrics: {
          mse: 0.05,
          r2: 0.72,
          sampleCount: 45,
          featureCount: 1,
        },
        featureImportance: { sleep_hours: 1.0 },
      },
    };

    expect(result.success).toBe(true);
    expect(result.artifact).toBeDefined();
    expect(result.error).toBeUndefined();
  });

  it('should represent a failed training', () => {
    const result: TrainingResult = {
      success: false,
      error: 'Insufficient samples: 10 < 30',
    };

    expect(result.success).toBe(false);
    expect(result.artifact).toBeUndefined();
    expect(result.error).toContain('Insufficient samples');
  });
});
