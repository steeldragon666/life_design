import { describe, it, expect } from 'vitest';
import {
  computePopulationInsight,
  computePopulationTrend,
  generatePopulationSummary,
  anonymizationCheck,
} from '../population-insights';
import { FederatedModel } from '../aggregation';

describe('computePopulationInsight', () => {
  const featureNames = ['sleep_hours', 'exercise_minutes', 'stress_level'];

  it('extracts top features sorted by importance (descending)', () => {
    const model: FederatedModel = {
      targetDimension: 'mood',
      modelVersion: 3,
      weights: [0.2, 0.8, -0.5],
      bias: 0.1,
      totalSamples: 500,
      participantCount: 25,
    };

    const insight = computePopulationInsight(model, featureNames);

    expect(insight.topFeatures[0].feature).toBe('exercise_minutes');
    expect(insight.topFeatures[0].importance).toBeCloseTo(1.0);
    expect(insight.topFeatures[0].direction).toBe('positive');

    expect(insight.topFeatures[1].feature).toBe('stress_level');
    expect(insight.topFeatures[1].direction).toBe('negative');

    expect(insight.topFeatures[2].feature).toBe('sleep_hours');

    // All importances should be 0-1
    for (const f of insight.topFeatures) {
      expect(f.importance).toBeGreaterThanOrEqual(0);
      expect(f.importance).toBeLessThanOrEqual(1);
    }
  });

  it('confidence scales with participant count', () => {
    const lowParticipants: FederatedModel = {
      targetDimension: 'energy',
      modelVersion: 1,
      weights: [0.5, 0.3],
      bias: 0.1,
      totalSamples: 50,
      participantCount: 5,
    };
    const highParticipants: FederatedModel = {
      targetDimension: 'energy',
      modelVersion: 1,
      weights: [0.5, 0.3],
      bias: 0.1,
      totalSamples: 500,
      participantCount: 50,
    };

    const lowInsight = computePopulationInsight(lowParticipants, ['a', 'b']);
    const highInsight = computePopulationInsight(highParticipants, ['a', 'b']);

    expect(lowInsight.modelConfidence).toBeLessThan(highInsight.modelConfidence);
    expect(highInsight.modelConfidence).toBeCloseTo(1.0);
    expect(lowInsight.modelConfidence).toBeCloseTo(0.1); // 5/50
  });

  it('includes dimension and participant count', () => {
    const model: FederatedModel = {
      targetDimension: 'sleep',
      modelVersion: 2,
      weights: [0.4],
      bias: 0.0,
      totalSamples: 100,
      participantCount: 20,
    };

    const insight = computePopulationInsight(model, ['caffeine']);
    expect(insight.dimension).toBe('sleep');
    expect(insight.participantCount).toBe(20);
  });

  it('handles zero weights gracefully', () => {
    const model: FederatedModel = {
      targetDimension: 'mood',
      modelVersion: 1,
      weights: [0, 0, 0],
      bias: 0,
      totalSamples: 10,
      participantCount: 2,
    };

    const insight = computePopulationInsight(model, featureNames);
    expect(insight.topFeatures).toHaveLength(3);
    for (const f of insight.topFeatures) {
      expect(f.importance).toBe(0);
    }
  });
});

