import { describe, it, expect, vi } from 'vitest';
import { LocalTrainer, type TrainingData, type GradientUpdate, type FederatedTrainingConfig, type EncryptedGradientSubmission } from '../local-trainer';
import { GradientEncoder } from '../gradient-encoder';
import type { ModelArtifact } from '@life-design/core';

// Simple linear data: y = 2*x1 + 3*x2 + 1
function makeLinearData(n: number = 20): TrainingData {
  const features: number[][] = [];
  const targets: number[] = [];
  for (let i = 0; i < n; i++) {
    const x1 = i / n;
    const x2 = (n - i) / n;
    features.push([x1, x2]);
    targets.push(2 * x1 + 3 * x2 + 1);
  }
  return { features, targets };
}

describe('LocalTrainer', () => {
  it('produces gradient update with correct structure', () => {
    const data = makeLinearData();
    const trainer = new LocalTrainer(0.1, 50);
    const update = trainer.train(data);

    expect(update).toHaveProperty('weights');
    expect(update).toHaveProperty('bias');
    expect(update).toHaveProperty('sampleCount');
    expect(update).toHaveProperty('loss');
    expect(typeof update.bias).toBe('number');
    expect(typeof update.loss).toBe('number');
    expect(update.sampleCount).toBe(20);
  });

  it('loss decreases over training', () => {
    const data = makeLinearData();
    const fewEpochs = new LocalTrainer(0.1, 5);
    const manyEpochs = new LocalTrainer(0.1, 100);

    const updateFew = fewEpochs.train(data);
    const updateMany = manyEpochs.train(data);

    expect(updateMany.loss).toBeLessThan(updateFew.loss);
  });

  it('throws on empty data', () => {
    const trainer = new LocalTrainer();
    expect(() => trainer.train({ features: [], targets: [] })).toThrow('Invalid training data');
  });

  it('throws on mismatched features/targets', () => {
    const trainer = new LocalTrainer();
    const data: TrainingData = {
      features: [[1, 2], [3, 4]],
      targets: [1],
    };
    expect(() => trainer.train(data)).toThrow('Invalid training data');
  });

  it('gradient update has correct dimensions', () => {
    const data = makeLinearData();
    const trainer = new LocalTrainer(0.1, 10);
    const update = trainer.train(data);

    expect(update.weights).toHaveLength(2); // 2 features
  });

  it('with initial weights, gradients are differences from initial', () => {
    const data = makeLinearData();
    const trainer = new LocalTrainer(0.1, 50);
    const initialWeights = [0.5, 0.5];

    const update = trainer.train(data, initialWeights);

    // Gradients should be the difference between final weights and initial weights
    // They should not equal the raw final weights
    // With training, the model should move weights toward [2, 3], so gradients should be positive
    expect(update.weights[0]).not.toBe(0);
    expect(update.weights[1]).not.toBe(0);
  });

  describe('clipGradients', () => {
    it('no clipping when norm is within bound', () => {
      const trainer = new LocalTrainer();
      const gradients = [1.0, 2.0, 3.0]; // norm ~3.74
      const clipped = trainer.clipGradients(gradients, 5.0);
      expect(clipped).toEqual(gradients);
    });

    it('clips when norm exceeds maxNorm', () => {
      const trainer = new LocalTrainer();
      const gradients = [3.0, 4.0]; // norm = 5
      const clipped = trainer.clipGradients(gradients, 2.5);
      const clippedNorm = Math.sqrt(clipped.reduce((s, v) => s + v * v, 0));
      expect(clippedNorm).toBeCloseTo(2.5, 5);
    });

    it('preserves direction after clipping', () => {
      const trainer = new LocalTrainer();
      const gradients = [3.0, 4.0]; // norm = 5
      const clipped = trainer.clipGradients(gradients, 2.5);
      // Direction ratio should be preserved: clipped[0]/clipped[1] == 3/4
      expect(clipped[0] / clipped[1]).toBeCloseTo(3 / 4, 5);
    });
  });

  describe('trainFromPersonalModel', () => {
    it('uses existing weights as initialization', () => {
      const trainer = new LocalTrainer(0.1, 50);
      const artifact: ModelArtifact = {
        userId: 'test-user',
        modelVersion: 1,
        createdAt: new Date().toISOString(),
        featureNames: ['x1', 'x2'],
        weights: [1.0, 1.0],
        intercept: 0.5,
        trainingMetrics: { mse: 0.1, r2: 0.9, sampleCount: 20, featureCount: 2 },
        featureImportance: { x1: 0.5, x2: 0.5 },
        targetDimension: 'wellbeing',
      };
      const data = makeLinearData();
      const update = trainer.trainFromPersonalModel(artifact, data);

      // Should return a gradient update (diff between new and old weights)
      expect(update.weights).toHaveLength(2);
      expect(update.sampleCount).toBe(20);
      expect(typeof update.loss).toBe('number');
      expect(typeof update.bias).toBe('number');
    });
  });

  describe('canParticipate', () => {
    it('returns true when enough samples', () => {
      const trainer = new LocalTrainer();
      expect(trainer.canParticipate(100, 50)).toBe(true);
    });

    it('returns false when insufficient samples', () => {
      const trainer = new LocalTrainer();
      expect(trainer.canParticipate(10, 50)).toBe(false);
    });
  });

  describe('prepareSubmission', () => {
    it('adds noise and clips gradients', () => {
      const trainer = new LocalTrainer();
      const update: GradientUpdate = {
        weights: [10.0, 20.0, 30.0],
        bias: 5.0,
        sampleCount: 50,
        loss: 0.1,
      };
      const submission = trainer.prepareSubmission(update, 1.0);

      // Noisy weights should differ from original (statistically)
      let anyDifferent = false;
      for (let trial = 0; trial < 10; trial++) {
        const sub = trainer.prepareSubmission(update, 1.0);
        if (sub.noisyWeights.some((v, i) => v !== update.weights[i])) {
          anyDifferent = true;
          break;
        }
      }
      expect(anyDifferent).toBe(true);
    });

    it('preserves sample count', () => {
      const trainer = new LocalTrainer();
      const update: GradientUpdate = {
        weights: [1.0, 2.0],
        bias: 0.5,
        sampleCount: 42,
        loss: 0.05,
      };
      const submission = trainer.prepareSubmission(update, 1.0);
      expect(submission.sampleCount).toBe(42);
    });
  });
});

