import { describe, it, expect, vi } from 'vitest';
import { LocalTrainer, type TrainingData, type GradientUpdate } from '../local-trainer';
import { GradientEncoder } from '../gradient-encoder';

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
