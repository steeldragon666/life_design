import { describe, expect, it } from 'vitest';
import {
  computeAllPairCorrelations,
  detectSignificantPatterns,
  generateInsightNarrative,
  laggedCorrelation,
  pearsonCorrelation,
  rankInsightsByNovelty,
} from '../correlation';

describe('pearsonCorrelation', () => {
  it('returns 1 for perfect positive linear relationship', () => {
    expect(pearsonCorrelation([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1);
  });

  it('returns -1 for perfect negative linear relationship', () => {
    expect(pearsonCorrelation([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1);
  });

  it('returns 0 when arrays are invalid or no variance exists', () => {
    expect(pearsonCorrelation([1], [1])).toBe(0);
    expect(pearsonCorrelation([1, 1, 1], [2, 3, 4])).toBe(0);
    expect(pearsonCorrelation([1, 2], [1])).toBe(0);
  });
});

describe('laggedCorrelation', () => {
  it('finds best lag for shifted series', () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8];
    const y = [9, 1, 2, 3, 4, 5, 6, 7];
    const result = laggedCorrelation(x, y, 2);

    expect(result.bestLag).toBe(1);
    expect(result.bestCorrelation).toBeGreaterThan(0.99);
    expect(result.overlap).toBeGreaterThanOrEqual(7);
  });
});

describe('computeAllPairCorrelations', () => {
  it('builds pair correlations from series-map input', () => {
    const matrix = computeAllPairCorrelations({
      health: [1, 2, 3, 4, 5, 6],
      fitness: [2, 3, 4, 5, 6, 7],
      social: [6, 5, 4, 3, 2, 1],
    });

    expect(matrix.length).toBe(3);
    const healthFitness = matrix.find(
      (item) => item.keyA === 'fitness' && item.keyB === 'health',
    );
    expect(healthFitness?.correlation).toBeGreaterThan(0.99);
  });
});

describe('detectSignificantPatterns', () => {
  it('enforces sample-size and effect-size guardrails', () => {
    const matrix = computeAllPairCorrelations({
      a: [1, 2, 3, 4, 5, 6, 7, 8],
      b: [1, 2, 3, 4, 5, 6, 7, 8],
      c: [1, 2, 1, 2, 1, 2, 1, 2],
    });
    const patterns = detectSignificantPatterns(matrix, 0.6);

    expect(patterns).toHaveLength(0);
  });

  it('returns high-confidence patterns with adequate sample size', () => {
    const base = Array.from({ length: 20 }, (_, i) => i + 1);
    const matrix = computeAllPairCorrelations({
      health: base,
      fitness: base.map((v) => v * 1.5),
      social: base.map((v) => 100 - v),
    });

    const patterns = detectSignificantPatterns(matrix, 0.7);

    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns[0].sampleSize).toBeGreaterThanOrEqual(14);
    expect(Math.abs(patterns[0].correlation)).toBeGreaterThanOrEqual(0.3);
    expect(patterns[0].confidence).toBeGreaterThanOrEqual(0.7);
  });
});

describe('insight helpers', () => {
  it('generates a narrative with direction and confidence', () => {
    const matrix = computeAllPairCorrelations({
      health: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      fitness: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    });
    const pattern = detectSignificantPatterns(matrix, 0.6)[0];
    const text = generateInsightNarrative(pattern);

    expect(text.toLowerCase()).toContain('health');
    expect(text.toLowerCase()).toContain('fitness');
    expect(text.toLowerCase()).toContain('confidence');
  });

  it('ranks unseen insights above previously seen ones', () => {
    const matrix = computeAllPairCorrelations({
      health: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      fitness: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
      social: [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
    });
    const patterns = detectSignificantPatterns(matrix, 0.6);
    const seen = new Set([`${patterns[0].keyA}|${patterns[0].keyB}|${patterns[0].direction}`]);
    const ranked = rankInsightsByNovelty(patterns, seen);

    expect(ranked[0].noveltyScore).toBeGreaterThanOrEqual(ranked[1].noveltyScore);
  });
});