describe('GradientEncoder', () => {
  it('encoded gradients have same length as input', () => {
    const encoder = new GradientEncoder();
    const gradients = [0.1, 0.2, 0.3, 0.4, 0.5];
    const encoded = encoder.encode(gradients);

    expect(encoded).toHaveLength(gradients.length);
  });

  it('noise is added (encoded !== original, statistically)', () => {
    const encoder = new GradientEncoder(1.0, 1.0);
    const gradients = [1.0, 2.0, 3.0, 4.0, 5.0];

    // Run multiple times; at least one should differ
    let anyDifferent = false;
    for (let trial = 0; trial < 10; trial++) {
      const encoded = encoder.encode(gradients);
      if (encoded.some((v, i) => v !== gradients[i])) {
        anyDifferent = true;
        break;
      }
    }
    expect(anyDifferent).toBe(true);
  });

  it('larger epsilon produces less noise', () => {
    const lowEps = new GradientEncoder(0.1, 1.0);  // more noise
    const highEps = new GradientEncoder(10.0, 1.0); // less noise
    const gradients = [1.0, 2.0, 3.0];

    // Average deviation over many trials
    const trials = 200;
    let lowEpsDeviation = 0;
    let highEpsDeviation = 0;

    for (let t = 0; t < trials; t++) {
      const lowEncoded = lowEps.encode(gradients);
      const highEncoded = highEps.encode(gradients);
      for (let i = 0; i < gradients.length; i++) {
        lowEpsDeviation += Math.abs(lowEncoded[i] - gradients[i]);
        highEpsDeviation += Math.abs(highEncoded[i] - gradients[i]);
      }
    }

    expect(highEpsDeviation).toBeLessThan(lowEpsDeviation);
  });
});
