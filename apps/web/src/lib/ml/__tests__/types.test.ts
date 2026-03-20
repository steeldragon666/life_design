import { describe, it, expect } from 'vitest';
import { Dimension } from '@life-design/core';
import type {
  NormalisedMLFeatures,
  IFeatureExtractor,
  TrainingPair,
  PredictionResult,
  FeatureWeight,
  ModelTier,
  ModelWeightsRecord,
  FeatureLogRecord,
  GuardianLogEntry,
  SeasonName,
  SeasonRecord,
  NormalisationStatsRecord,
  SpotifyReflectionRecord,
  TrainerConfig,
} from '../types';

describe('ML Types', () => {
  it('NormalisedMLFeatures compiles with all required fields', () => {
    const features: NormalisedMLFeatures = {
      sleep_duration_score: 0.7,
      sleep_quality_score: 0.8,
      physical_strain: 0.3,
      recovery_status: 0.6,
      meeting_load: 0.5,
      context_switching_penalty: 0.2,
      deep_work_opportunity: 0.9,
      after_hours_work: 0.1,
      digital_fatigue: 0.4,
      doomscroll_index: 0.15,
      audio_valence: 0.6,
      audio_energy: 0.7,
      day_of_week_sin: 0.5,
      day_of_week_cos: -0.5,
      is_weekend: false,
      season_sprint: 1,
      season_recharge: 0,
      season_exploration: 0,
    };
    expect(features).toBeDefined();
    expect(typeof features.sleep_duration_score).toBe('number');
    expect(typeof features.is_weekend).toBe('boolean');
  });

  it('TrainingPair compiles with required fields', () => {
    const pair: TrainingPair = {
      date: '2026-03-18',
      features: {
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
      },
      labels: { [Dimension.Career]: 7 },
      mood: 7,
      ai_accepted: true,
      completeDimensions: false,
    };
    expect(pair.date).toBe('2026-03-18');
    expect(pair.ai_accepted).toBe(true);
  });

  it('PredictionResult compiles with all dimensions', () => {
    const weight: FeatureWeight = {
      feature: 'sleep_duration_score',
      weight: 0.35,
      humanLabel: 'Sleep Duration',
    };

    const result: PredictionResult = {
      scores: {
        [Dimension.Career]: 7,
        [Dimension.Finance]: 6,
        [Dimension.Health]: 8,
        [Dimension.Fitness]: 7,
        [Dimension.Family]: 5,
        [Dimension.Social]: 6,
        [Dimension.Romance]: 4,
        [Dimension.Growth]: 8,
      },
      mood: 7,
      confidence: {
        [Dimension.Career]: 0.8,
        [Dimension.Finance]: 0.7,
        [Dimension.Health]: 0.9,
        [Dimension.Fitness]: 0.85,
        [Dimension.Family]: 0.6,
        [Dimension.Social]: 0.7,
        [Dimension.Romance]: 0.5,
        [Dimension.Growth]: 0.9,
      },
      topWeights: {
        [Dimension.Career]: [weight],
        [Dimension.Finance]: [weight],
        [Dimension.Health]: [weight],
        [Dimension.Fitness]: [weight],
        [Dimension.Family]: [weight],
        [Dimension.Social]: [weight],
        [Dimension.Romance]: [weight],
        [Dimension.Growth]: [weight],
      },
    };
    expect(result.mood).toBe(7);
    expect(result.topWeights[Dimension.Career]).toHaveLength(1);
  });

  it('ModelTier accepts valid values', () => {
    const tiers: ModelTier[] = ['cold', 'warm', 'personalized'];
    expect(tiers).toHaveLength(3);
  });

  it('ModelWeightsRecord compiles correctly', () => {
    const record: ModelWeightsRecord = {
      id: 'model-career-v1',
      tier: 'cold',
      version: 1,
      updatedAt: Date.now(),
      sampleSize: 0,
      coefficients: { sleep_duration_score: 0.3 },
      subjectivityGaps: {},
      validationLoss: 0,
    };
    expect(record.tier).toBe('cold');
  });

  it('FeatureLogRecord compiles correctly', () => {
    const log: FeatureLogRecord = {
      date: '2026-03-18',
      features: {
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
      },
      imputedFields: ['audio_valence'],
      featureConfidence: 0.92,
      extractedAt: Date.now(),
    };
    expect(log.imputedFields).toContain('audio_valence');
  });

  it('GuardianLogEntry compiles correctly', () => {
    const entry: GuardianLogEntry = {
      timestamp: Date.now(),
      triggerType: 'burnout',
      escalationLevel: 2,
      actionSuggested: 'Take a break',
      userAccepted: false,
      dimensionsAffected: [Dimension.Career, Dimension.Health],
      deviationMagnitude: 1.5,
    };
    expect(entry.triggerType).toBe('burnout');
    expect(entry.escalationLevel).toBe(2);
  });

  it('SeasonRecord compiles correctly', () => {
    const season: SeasonRecord = {
      name: 'Sprint',
      startDate: '2026-03-01',
      isActive: true,
      triggerSource: 'manual',
      weights: {
        [Dimension.Career]: 1.2,
        [Dimension.Finance]: 1.0,
        [Dimension.Health]: 0.8,
        [Dimension.Fitness]: 0.9,
        [Dimension.Family]: 0.7,
        [Dimension.Social]: 0.6,
        [Dimension.Romance]: 0.5,
        [Dimension.Growth]: 1.1,
      },
    };
    expect(season.name).toBe('Sprint');
    expect(season.isActive).toBe(true);
  });

  it('SeasonName accepts valid values', () => {
    const names: SeasonName[] = ['Sprint', 'Recharge', 'Exploration', 'Maintenance'];
    expect(names).toHaveLength(4);
  });

  it('NormalisationStatsRecord compiles correctly', () => {
    const stats: NormalisationStatsRecord = {
      feature: 'sleep_duration_score',
      mean30d: 7.2,
      stddev30d: 1.1,
      median: 7.5,
      sampleCount: 28,
      lastUpdated: Date.now(),
    };
    expect(stats.feature).toBe('sleep_duration_score');
  });

  it('SpotifyReflectionRecord compiles correctly', () => {
    const reflection: SpotifyReflectionRecord = {
      date: '2026-03-18',
      artistName: 'Radiohead',
      trackNames: ['Everything In Its Right Place'],
      listeningMinutes: 45,
      audioValence: 0.3,
      audioEnergy: 0.6,
      userMoodResponse: 'melancholic',
      createdAt: Date.now(),
    };
    expect(reflection.userMoodResponse).toBe('melancholic');
  });

  it('TrainerConfig compiles correctly', () => {
    const config: TrainerConfig = {
      minSamplesWarm: 14,
      minSamplesPersonalised: 30,
      learningRate: 0.01,
      maxIterations: 100,
      maxDepth: 3,
      lossFunction: 'mse',
      validationSplit: 0.2,
    };
    expect(config.lossFunction).toBe('mse');
    expect(config.validationSplit).toBe(0.2);
  });
});
