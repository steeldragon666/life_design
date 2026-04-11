import { describe, it, expect } from 'vitest';
import type { ModelArtifact } from '@life-design/core';
import { PersonalModel } from '../personal-model';

function makeArtifact(overrides: Partial<ModelArtifact> = {}): ModelArtifact {
  return {
    userId: 'user-1',
    modelVersion: 1,
    createdAt: '2026-01-01T00:00:00Z',
    featureNames: ['sleep', 'exercise', 'social'],
    weights: [0.5, 0.3, 0.2],
    intercept: 2.0,
    trainingMetrics: { mse: 0.1, r2: 0.85, sampleCount: 50, featureCount: 3 },
    featureImportance: { sleep: 0.5, exercise: 0.3, social: 0.2 },
    targetDimension: 'health',
    ...overrides,
  };
}

describe('PersonalModel', () => {
  describe('constructor', () => {
    it('loads weights from ModelArtifact', () => {
      const artifact = makeArtifact();
      const model = new PersonalModel(artifact);

      expect(model.dimension).toBe('health');
      expect(model.version).toBe(0); // version always 0 for now
    });
  });

  describe('predict()', () => {
    it('computes linear combination correctly', () => {
      // y = 2.0 + 0.5*3 + 0.3*2 + 0.2*4 = 2.0 + 1.5 + 0.6 + 0.8 = 4.9
      const model = new PersonalModel(makeArtifact());
      const result = model.predict({ sleep: 3, exercise: 2, social: 4 });
      expect(result).toBe(4.9);
    });

    it('clamps output to minimum of 1', () => {
      const model = new PersonalModel(
        makeArtifact({ intercept: -10, weights: [-1, -1, -1] }),
      );
      const result = model.predict({ sleep: 5, exercise: 5, social: 5 });
      // -10 + (-1*5) + (-1*5) + (-1*5) = -25 → clamped to 1
      expect(result).toBe(1);
    });

    it('clamps output to maximum of 5', () => {
      const model = new PersonalModel(
        makeArtifact({ intercept: 10, weights: [1, 1, 1] }),
      );
      const result = model.predict({ sleep: 5, exercise: 5, social: 5 });
      // 10 + 5 + 5 + 5 = 25 → clamped to 5
      expect(result).toBe(5);
    });

    it('handles missing features by defaulting to 0', () => {
      const model = new PersonalModel(makeArtifact());
      // Only provide sleep, exercise and social default to 0
      // y = 2.0 + 0.5*3 + 0.3*0 + 0.2*0 = 3.5
      const result = model.predict({ sleep: 3 });
      expect(result).toBe(3.5);
    });

    it('rounds to 1 decimal place', () => {
      // y = 2.0 + 0.5*1 + 0.3*1 + 0.2*1 = 3.0 (already clean)
      // Try something that produces more decimals:
      // weights [0.33, 0.33, 0.33], intercept 1.0
      // y = 1.0 + 0.33*1 + 0.33*1 + 0.33*1 = 1.99 → 2.0
      const model = new PersonalModel(
        makeArtifact({ intercept: 1.0, weights: [0.33, 0.33, 0.33] }),
      );
      const result = model.predict({ sleep: 1, exercise: 1, social: 1 });
      expect(result).toBe(2);
    });
  });

  describe('getFeatureImportance()', () => {
    it('returns features sorted by absolute weight descending', () => {
      const model = new PersonalModel(
        makeArtifact({ weights: [-0.8, 0.3, 0.5] }),
      );
      const importance = model.getFeatureImportance();
      expect(importance).toEqual([
        { feature: 'sleep', importance: 0.8 },
        { feature: 'social', importance: 0.5 },
        { feature: 'exercise', importance: 0.3 },
      ]);
    });
  });

  describe('dimension getter', () => {
    it('returns target dimension from artifact', () => {
      const model = new PersonalModel(makeArtifact({ targetDimension: 'career' }));
      expect(model.dimension).toBe('career');
    });

    it('defaults to unknown when targetDimension is not set', () => {
      const model = new PersonalModel(makeArtifact({ targetDimension: undefined }));
      expect(model.dimension).toBe('unknown');
    });
  });
});
