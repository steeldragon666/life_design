import { describe, expect, it } from 'vitest';
import {
  computeAllPairCorrelations,
  detectSignificantPatterns,
  generateInsightNarrative,
  grangerCausality,
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

describe('grangerCausality', () => {
  it('returns null for insufficient data', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 3, 4, 5, 6];
    // maxLag=3 needs at least 3+5=8 observations
    expect(grangerCausality(x, y, 3)).toBeNull();
  });

  it('detects X→Y causality when X leads Y', () => {
    // X causes Y: Y[t] = 0.8 * X[t-1] + noise
    const n = 50;
    const x: number[] = [];
    const y: number[] = [];

    // Use a seeded-like deterministic sequence
    let seed = 42;
    const pseudoRandom = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return (seed / 0x7fffffff) * 2 - 1; // [-1, 1]
    };

    for (let i = 0; i < n; i++) {
      x.push(pseudoRandom() * 5);
    }
    // Y depends on lagged X
    y.push(pseudoRandom() * 0.1);
    for (let i = 1; i < n; i++) {
      y.push(0.8 * x[i - 1] + pseudoRandom() * 0.3);
    }

    const result = grangerCausality(x, y, 2);
    expect(result).not.toBeNull();
    expect(['x_causes_y', 'bidirectional']).toContain(result!.direction);
    expect(result!.pValueXY).toBeLessThan(0.05);
  });

  it('detects Y→X causality when Y leads X', () => {
    // Y causes X: X[t] = 0.8 * Y[t-1] + noise
    const n = 50;
    const y: number[] = [];
    const x: number[] = [];

    let seed = 99;
    const pseudoRandom = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return (seed / 0x7fffffff) * 2 - 1;
    };

    for (let i = 0; i < n; i++) {
      y.push(pseudoRandom() * 5);
    }
    x.push(pseudoRandom() * 0.1);
    for (let i = 1; i < n; i++) {
      x.push(0.8 * y[i - 1] + pseudoRandom() * 0.3);
    }

    const result = grangerCausality(x, y, 2);
    expect(result).not.toBeNull();
    expect(['y_causes_x', 'bidirectional']).toContain(result!.direction);
    expect(result!.pValueYX).toBeLessThan(0.05);
  });

  it("returns 'none' when series are independent", () => {
    const n = 30;
    const x: number[] = [];
    const y: number[] = [];

    let seedA = 11;
    let seedB = 77;
    const prngA = () => {
      seedA = (seedA * 1103515245 + 12345) & 0x7fffffff;
      return (seedA / 0x7fffffff) * 2 - 1;
    };
    const prngB = () => {
      seedB = (seedB * 1103515245 + 12345) & 0x7fffffff;
      return (seedB / 0x7fffffff) * 2 - 1;
    };

    for (let i = 0; i < n; i++) {
      x.push(prngA() * 10);
      y.push(prngB() * 10);
    }

    const result = grangerCausality(x, y, 2);
    expect(result).not.toBeNull();
    expect(result!.direction).toBe('none');
  });

  it("returns 'bidirectional' when both directions are significant", () => {
    // Both X and Y depend on each other's lagged values
    const n = 60;
    const x: number[] = [1, 2];
    const y: number[] = [2, 1];

    let seed = 55;
    const pseudoRandom = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return (seed / 0x7fffffff) * 2 - 1;
    };

    for (let i = 2; i < n; i++) {
      x.push(0.7 * y[i - 1] + pseudoRandom() * 0.2);
      y.push(0.7 * x[i - 1] + pseudoRandom() * 0.2);
    }

    const result = grangerCausality(x, y, 1);
    expect(result).not.toBeNull();
    expect(result!.direction).toBe('bidirectional');
    expect(result!.pValueXY).toBeLessThan(0.05);
    expect(result!.pValueYX).toBeLessThan(0.05);
  });

  it('maps assessment correctly based on p-values', () => {
    // Strong causality: very clear signal
    const n = 80;
    const x: number[] = [];
    const y: number[] = [];

    let seed = 123;
    const pseudoRandom = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return (seed / 0x7fffffff) * 2 - 1;
    };

    for (let i = 0; i < n; i++) {
      x.push(pseudoRandom() * 5);
    }
    y.push(0);
    for (let i = 1; i < n; i++) {
      y.push(0.95 * x[i - 1] + pseudoRandom() * 0.05);
    }

    const result = grangerCausality(x, y, 2);
    expect(result).not.toBeNull();
    // With such a strong signal, assessment should be 'strong'
    expect(result!.assessment).toBe('strong');
  });

  it('lagUsed matches maxLag parameter', () => {
    // Use enough data and non-degenerate series for both lag values
    let seed = 200;
    const pseudoRandom = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return (seed / 0x7fffffff) * 2 - 1;
    };

    const n = 40;
    const x = Array.from({ length: n }, () => pseudoRandom() * 5);
    const y = Array.from({ length: n }, () => pseudoRandom() * 5);

    const result3 = grangerCausality(x, y, 3);
    expect(result3).not.toBeNull();
    expect(result3!.lagUsed).toBe(3);

    const result5 = grangerCausality(x, y, 5);
    expect(result5).not.toBeNull();
    expect(result5!.lagUsed).toBe(5);
  });

  it('handles NaN values by filtering them out', () => {
    const n = 30;
    const x: number[] = [];
    const y: number[] = [];

    let seed = 42;
    const pseudoRandom = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return (seed / 0x7fffffff) * 2 - 1;
    };

    for (let i = 0; i < n; i++) {
      x.push(pseudoRandom() * 5);
    }
    y.push(0);
    for (let i = 1; i < n; i++) {
      y.push(0.8 * x[i - 1] + pseudoRandom() * 0.3);
    }

    // Insert some NaNs
    x[5] = NaN;
    y[10] = NaN;
    x[15] = NaN;

    const result = grangerCausality(x, y, 2);
    // Should still work with enough valid data
    expect(result).not.toBeNull();
    expect(result!.fStatisticXY).toBeGreaterThan(0);
  });
});
