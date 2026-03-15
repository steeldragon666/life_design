import { describe, expect, it, vi } from 'vitest';
import {
  cosineSimilarity,
  findSemanticDimensionMatches,
} from '@/lib/dashboard-insights';
import { inferGoalDimensionSemantic } from '@/lib/goal-correlation';

// ---------------------------------------------------------------------------
// cosineSimilarity edge cases
// ---------------------------------------------------------------------------

describe('cosineSimilarity', () => {
  it('returns 1 for identical normalized vectors', () => {
    const a = new Float32Array([0.6, 0.8]);
    expect(cosineSimilarity(a, a)).toBeCloseTo(1.0, 5);
  });

  it('returns 0 for orthogonal vectors', () => {
    const a = new Float32Array([1, 0]);
    const b = new Float32Array([0, 1]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it('returns 0 when one vector is all zeros', () => {
    const a = new Float32Array([1, 2, 3]);
    const b = new Float32Array([0, 0, 0]);
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  it('returns 0 for different-length vectors', () => {
    const a = new Float32Array([1, 2]);
    const b = new Float32Array([1, 2, 3]);
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  it('returns -1 for opposite vectors', () => {
    const a = new Float32Array([1, 0]);
    const b = new Float32Array([-1, 0]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 5);
  });
});

// ---------------------------------------------------------------------------
// findSemanticDimensionMatches
// ---------------------------------------------------------------------------

describe('findSemanticDimensionMatches', () => {
  const prototypes = new Map<string, Float32Array>([
    ['career', new Float32Array([1, 0, 0])],
    ['health', new Float32Array([0, 1, 0])],
    ['fitness', new Float32Array([0, 0, 1])],
  ]);

  it('returns matches above threshold, sorted by similarity', () => {
    const embedding = new Float32Array([0.8, 0.6, 0.0]);
    const matches = findSemanticDimensionMatches(embedding, prototypes, 0.3);
    expect(matches.length).toBe(2);
    expect(matches[0].dimension).toBe('career');
    expect(matches[1].dimension).toBe('health');
    expect(matches[0].similarity).toBeGreaterThan(matches[1].similarity);
  });

  it('returns empty array when no dimension passes threshold', () => {
    const embedding = new Float32Array([0.1, 0.1, 0.1]);
    const matches = findSemanticDimensionMatches(embedding, prototypes, 0.99);
    expect(matches).toEqual([]);
  });

  it('uses default threshold of 0.3', () => {
    const embedding = new Float32Array([0, 0, 1]);
    const matches = findSemanticDimensionMatches(embedding, prototypes);
    expect(matches.length).toBe(1);
    expect(matches[0].dimension).toBe('fitness');
    expect(matches[0].similarity).toBeCloseTo(1.0, 5);
  });
});

// ---------------------------------------------------------------------------
// inferGoalDimensionSemantic
// ---------------------------------------------------------------------------

describe('inferGoalDimensionSemantic', () => {
  const goal = {
    id: 'g1',
    title: 'Get fit',
    horizon: 'short' as const,
    status: 'active' as const,
    target_date: '2026-06-01',
    description: 'Start a daily exercise routine',
  };

  it('returns the highest-scoring dimension from classify', async () => {
    const classify = vi.fn(async () => ({
      career: 0.1,
      finance: 0.05,
      health: 0.15,
      fitness: 0.85,
      family: 0.02,
      social: 0.03,
      romance: 0.01,
      growth: 0.1,
    }));
    const result = await inferGoalDimensionSemantic(goal, classify);
    expect(result).toBe('fitness');
    expect(classify).toHaveBeenCalledWith('Get fit Start a daily exercise routine');
  });

  it('falls back to keyword matching when classify throws', async () => {
    const classify = vi.fn(async () => {
      throw new Error('Model unavailable');
    });
    const result = await inferGoalDimensionSemantic(goal, classify);
    // Keyword matching should catch "exercise" → fitness
    expect(result).toBe('fitness');
  });

  it('uses keyword fallback when classify returns empty', async () => {
    const classify = vi.fn(async () => {
      throw new Error('timeout');
    });
    const goal2 = {
      id: 'g2',
      title: 'Save money for emergency fund',
      horizon: 'medium' as const,
      status: 'active' as const,
      target_date: '2027-01-01',
      description: 'Build a 6-month cash buffer',
    };
    const result = await inferGoalDimensionSemantic(goal2, classify);
    // "money", "save", "cash" → finance
    expect(result).toBe('finance');
  });
});
