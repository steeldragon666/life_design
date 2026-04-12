import {
  generateEmbedding,
  cosineSimilarity,
  EMBEDDING_DIMENSIONS,
} from '../embeddings.js';

describe('EMBEDDING_DIMENSIONS', () => {
  it('is 1536', () => {
    expect(EMBEDDING_DIMENSIONS).toBe(1536);
  });
});

describe('generateEmbedding', () => {
  it('returns an array of length 1536', async () => {
    const embedding = await generateEmbedding('hello world', 'test-key');
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding).toHaveLength(EMBEDDING_DIMENSIONS);
  });

  it('returns only numeric values', async () => {
    const embedding = await generateEmbedding('test text', 'test-key');
    for (const v of embedding) {
      expect(typeof v).toBe('number');
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('is deterministic — same input produces same output', async () => {
    const text = 'I have been feeling anxious lately';
    const a = await generateEmbedding(text, 'key-a');
    const b = await generateEmbedding(text, 'key-b');
    expect(a).toEqual(b);
  });

  it('produces different vectors for different inputs', async () => {
    const a = await generateEmbedding('anxiety about work', 'k');
    const b = await generateEmbedding('feeling great today', 'k');
    // Not all components should be equal
    const allEqual = a.every((v, i) => v === b[i]);
    expect(allEqual).toBe(false);
  });

  it('returns a unit-length (L2-normalised) vector', async () => {
    const embedding = await generateEmbedding('normalisation test', 'k');
    const magnitude = Math.sqrt(embedding.reduce((acc, v) => acc + v * v, 0));
    expect(magnitude).toBeCloseTo(1.0, 5);
  });
});

describe('cosineSimilarity', () => {
  it('returns ~1 for identical vectors', async () => {
    const v = await generateEmbedding('identical', 'k');
    const sim = cosineSimilarity(v, v);
    expect(sim).toBeCloseTo(1.0, 5);
  });

  it('returns 0 for zero vectors (no NaN)', () => {
    const zero = new Array(10).fill(0);
    const sim = cosineSimilarity(zero, zero);
    expect(sim).toBe(0);
    expect(Number.isNaN(sim)).toBe(false);
  });

  it('returns 0 for orthogonal vectors', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeCloseTo(0, 10);
  });

  it('returns -1 for anti-parallel vectors', () => {
    const a = [1, 0, 0];
    const b = [-1, 0, 0];
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeCloseTo(-1, 10);
  });

  it('clamps result to [-1, 1] to guard against floating-point drift', () => {
    // Slightly denormalised vectors that could produce > 1 due to float imprecision
    const a = [1.0000001, 0, 0];
    const b = [1.0000001, 0, 0];
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeLessThanOrEqual(1);
    expect(sim).toBeGreaterThanOrEqual(-1);
  });

  it('throws when vectors have different lengths', () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow();
  });

  it('returns a higher similarity for semantically related texts (same embedding)', async () => {
    const v1 = await generateEmbedding('sad', 'k');
    const v2 = await generateEmbedding('sad', 'k');
    const v3 = await generateEmbedding('completely unrelated xyz', 'k');
    const simSame = cosineSimilarity(v1, v2);
    // Same text → identical embedding → should be near 1
    expect(simSame).toBeCloseTo(1.0, 5);
    // v3 is different — its sim with v1 is some value, but simSame should beat it
    const simDiff = cosineSimilarity(v1, v3);
    expect(simSame).toBeGreaterThan(simDiff);
  });
});
