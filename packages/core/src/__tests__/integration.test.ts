import { describe, expect, it } from 'vitest';
import {
  computeAllPairCorrelations,
  detectSignificantPatterns,
  generateInsightNarrative,
  rankInsightsByNovelty,
} from '../correlation';
import { normalizeProviderPayload } from '../feature-extraction';
import { Dimension, IntegrationProvider } from '../enums';
import { computeOverallScore, computeStreak } from '../scoring';

// ---------------------------------------------------------------------------
// Deterministic seeded PRNG (mulberry32)
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(42);

function randomInRange(min: number, max: number) {
  return min + rng() * (max - min);
}

// ---------------------------------------------------------------------------
// Synthetic 90-day dataset builder
// ---------------------------------------------------------------------------
function buildSyntheticSeries(days: number) {
  const sleep: number[] = [];
  const steps: number[] = [];
  const mood: number[] = [];
  const productivity: number[] = [];

  for (let i = 0; i < days; i++) {
    const sleepVal = randomInRange(5, 9);
    sleep.push(sleepVal);
    // steps inversely correlated with sleep (for testability)
    steps.push(randomInRange(3000, 12000));
    // mood positively correlated with sleep
    mood.push(sleepVal * 0.8 + randomInRange(-1, 1));
    // productivity positively correlated with sleep
    productivity.push(sleepVal * 0.6 + randomInRange(-0.5, 0.5));
  }

  return { sleep, steps, mood, productivity };
}

