import { describe, it, expect } from 'vitest';
import {
  computeSHAPValues,
  generateExplanationText,
  categorizeFeature,
  type SHAPContribution,
  type SHAPExplanation,
} from '../shap-explainer';

describe('computeSHAPValues', () => {
  it('correctly computes contributions for basic features', () => {
    const result = computeSHAPValues(
      [0.5, -0.3, 0.2],
      1.0,
      ['sleep_quality', 'stress_level', 'exercise_minutes'],
      { sleep_quality: 4, stress_level: 3, exercise_minutes: 5 },
    );

    expect(result.baseValue).toBe(1.0);
    // predicted = 1.0 + 0.5*4 + (-0.3)*3 + 0.2*5 = 1.0 + 2.0 - 0.9 + 1.0 = 3.1
    expect(result.predictedValue).toBeCloseTo(3.1);
    expect(result.contributions).toHaveLength(3);

    const sleepContrib = result.contributions.find(
      (c) => c.feature === 'sleep_quality',
    )!;
    expect(sleepContrib.shapValue).toBeCloseTo(2.0);
    expect(sleepContrib.value).toBe(4);
    expect(sleepContrib.direction).toBe('positive');

    const stressContrib = result.contributions.find(
      (c) => c.feature === 'stress_level',
    )!;
    expect(stressContrib.shapValue).toBeCloseTo(-0.9);
    expect(stressContrib.direction).toBe('negative');
  });

  it('contributions sum to (predictedValue - baseValue)', () => {
    const weights = [0.5, -0.3, 0.2, 0.1];
    const intercept = 2.5;
    const featureNames = ['a', 'b', 'c', 'd'];
    const featureValues = { a: 3, b: 2, c: 4, d: 1 };

    const result = computeSHAPValues(
      weights,
      intercept,
      featureNames,
      featureValues,
    );

    const sumContributions = result.contributions.reduce(
      (sum, c) => sum + c.shapValue,
      0,
    );
    expect(sumContributions).toBeCloseTo(
      result.predictedValue - result.baseValue,
    );
  });

  it('topPositive and topNegative are correctly sorted and limited to 3', () => {
    // 5 positive, 2 negative features
    const weights = [0.1, 0.5, 0.3, 0.8, 0.2, -0.4, -0.6];
    const names = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7'];
    const values = { f1: 1, f2: 1, f3: 1, f4: 1, f5: 1, f6: 1, f7: 1 };

    const result = computeSHAPValues(weights, 0, names, values);

    expect(result.topPositive).toHaveLength(3);
    expect(result.topNegative).toHaveLength(2);

    // Top positive should be sorted by shap value descending
    expect(result.topPositive[0].feature).toBe('f4'); // 0.8
    expect(result.topPositive[1].feature).toBe('f2'); // 0.5
    expect(result.topPositive[2].feature).toBe('f3'); // 0.3

    // Top negative should be sorted by shap value ascending (most negative first)
    expect(result.topNegative[0].feature).toBe('f7'); // -0.6
    expect(result.topNegative[1].feature).toBe('f6'); // -0.4
  });

  it('direction labels are correct', () => {
    const result = computeSHAPValues(
      [0.5, -0.3, 0],
      0,
      ['pos', 'neg', 'zero'],
      { pos: 1, neg: 1, zero: 1 },
    );

    const pos = result.contributions.find((c) => c.feature === 'pos')!;
    const neg = result.contributions.find((c) => c.feature === 'neg')!;
    const zero = result.contributions.find((c) => c.feature === 'zero')!;

    expect(pos.direction).toBe('positive');
    expect(neg.direction).toBe('negative');
    // Zero contribution — should default to positive (or neutral)
    expect(zero.direction).toBe('positive');
  });

  it('handles interaction features (e.g., "sleep_quality*exercise_minutes")', () => {
    const result = computeSHAPValues(
      [0.5, 0.3, 0.1],
      1.0,
      ['sleep_quality', 'exercise_minutes', 'sleep_quality*exercise_minutes'],
      { sleep_quality: 4, exercise_minutes: 5 },
      ['sleep_quality*exercise_minutes'],
    );

    // Interaction feature value = 4 * 5 = 20
    const interaction = result.contributions.find(
      (c) => c.feature === 'sleep_quality*exercise_minutes',
    )!;
    expect(interaction.value).toBe(20);
    expect(interaction.shapValue).toBeCloseTo(0.1 * 20); // 2.0
  });

  it('handles missing feature values by defaulting to 0', () => {
    const result = computeSHAPValues(
      [0.5, 0.3],
      1.0,
      ['sleep_quality', 'exercise_minutes'],
      { sleep_quality: 4 }, // exercise_minutes missing
    );

    const exercise = result.contributions.find(
      (c) => c.feature === 'exercise_minutes',
    )!;
    expect(exercise.value).toBe(0);
    expect(exercise.shapValue).toBe(0);
  });
});