describe('computePopulationTrend', () => {
  const featureNames = ['sleep', 'exercise'];

  it('detects converging pattern (avg drift < 0.05)', () => {
    // Three versions with very similar weights => low drift => converging
    const models: FederatedModel[] = [
      {
        targetDimension: 'mood',
        modelVersion: 1,
        weights: [0.5, 0.3],
        bias: 0.1,
        totalSamples: 100,
        participantCount: 10,
      },
      {
        targetDimension: 'mood',
        modelVersion: 2,
        weights: [0.51, 0.31],
        bias: 0.1,
        totalSamples: 200,
        participantCount: 15,
      },
      {
        targetDimension: 'mood',
        modelVersion: 3,
        weights: [0.52, 0.31],
        bias: 0.1,
        totalSamples: 300,
        participantCount: 20,
      },
    ];

    const trend = computePopulationTrend(models, featureNames);
    expect(trend.convergenceStatus).toBe('converging');
    expect(trend.versions).toHaveLength(3);
    expect(trend.dimension).toBe('mood');
  });

  it('detects diverging pattern (avg drift > 0.15)', () => {
    // Versions with very different weights => high drift => diverging
    const models: FederatedModel[] = [
      {
        targetDimension: 'energy',
        modelVersion: 1,
        weights: [1, 0],
        bias: 0,
        totalSamples: 50,
        participantCount: 10,
      },
      {
        targetDimension: 'energy',
        modelVersion: 2,
        weights: [0, 1],
        bias: 0,
        totalSamples: 100,
        participantCount: 15,
      },
      {
        targetDimension: 'energy',
        modelVersion: 3,
        weights: [-1, 0],
        bias: 0,
        totalSamples: 150,
        participantCount: 20,
      },
    ];

    const trend = computePopulationTrend(models, featureNames);
    expect(trend.convergenceStatus).toBe('diverging');
  });

  it('detects stable pattern (drift between 0.05 and 0.15)', () => {
    // Weights that produce moderate drift (between 0.05 and 0.15)
    const models: FederatedModel[] = [
      {
        targetDimension: 'mood',
        modelVersion: 1,
        weights: [1.0, 0.0],
        bias: 0.1,
        totalSamples: 100,
        participantCount: 10,
      },
      {
        targetDimension: 'mood',
        modelVersion: 2,
        weights: [0.9, 0.4],
        bias: 0.1,
        totalSamples: 200,
        participantCount: 15,
      },
    ];

    const trend = computePopulationTrend(models, featureNames);
    // Verify drift is in the stable range
    expect(trend.versions[1].drift).toBeGreaterThanOrEqual(0.05);
    expect(trend.versions[1].drift).toBeLessThanOrEqual(0.15);
    expect(trend.convergenceStatus).toBe('stable');
  });

  it('handles single model version', () => {
    const models: FederatedModel[] = [
      {
        targetDimension: 'mood',
        modelVersion: 1,
        weights: [0.5, 0.3],
        bias: 0.1,
        totalSamples: 100,
        participantCount: 10,
      },
    ];

    const trend = computePopulationTrend(models, featureNames);
    expect(trend.versions).toHaveLength(1);
    expect(trend.versions[0].drift).toBe(0);
    // Single version with no drift => converging
    expect(trend.convergenceStatus).toBe('converging');
  });
});

describe('generatePopulationSummary', () => {
  it('includes participant count', () => {
    const insights = [
      {
        dimension: 'health',
        participantCount: 47,
        topFeatures: [
          { feature: 'sleep_quality', importance: 0.9, direction: 'positive' as const },
          { feature: 'exercise_minutes', importance: 0.7, direction: 'positive' as const },
        ],
        modelConfidence: 0.8,
        lastUpdated: '2026-04-12T00:00:00Z',
      },
      {
        dimension: 'energy',
        participantCount: 47,
        topFeatures: [
          { feature: 'exercise_minutes', importance: 0.85, direction: 'positive' as const },
          { feature: 'stress_level', importance: 0.6, direction: 'negative' as const },
        ],
        modelConfidence: 0.8,
        lastUpdated: '2026-04-12T00:00:00Z',
      },
    ];

    const summary = generatePopulationSummary(insights);
    expect(summary).toContain('47');
    expect(summary).toContain('participant');
  });

  it('handles single dimension', () => {
    const insights = [
      {
        dimension: 'mood',
        participantCount: 12,
        topFeatures: [
          { feature: 'sleep_hours', importance: 0.95, direction: 'positive' as const },
        ],
        modelConfidence: 0.24,
        lastUpdated: '2026-04-12T00:00:00Z',
      },
    ];

    const summary = generatePopulationSummary(insights);
    expect(summary).toContain('12');
    expect(summary).toContain('sleep_hours');
    expect(summary).toContain('mood');
  });

  it('returns empty message for empty insights', () => {
    const summary = generatePopulationSummary([]);
    expect(summary.length).toBeGreaterThan(0);
  });
});

describe('anonymizationCheck', () => {
  it('returns false below default threshold', () => {
    expect(anonymizationCheck(9)).toBe(false);
    expect(anonymizationCheck(1)).toBe(false);
    expect(anonymizationCheck(0)).toBe(false);
  });

  it('returns true at default threshold', () => {
    expect(anonymizationCheck(10)).toBe(true);
  });

  it('returns true above default threshold', () => {
    expect(anonymizationCheck(11)).toBe(true);
    expect(anonymizationCheck(100)).toBe(true);
  });

  it('respects custom threshold', () => {
    expect(anonymizationCheck(4, 5)).toBe(false);
    expect(anonymizationCheck(5, 5)).toBe(true);
    expect(anonymizationCheck(6, 5)).toBe(true);
  });
});