// ---------------------------------------------------------------------------
// Integration: Feature Extraction → Correlation Pipeline
// ---------------------------------------------------------------------------
describe('Integration: Feature Extraction → Correlation', () => {
  it('normalizes Apple Health data and produces valid signals', () => {
    const signals = normalizeProviderPayload(IntegrationProvider.AppleHealth, {
      steps: 8500,
      sleep_hours: 7.5,
      resting_heart_rate: 62,
      workouts_count: 3,
      active_energy_kcal: 450,
    });

    expect(signals.length).toBe(2);
    const health = signals.find((s) => s.dimension === Dimension.Health);
    const fitness = signals.find((s) => s.dimension === Dimension.Fitness);
    expect(health).toBeDefined();
    expect(fitness).toBeDefined();
    expect(health!.score).toBeGreaterThan(0);
    expect(health!.score).toBeLessThanOrEqual(10);
    expect(health!.confidence).toBeGreaterThan(0.5);
  });

  it('normalizes Strava data into fitness signals', () => {
    const signals = normalizeProviderPayload(IntegrationProvider.Strava, {
      items: [
        { moving_time: 3600, distance: 10000, average_heartrate: 145 },
        { moving_time: 1800, distance: 5000, average_heartrate: 130 },
      ],
    });

    expect(signals.length).toBeGreaterThan(0);
    const fitness = signals.find((s) => s.dimension === Dimension.Fitness);
    expect(fitness).toBeDefined();
    expect(fitness!.score).toBeGreaterThan(0);
  });

  it('normalizes Google Calendar data into career/social signals', () => {
    const now = new Date();
    const inOneHour = new Date(now.getTime() + 3600_000);
    const inTwoHours = new Date(now.getTime() + 7200_000);
    const signals = normalizeProviderPayload(IntegrationProvider.GoogleCalendar, {
      items: [
        { summary: 'Team standup', start: { dateTime: now.toISOString() }, end: { dateTime: inOneHour.toISOString() } },
        { summary: 'Deep work', start: { dateTime: inOneHour.toISOString() }, end: { dateTime: inTwoHours.toISOString() } },
      ],
    });

    expect(signals.length).toBeGreaterThan(0);
  });

  it('builds full correlation pipeline from synthetic time series', () => {
    const series = buildSyntheticSeries(90);

    // Step 1: compute pairwise correlations
    const matrix = computeAllPairCorrelations(series);
    expect(matrix.length).toBe(6); // C(4,2) = 6 pairs

    // Step 2: detect significant patterns
    const patterns = detectSignificantPatterns(matrix, 0.5);
    expect(Array.isArray(patterns)).toBe(true);

    // Sleep-mood correlation should be strong positive
    const sleepMood = matrix.find(
      (p) =>
        (p.keyA === 'mood' && p.keyB === 'sleep') ||
        (p.keyA === 'sleep' && p.keyB === 'mood'),
    );
    expect(sleepMood).toBeDefined();
    expect(sleepMood!.correlation).toBeGreaterThan(0.3);

    // Sleep-productivity should also correlate
    const sleepProd = matrix.find(
      (p) =>
        (p.keyA === 'productivity' && p.keyB === 'sleep') ||
        (p.keyA === 'sleep' && p.keyB === 'productivity'),
    );
    expect(sleepProd).toBeDefined();
    expect(sleepProd!.correlation).toBeGreaterThan(0.3);
  });

  it('generates human-readable narratives from patterns', () => {
    const series = buildSyntheticSeries(90);
    const matrix = computeAllPairCorrelations(series);
    const patterns = detectSignificantPatterns(matrix, 0.3);

    for (const pattern of patterns) {
      const narrative = generateInsightNarrative(pattern);
      expect(narrative).toContain(pattern.keyA);
      expect(narrative).toContain(pattern.keyB);
      // Should never claim causation
      expect(narrative.toLowerCase()).not.toContain('causes');
      expect(narrative.toLowerCase()).not.toContain('caused by');
    }
  });

  it('ranks insights by novelty without throwing', () => {
    const series = buildSyntheticSeries(90);
    const matrix = computeAllPairCorrelations(series);
    const patterns = detectSignificantPatterns(matrix, 0.3);
    const ranked = rankInsightsByNovelty(patterns);

    expect(Array.isArray(ranked)).toBe(true);
    for (const insight of ranked) {
      expect(typeof insight.noveltyScore).toBe('number');
      expect(insight.noveltyScore).toBeGreaterThanOrEqual(0);
      expect(insight.noveltyScore).toBeLessThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Integration: Scoring Functions
// ---------------------------------------------------------------------------
describe('Integration: Scoring pipeline', () => {
  it('computes overall score from dimension scores', () => {
    const scores = [
      { dimension: Dimension.Health, score: 7 },
      { dimension: Dimension.Fitness, score: 8 },
      { dimension: Dimension.Career, score: 6 },
      { dimension: Dimension.Social, score: 5 },
    ];
    const overall = computeOverallScore(scores);
    expect(overall).toBeCloseTo(6.5);
  });

  it('computes streak from date strings', () => {
    const dates = ['2025-01-10', '2025-01-11', '2025-01-12', '2025-01-13'];
    expect(computeStreak(dates, '2025-01-13')).toBe(4);
    expect(computeStreak(dates, '2025-01-14')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Integration: Cross-module signal flow
// ---------------------------------------------------------------------------
describe('Integration: Normalized signals → Series → Correlations', () => {
  it('can aggregate signals into a correlatable series', () => {
    // Simulate 30 days of Apple Health + Strava data
    const healthScores: number[] = [];
    const fitnessScores: number[] = [];

    for (let i = 0; i < 30; i++) {
      const healthSignals = normalizeProviderPayload(
        IntegrationProvider.AppleHealth,
        {
          steps: 5000 + Math.round(rng() * 8000),
          sleep_hours: 5 + rng() * 4,
          resting_heart_rate: 55 + Math.round(rng() * 25),
          workouts_count: Math.round(rng() * 5),
          active_energy_kcal: 200 + Math.round(rng() * 600),
        },
      );

      const health = healthSignals.find((s) => s.dimension === Dimension.Health);
      const fitness = healthSignals.find((s) => s.dimension === Dimension.Fitness);

      healthScores.push(health?.score ?? 0);
      fitnessScores.push(fitness?.score ?? 0);
    }

    // Feed into correlation engine
    const matrix = computeAllPairCorrelations({
      health: healthScores,
      fitness: fitnessScores,
    });

    expect(matrix.length).toBe(1);
    // Health and fitness from same source should positively correlate
    expect(matrix[0].correlation).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe('Integration: Edge cases', () => {
  it('handles empty provider payload gracefully', () => {
    const signals = normalizeProviderPayload(IntegrationProvider.AppleHealth, {});
    expect(signals.length).toBe(2); // still produces signals, just low scores
    for (const s of signals) {
      expect(s.score).toBeGreaterThanOrEqual(0);
    }
  });

  it('handles unknown provider with fallback dimension', () => {
    const signals = normalizeProviderPayload(
      'unknown_provider' as IntegrationProvider,
      { foo: 'bar' },
      Dimension.Growth,
    );
    expect(signals.length).toBe(1);
    expect(signals[0].dimension).toBe(Dimension.Growth);
  });

  it('handles too-short series in correlations', () => {
    const matrix = computeAllPairCorrelations({
      a: [1],
      b: [2],
    });
    // Should produce pairs but with correlation = 0 (too few points)
    expect(matrix.length).toBe(1);
    expect(matrix[0].correlation).toBe(0);
  });

  it('handles all-zero series', () => {
    const matrix = computeAllPairCorrelations({
      x: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      y: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    });
    expect(matrix.length).toBe(1);
    // Zero-variance series → correlation = 0
    expect(matrix[0].correlation).toBe(0);
  });

  it('detectSignificantPatterns returns empty for weak data', () => {
    const weakData: Record<string, number[]> = {};
    for (let k = 0; k < 3; k++) {
      weakData[`dim_${k}`] = Array.from({ length: 5 }, () => rng());
    }
    const matrix = computeAllPairCorrelations(weakData);
    const patterns = detectSignificantPatterns(matrix, 0.8);
    // With only 5 data points and random data, nothing should be significant
    expect(patterns.length).toBe(0);
  });
});
