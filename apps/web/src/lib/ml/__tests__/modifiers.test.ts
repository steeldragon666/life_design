import { describe, it, expect } from 'vitest';
import { seasonWeightsToArray, applySeasonEncoding } from '../modifiers';
import { ALL_DIMENSIONS, Dimension } from '@life-design/core';
import type { NormalisedMLFeatures } from '../types';

const makeFeatures = (): NormalisedMLFeatures => ({
  sleep_duration_score: 0.5,
  sleep_quality_score: 0.5,
  physical_strain: 0.5,
  recovery_status: 0.5,
  meeting_load: 0.5,
  context_switching_penalty: 0.5,
  deep_work_opportunity: 0.5,
  after_hours_work: 0.5,
  digital_fatigue: 0.5,
  doomscroll_index: 0.5,
  audio_valence: 0.5,
  audio_energy: 0.5,
  day_of_week_sin: 0,
  day_of_week_cos: 1,
  is_weekend: false,
  season_sprint: 0,
  season_recharge: 0,
  season_exploration: 0,
});

describe('seasonWeightsToArray', () => {
  it('returns array of length 8 matching ALL_DIMENSIONS order', () => {
    const weights = {
      career: 1.5,
      finance: 1.0,
      health: 0.8,
      fitness: 0.7,
      family: 0.7,
      social: 0.5,
      romance: 0.5,
      growth: 1.3,
    } as Record<Dimension, number>;
    const arr = seasonWeightsToArray(weights);
    expect(arr).toHaveLength(ALL_DIMENSIONS.length);
    expect(arr[ALL_DIMENSIONS.indexOf(Dimension.Career)]).toBe(1.5);
  });
});

describe('applySeasonEncoding', () => {
  it('sets Sprint encoding correctly', () => {
    const result = applySeasonEncoding(makeFeatures(), 'Sprint');
    expect(result.season_sprint).toBe(1);
    expect(result.season_recharge).toBe(0);
    expect(result.season_exploration).toBe(0);
  });

  it('sets Recharge encoding correctly', () => {
    const result = applySeasonEncoding(makeFeatures(), 'Recharge');
    expect(result.season_sprint).toBe(0);
    expect(result.season_recharge).toBe(1);
    expect(result.season_exploration).toBe(0);
  });

  it('sets Exploration encoding correctly', () => {
    const result = applySeasonEncoding(makeFeatures(), 'Exploration');
    expect(result.season_sprint).toBe(0);
    expect(result.season_recharge).toBe(0);
    expect(result.season_exploration).toBe(1);
  });

  it('Maintenance has all season flags at 0', () => {
    const result = applySeasonEncoding(makeFeatures(), 'Maintenance');
    expect(result.season_sprint).toBe(0);
    expect(result.season_recharge).toBe(0);
    expect(result.season_exploration).toBe(0);
  });
});