describe('generateExplanationText', () => {
  it('produces readable text with dimension name', () => {
    const explanation: SHAPExplanation = {
      predictedValue: 3.8,
      baseValue: 3.0,
      contributions: [],
      topPositive: [
        {
          feature: 'sleep_quality',
          value: 4,
          shapValue: 0.6,
          direction: 'positive',
        },
        {
          feature: 'exercise_minutes',
          value: 30,
          shapValue: 0.4,
          direction: 'positive',
        },
      ],
      topNegative: [
        {
          feature: 'stress_level',
          value: 7,
          shapValue: -0.3,
          direction: 'negative',
        },
      ],
      summary: '',
    };

    const text = generateExplanationText(explanation, 'health');

    expect(text).toContain('health');
    expect(text).toContain('3.8');
    expect(text).toContain('Sleep Quality');
    expect(text).toContain('Exercise Minutes');
    expect(text).toContain('Stress Level');
    expect(text).toMatch(/\+0\.[46]/); // positive contribution
    expect(text).toMatch(/-0\.3/); // negative contribution
  });

  it('handles single contributor', () => {
    const explanation: SHAPExplanation = {
      predictedValue: 4.0,
      baseValue: 3.0,
      contributions: [],
      topPositive: [
        {
          feature: 'sleep_quality',
          value: 5,
          shapValue: 1.0,
          direction: 'positive',
        },
      ],
      topNegative: [],
      summary: '',
    };

    const text = generateExplanationText(explanation, 'wellbeing');
    expect(text).toContain('wellbeing');
    expect(text).toContain('Sleep Quality');
    expect(text).not.toContain('offset');
  });

  it('handles all negative contributors', () => {
    const explanation: SHAPExplanation = {
      predictedValue: 2.0,
      baseValue: 3.0,
      contributions: [],
      topPositive: [],
      topNegative: [
        {
          feature: 'stress_level',
          value: 8,
          shapValue: -0.6,
          direction: 'negative',
        },
        {
          feature: 'screen_time',
          value: 300,
          shapValue: -0.4,
          direction: 'negative',
        },
      ],
      summary: '',
    };

    const text = generateExplanationText(explanation, 'mental');
    expect(text).toContain('mental');
    expect(text).toContain('Stress Level');
    expect(text).toContain('Screen Time');
    expect(text).not.toContain('driven by');
  });
});

describe('categorizeFeature', () => {
  it('maps known features correctly', () => {
    expect(categorizeFeature('sleep_quality')).toEqual({
      category: 'Sleep',
      friendlyName: 'Sleep Quality',
    });
    expect(categorizeFeature('exercise_minutes')).toEqual({
      category: 'Exercise',
      friendlyName: 'Exercise Minutes',
    });
    expect(categorizeFeature('mood_score')).toEqual({
      category: 'Mood',
      friendlyName: 'Mood Score',
    });
    expect(categorizeFeature('stress_level')).toEqual({
      category: 'Stress',
      friendlyName: 'Stress Level',
    });
    expect(categorizeFeature('hrv_rmssd')).toEqual({
      category: 'Stress',
      friendlyName: 'Hrv Rmssd',
    });
    expect(categorizeFeature('social_interactions')).toEqual({
      category: 'Social',
      friendlyName: 'Social Interactions',
    });
    expect(categorizeFeature('calendar_events')).toEqual({
      category: 'Social',
      friendlyName: 'Calendar Events',
    });
    expect(categorizeFeature('weather_temp')).toEqual({
      category: 'Environment',
      friendlyName: 'Weather Temp',
    });
    expect(categorizeFeature('sunlight_minutes')).toEqual({
      category: 'Environment',
      friendlyName: 'Sunlight Minutes',
    });
    expect(categorizeFeature('screen_time')).toEqual({
      category: 'Screen Time',
      friendlyName: 'Screen Time',
    });
    expect(categorizeFeature('journal_sentiment')).toEqual({
      category: 'Journaling',
      friendlyName: 'Journal Sentiment',
    });
    expect(categorizeFeature('steps_count')).toEqual({
      category: 'Exercise',
      friendlyName: 'Steps Count',
    });
    expect(categorizeFeature('valence_score')).toEqual({
      category: 'Mood',
      friendlyName: 'Valence Score',
    });
  });

  it('handles unknown features gracefully', () => {
    expect(categorizeFeature('random_metric')).toEqual({
      category: 'Other',
      friendlyName: 'Random Metric',
    });
  });

  it('handles interaction features', () => {
    const result = categorizeFeature('sleep_quality*exercise_minutes');
    expect(result.category).toBe('Other');
    expect(result.friendlyName).toBe('Sleep Quality * Exercise Minutes');
  });
});
