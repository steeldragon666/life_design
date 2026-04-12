import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NOf1Model } from '../n-of-1-inference';
import type { ModelArtifact } from '@life-design/core';
import type { NOf1Prediction, NOf1Config } from '../n-of-1-inference';

function makeArtifact(overrides: Partial<ModelArtifact> = {}): ModelArtifact {
  return {
    userId: 'u1',
    modelVersion: 1,
    createdAt: new Date().toISOString(),
    featureNames: ['sleep', 'exercise', 'stress'],
    weights: [0.5, 0.3, -0.4],
    intercept: 2.0,
    trainingMetrics: { mse: 0.25, r2: 0.8, sampleCount: 50, featureCount: 3 },
    featureImportance: { sleep: 0.42, exercise: 0.25, stress: 0.33 },
    featureStats: {
      sleep: { mean: 7.0, std: 1.0 },
      exercise: { mean: 3.0, std: 1.5 },
      stress: { mean: 4.0, std: 2.0 },
    },
    ...overrides,
  };
}

describe('NOf1Model', () => {
  describe('basic prediction', () => {
    it('delegates to underlying PersonalModel for prediction', () => {
      const model = new NOf1Model(makeArtifact());
      const result = model.predict({ sleep: 8, exercise: 4, stress: 2 });
      // y = 0.5*8 + 0.3*4 + (-0.4)*2 + 2.0 = 4 + 1.2 - 0.8 + 2.0 = 6.4 -> clamped to 5
      expect(result.value).toBe(5);
    });

    it('returns a prediction within 1-5 range', () => {
      const model = new NOf1Model(makeArtifact());
      const result = model.predict({ sleep: 0, exercise: 0, stress: 10 });
      expect(result.value).toBeGreaterThanOrEqual(1);
      expect(result.value).toBeLessThanOrEqual(5);
    });
  });

  describe('confidence estimation', () => {
    it('scales confidence with R2', () => {
      const highR2 = new NOf1Model(
        makeArtifact({ trainingMetrics: { mse: 0.1, r2: 0.95, sampleCount: 100, featureCount: 3 } }),
      );
      const lowR2 = new NOf1Model(
        makeArtifact({ trainingMetrics: { mse: 1.0, r2: 0.3, sampleCount: 100, featureCount: 3 } }),
      );

      const highResult = highR2.predict({ sleep: 7, exercise: 3, stress: 4 });
      const lowResult = lowR2.predict({ sleep: 7, exercise: 3, stress: 4 });

      expect(highResult.confidence).toBeGreaterThan(lowResult.confidence);
    });

    it('scales confidence with feature coverage', () => {
      const model = new NOf1Model(makeArtifact());
      const full = model.predict({ sleep: 7, exercise: 3, stress: 4 });
      const partial = model.predict({ sleep: 7 }); // missing exercise and stress

      expect(full.confidence).toBeGreaterThan(partial.confidence);
    });

    it('returns confidence between 0 and 1', () => {
      const model = new NOf1Model(makeArtifact());
      const result = model.predict({ sleep: 7, exercise: 3, stress: 4 });
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('prediction interval', () => {
    it('returns a tuple of [lower, upper]', () => {
      const model = new NOf1Model(makeArtifact());
      const result = model.predict({ sleep: 7, exercise: 3, stress: 4 });
      expect(result.predictionInterval).toHaveLength(2);
      expect(result.predictionInterval[0]).toBeLessThanOrEqual(result.value);
      expect(result.predictionInterval[1]).toBeGreaterThanOrEqual(result.value);
    });

    it('interval width is inversely proportional to confidence', () => {
      const highR2 = new NOf1Model(
        makeArtifact({ trainingMetrics: { mse: 0.1, r2: 0.95, sampleCount: 100, featureCount: 3 } }),
      );
      const lowR2 = new NOf1Model(
        makeArtifact({ trainingMetrics: { mse: 1.0, r2: 0.3, sampleCount: 100, featureCount: 3 } }),
      );

      const highResult = highR2.predict({ sleep: 7, exercise: 3, stress: 4 });
      const lowResult = lowR2.predict({ sleep: 7, exercise: 3, stress: 4 });

      const highWidth = highResult.predictionInterval[1] - highResult.predictionInterval[0];
      const lowWidth = lowResult.predictionInterval[1] - lowResult.predictionInterval[0];

      expect(lowWidth).toBeGreaterThan(highWidth);
    });

    it('interval is clamped to 1-5', () => {
      const model = new NOf1Model(
        makeArtifact({ trainingMetrics: { mse: 5.0, r2: 0.1, sampleCount: 30, featureCount: 3 } }),
      );
      const result = model.predict({ sleep: 7, exercise: 3, stress: 4 });
      expect(result.predictionInterval[0]).toBeGreaterThanOrEqual(1);
      expect(result.predictionInterval[1]).toBeLessThanOrEqual(5);
    });
  });

  describe('feature contributions / explanation', () => {
    it('contributions sum approximately to (prediction - intercept) before clamping', () => {
      const artifact = makeArtifact();
      const model = new NOf1Model(artifact);
      const features = { sleep: 7, exercise: 3, stress: 4 };
      const result = model.predict(features);

      const contributionSum = result.explanation.reduce((s, e) => s + e.contribution, 0);
      // Raw prediction = intercept + sum of contributions
      // The raw score before clamping: 0.5*7 + 0.3*3 + (-0.4)*4 + 2.0 = 3.5+0.9-1.6+2.0 = 4.8
      // contributions should sum to 4.8 - 2.0 = 2.8
      const expectedSum = 0.5 * 7 + 0.3 * 3 + -0.4 * 4;
      expect(contributionSum).toBeCloseTo(expectedSum, 5);
    });

    it('correctly labels direction as positive or negative', () => {
      const model = new NOf1Model(makeArtifact());
      const result = model.predict({ sleep: 7, exercise: 3, stress: 4 });

      const sleepEntry = result.explanation.find((e) => e.feature === 'sleep');
      const stressEntry = result.explanation.find((e) => e.feature === 'stress');

      expect(sleepEntry?.direction).toBe('positive');
      expect(stressEntry?.direction).toBe('negative');
    });

    it('explanation is sorted by absolute contribution descending', () => {
      const model = new NOf1Model(makeArtifact());
      const result = model.predict({ sleep: 7, exercise: 3, stress: 4 });

      for (let i = 1; i < result.explanation.length; i++) {
        expect(Math.abs(result.explanation[i - 1].contribution)).toBeGreaterThanOrEqual(
          Math.abs(result.explanation[i].contribution),
        );
      }
    });
  });

  describe('staleness detection', () => {
    it('marks model as stale when older than 7 days', () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      const model = new NOf1Model(makeArtifact({ createdAt: eightDaysAgo }));
      const result = model.predict({ sleep: 7 });
      expect(result.isStale).toBe(true);
    });

    it('marks model as fresh when younger than 7 days', () => {
      const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      const model = new NOf1Model(makeArtifact({ createdAt: oneDayAgo }));
      const result = model.predict({ sleep: 7 });
      expect(result.isStale).toBe(false);
    });

    it('marks model as stale at exactly 7 days boundary', () => {
      const exactlySevenDays = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const model = new NOf1Model(makeArtifact({ createdAt: exactlySevenDays }));
      const result = model.predict({ sleep: 7 });
      expect(result.isStale).toBe(true);
    });

    it('respects custom staleness threshold', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const model = new NOf1Model(makeArtifact({ createdAt: twoDaysAgo }), {
        stalenessThresholdDays: 1,
      });
      const result = model.predict({ sleep: 7 });
      expect(result.isStale).toBe(true);
    });
  });

  describe('anomaly detection', () => {
    it('flags features with values >2 sigma from mean', () => {
      const model = new NOf1Model(makeArtifact());
      // sleep mean=7, std=1 => 10 is 3 sigma away
      const result = model.predict({ sleep: 10, exercise: 3, stress: 4 });
      expect(result.anomalyFeatures).toContain('sleep');
    });

    it('does not flag features within 2 sigma', () => {
      const model = new NOf1Model(makeArtifact());
      // sleep mean=7, std=1 => 8.5 is 1.5 sigma away
      const result = model.predict({ sleep: 8.5, exercise: 3, stress: 4 });
      expect(result.anomalyFeatures).not.toContain('sleep');
    });

    it('returns empty array when no featureStats available', () => {
      const model = new NOf1Model(makeArtifact({ featureStats: undefined }));
      const result = model.predict({ sleep: 100, exercise: 100, stress: 100 });
      expect(result.anomalyFeatures).toEqual([]);
    });
  });

  describe('interaction features', () => {
    it('generates pairwise interaction feature names for 2 features', () => {
      const artifact = makeArtifact({
        featureNames: ['a', 'b'],
        weights: [1.0, 0.5],
        intercept: 0,
        trainingMetrics: { mse: 0.1, r2: 0.9, sampleCount: 50, featureCount: 2 },
        featureImportance: { a: 0.6, b: 0.4 },
        featureStats: { a: { mean: 5, std: 1 }, b: { mean: 3, std: 1 } },
      });
      const model = new NOf1Model(artifact);
      const interactionNames = model.getInteractionFeatureNames();
      expect(interactionNames).toEqual(['a*b']);
    });

    it('generates correct number of pairwise interactions for 3 features', () => {
      const model = new NOf1Model(makeArtifact());
      const interactionNames = model.getInteractionFeatureNames();
      // 3 choose 2 = 3
      expect(interactionNames).toHaveLength(3);
      expect(interactionNames).toContain('sleep*exercise');
      expect(interactionNames).toContain('sleep*stress');
      expect(interactionNames).toContain('exercise*stress');
    });

    it('computes interaction feature values', () => {
      const model = new NOf1Model(makeArtifact());
      const interactions = model.computeInteractionFeatures({ sleep: 8, exercise: 4, stress: 2 });
      expect(interactions['sleep*exercise']).toBe(32);
      expect(interactions['sleep*stress']).toBe(16);
      expect(interactions['exercise*stress']).toBe(8);
    });
  });

  describe('config overrides', () => {
    it('uses default config when none provided', () => {
      const model = new NOf1Model(makeArtifact());
      const result = model.predict({ sleep: 7, exercise: 3, stress: 4 });
      // Just verify it works with defaults
      expect(result).toBeDefined();
      expect(result.value).toBeDefined();
    });

    it('accepts custom confidence level', () => {
      const model90 = new NOf1Model(makeArtifact(), { confidenceLevel: 0.9 });
      const model99 = new NOf1Model(makeArtifact(), { confidenceLevel: 0.99 });

      const result90 = model90.predict({ sleep: 7, exercise: 3, stress: 4 });
      const result99 = model99.predict({ sleep: 7, exercise: 3, stress: 4 });

      const width90 = result90.predictionInterval[1] - result90.predictionInterval[0];
      const width99 = result99.predictionInterval[1] - result99.predictionInterval[0];

      // 99% interval should be wider than 90%
      expect(width99).toBeGreaterThanOrEqual(width90);
    });
  });
});
