import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { LifeDesignDB } from '@/lib/db/schema';
import { LocalTrainer } from '../trainer';
import type { NormalisedMLFeatures, TrainingPair } from '../types';
import { Dimension } from '@life-design/core';

// We need to mock the db module to use our test-specific DB instance
let testDb: LifeDesignDB;

vi.mock('@/lib/db', () => ({
  get db() {
    return testDb;
  },
}));

function makeFeatures(overrides: Partial<NormalisedMLFeatures> = {}): NormalisedMLFeatures {
  return {
    sleep_duration_score: 0.5, sleep_quality_score: 0.5,
    physical_strain: 0.5, recovery_status: 0.5,
    meeting_load: 0.5, context_switching_penalty: 0.5,
    deep_work_opportunity: 0.5, after_hours_work: 0.5,
    digital_fatigue: 0.5, doomscroll_index: 0.5,
    audio_valence: 0.5, audio_energy: 0.5,
    day_of_week_sin: 0, day_of_week_cos: 1,
    is_weekend: false,
    season_sprint: 0, season_recharge: 0, season_exploration: 0,
    ...overrides,
  };
}

function makeTrainingPair(
  overrides: Partial<TrainingPair> = {},
): TrainingPair {
  const defaultLabels: Partial<Record<Dimension, number>> = {};
  for (const dim of Object.values(Dimension)) {
    defaultLabels[dim] = 5 + Math.random() * 3;
  }
  return {
    date: '2026-03-01',
    features: makeFeatures(),
    labels: defaultLabels,
    mood: 6,
    ai_accepted: true,
    completeDimensions: true,
    ...overrides,
  };
}

describe('LocalTrainer', () => {
  beforeEach(() => {
    testDb = new LifeDesignDB();
  });

  afterEach(async () => {
    await testDb.delete();
  });

  it('cold start: returns predictions using heuristic weights', async () => {
    const trainer = new LocalTrainer();
    const result = await trainer.predict(makeFeatures({ sleep_quality_score: 0.9 }));
    expect(result.scores[Dimension.Health]).toBeGreaterThan(0);
    expect(result.mood).toBeGreaterThan(0);
    expect(result.mood).toBeLessThanOrEqual(5);
  });

  it('predictions are in 1-5 range', async () => {
    const trainer = new LocalTrainer();
    const result = await trainer.predict(makeFeatures());
    for (const dim of Object.values(Dimension)) {
      expect(result.scores[dim]).toBeGreaterThanOrEqual(1);
      expect(result.scores[dim]).toBeLessThanOrEqual(5);
    }
  });

  it('cold start: all features at 0.5 gives baseline score', async () => {
    const trainer = new LocalTrainer();
    const result = await trainer.predict(makeFeatures());
    // With all features at 0.5, the deviation from 0.5 is 0 → score = BASE_SCORE (3)
    for (const dim of Object.values(Dimension)) {
      expect(result.scores[dim]).toBeCloseTo(3, 1);
    }
  });

  it('cold start: confidence is 0.3 for all dimensions', async () => {
    const trainer = new LocalTrainer();
    const result = await trainer.predict(makeFeatures());
    for (const dim of Object.values(Dimension)) {
      expect(result.confidence[dim]).toBe(0.3);
    }
  });

  it('cold start: high sleep quality boosts health score', async () => {
    const trainer = new LocalTrainer();
    const baseline = await trainer.predict(makeFeatures());
    const boosted = await trainer.predict(makeFeatures({ sleep_quality_score: 1.0 }));
    expect(boosted.scores[Dimension.Health]).toBeGreaterThan(baseline.scores[Dimension.Health]);
  });

  it('cold start: high meeting load decreases career score', async () => {
    const trainer = new LocalTrainer();
    const baseline = await trainer.predict(makeFeatures());
    const decreased = await trainer.predict(makeFeatures({ meeting_load: 1.0 }));
    expect(decreased.scores[Dimension.Career]).toBeLessThan(baseline.scores[Dimension.Career]);
  });

  it('provides topWeights for each dimension', async () => {
    const trainer = new LocalTrainer();
    const result = await trainer.predict(makeFeatures());
    for (const dim of Object.values(Dimension)) {
      expect(result.topWeights[dim]).toBeDefined();
      expect(result.topWeights[dim].length).toBeGreaterThan(0);
      expect(result.topWeights[dim][0]).toHaveProperty('feature');
      expect(result.topWeights[dim][0]).toHaveProperty('weight');
      expect(result.topWeights[dim][0]).toHaveProperty('humanLabel');
    }
  });

  it('getModelInfo returns null when no model is loaded', () => {
    const trainer = new LocalTrainer();
    expect(trainer.getModelInfo()).toBeNull();
  });

  it('train with < 7 pairs stays in cold tier', async () => {
    const trainer = new LocalTrainer();
    const pairs = Array.from({ length: 5 }, (_, i) =>
      makeTrainingPair({ date: `2026-03-0${i + 1}` }),
    );
    const result = await trainer.train(pairs);
    expect(result.tier).toBe('cold');
    expect(result.sampleSize).toBe(5);
  });

  it('train with 7-14 pairs uses warm tier', async () => {
    const trainer = new LocalTrainer();
    const pairs = Array.from({ length: 10 }, (_, i) =>
      makeTrainingPair({
        date: `2026-03-${String(i + 1).padStart(2, '0')}`,
        features: makeFeatures({
          sleep_quality_score: 0.3 + (i / 10) * 0.4,
          meeting_load: 0.2 + (i / 10) * 0.3,
        }),
      }),
    );
    const result = await trainer.train(pairs);
    expect(result.tier).toBe('warm');
    expect(result.version).toBe(1);
  });

  it('train with 14+ pairs uses personalized tier', async () => {
    const trainer = new LocalTrainer();
    const pairs = Array.from({ length: 20 }, (_, i) =>
      makeTrainingPair({
        date: `2026-03-${String(i + 1).padStart(2, '0')}`,
        features: makeFeatures({
          sleep_quality_score: 0.2 + (i / 20) * 0.6,
          recovery_status: 0.3 + (i / 20) * 0.4,
        }),
        labels: (() => {
          const labels: Partial<Record<Dimension, number>> = {};
          for (const dim of Object.values(Dimension)) {
            labels[dim] = 3 + (i / 20) * 5;
          }
          return labels;
        })(),
        mood: 3 + (i / 20) * 5,
      }),
    );
    const result = await trainer.train(pairs);
    expect(result.tier).toBe('personalized');
  });

  it('model persists to Dexie and rotates versions', async () => {
    const trainer = new LocalTrainer();
    const pairs = Array.from({ length: 10 }, (_, i) =>
      makeTrainingPair({
        date: `2026-03-${String(i + 1).padStart(2, '0')}`,
      }),
    );

    await trainer.train(pairs);
    const current1 = await testDb.mlModelWeights.get('current');
    expect(current1).toBeDefined();
    expect(current1!.version).toBe(1);

    // Train again — current should become previous
    await trainer.train(pairs);
    const current2 = await testDb.mlModelWeights.get('current');
    const previous = await testDb.mlModelWeights.get('previous');
    expect(current2!.version).toBe(2);
    expect(previous).toBeDefined();
    expect(previous!.version).toBe(1);
  });

  it('predictions after warm training are in valid range', async () => {
    const trainer = new LocalTrainer();
    const pairs = Array.from({ length: 10 }, (_, i) =>
      makeTrainingPair({
        date: `2026-03-${String(i + 1).padStart(2, '0')}`,
        features: makeFeatures({
          sleep_quality_score: 0.3 + (i / 10) * 0.4,
        }),
      }),
    );

    await trainer.train(pairs);
    const result = await trainer.predict(makeFeatures({ sleep_quality_score: 0.8 }));

    for (const dim of Object.values(Dimension)) {
      expect(result.scores[dim]).toBeGreaterThanOrEqual(1);
      expect(result.scores[dim]).toBeLessThanOrEqual(10);
    }
    expect(result.mood).toBeGreaterThanOrEqual(1);
    expect(result.mood).toBeLessThanOrEqual(10);
  });
});
