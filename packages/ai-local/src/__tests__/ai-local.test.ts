import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EMBEDDING_DIM } from '../models';

// ---------------------------------------------------------------------------
// Mock @huggingface/transformers before importing modules that depend on it.
// vi.mock factories are hoisted — cannot reference variables declared later.
// ---------------------------------------------------------------------------

vi.mock('@huggingface/transformers', () => {
  const DIM = 384;
  const dims = ['career', 'finance', 'health', 'fitness', 'family', 'social', 'romance', 'growth'];
  const makeSingleOutput = () => ({
    tolist: () => [Array.from({ length: DIM }, (_, i) => (i % 2 === 0 ? 0.5 : -0.5))],
  });
  const makeBatchOutput = (n: number) => ({
    tolist: () => Array.from({ length: n }, () =>
      Array.from({ length: DIM }, (_, i) => (i % 2 === 0 ? 0.5 : -0.5)),
    ),
  });

  return {
    pipeline: vi.fn(async (task: string) => {
      switch (task) {
        case 'feature-extraction':
          return vi.fn(async (input: string | string[]) => {
            if (Array.isArray(input)) return makeBatchOutput(input.length);
            return makeSingleOutput();
          });
        case 'zero-shot-classification':
          return vi.fn(async () => ({
            labels: [...dims],
            scores: [0.25, 0.05, 0.10, 0.05, 0.05, 0.05, 0.05, 0.40],
          }));
        case 'summarization':
          return vi.fn(async () => [{ summary_text: 'A concise summary of the input text.' }]);
        default:
          throw new Error(`Unknown task: ${task}`);
      }
    }),
  };
});

// Mock @life-design/core since re-exports need resolution
vi.mock('@life-design/core', () => {
  const dims = ['career', 'finance', 'health', 'fitness', 'family', 'social', 'romance', 'growth'];
  return {
    ALL_DIMENSIONS: dims,
    Dimension: Object.fromEntries(dims.map((d) => [d.charAt(0).toUpperCase() + d.slice(1), d])),
  };
});

// ---------------------------------------------------------------------------
// Shared test constants
// ---------------------------------------------------------------------------

const ALL_DIMS = [
  'career', 'finance', 'health', 'fitness',
  'family', 'social', 'romance', 'growth',
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('embed', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns a Float32Array of the correct length', async () => {
    const { embed } = await import('../embed');
    const result = await embed('test text');
    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(EMBEDDING_DIM);
  });

  it('returns L2-normalized vectors (unit length)', async () => {
    const { embed } = await import('../embed');
    const vec = await embed('normalize this');
    let norm = 0;
    for (let i = 0; i < vec.length; i++) {
      norm += vec[i] * vec[i];
    }
    norm = Math.sqrt(norm);
    expect(norm).toBeCloseTo(1.0, 4);
  });

  it('returns zero vector for empty input', async () => {
    const { embed } = await import('../embed');
    const result = await embed('');
    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(EMBEDDING_DIM);
    const allZero = result.every((v) => v === 0);
    expect(allZero).toBe(true);
  });

  it('returns zero vector for whitespace-only input', async () => {
    const { embed } = await import('../embed');
    const result = await embed('   \n\t  ');
    expect(result).toBeInstanceOf(Float32Array);
    const allZero = result.every((v) => v === 0);
    expect(allZero).toBe(true);
  });
});

describe('embedBatch', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns correct number of Float32Arrays', async () => {
    const { embedBatch } = await import('../embed');
    const results = await embedBatch(['text one', 'text two', 'text three']);
    expect(results).toHaveLength(3);
    for (const vec of results) {
      expect(vec).toBeInstanceOf(Float32Array);
      expect(vec.length).toBe(EMBEDDING_DIM);
    }
  });

  it('returns empty array for empty input', async () => {
    const { embedBatch } = await import('../embed');
    const results = await embedBatch([]);
    expect(results).toEqual([]);
  });

  it('returns L2-normalized vectors', async () => {
    const { embedBatch } = await import('../embed');
    const results = await embedBatch(['hello', 'world']);
    for (const vec of results) {
      let norm = 0;
      for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
      expect(Math.sqrt(norm)).toBeCloseTo(1.0, 4);
    }
  });
});

describe('classify', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns scores for all 8 dimensions', async () => {
    const { classifyDimension } = await import('../classify');
    const result = await classifyDimension('got promoted at work');
    expect(Object.keys(result)).toHaveLength(ALL_DIMS.length);
    for (const dim of ALL_DIMS) {
      expect(typeof result[dim as keyof typeof result]).toBe('number');
      expect(result[dim as keyof typeof result]).toBeGreaterThanOrEqual(0);
      expect(result[dim as keyof typeof result]).toBeLessThanOrEqual(1);
    }
  });

  it('returns uniform scores for empty input', async () => {
    const { classifyDimension } = await import('../classify');
    const result = await classifyDimension('');
    const expected = 1 / ALL_DIMS.length;
    for (const dim of ALL_DIMS) {
      expect(result[dim as keyof typeof result]).toBeCloseTo(expected, 5);
    }
  });
});

describe('summarize', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns a summary string', async () => {
    const { summarize } = await import('../summarize');
    const result = await summarize('This is a long text that needs to be summarized.');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns empty string for empty input', async () => {
    const { summarize } = await import('../summarize');
    const result = await summarize('');
    expect(result).toBe('');
  });
});

describe('lazySingleton', () => {
  it('calls factory only once', async () => {
    const { lazySingleton } = await import('../models');
    const factory = vi.fn(async () => 'instance');
    const getSingleton = lazySingleton(factory);

    await getSingleton();
    await getSingleton();
    await getSingleton();

    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('passes onProgress to factory on first call', async () => {
    const { lazySingleton } = await import('../models');
    const factory = vi.fn(async (_onProgress?: unknown) => 'instance');
    const getSingleton = lazySingleton(factory);
    const progressCb = vi.fn();

    await getSingleton(progressCb);
    expect(factory).toHaveBeenCalledWith(progressCb);
  });
});

describe('AILocalClient', () => {
  it('exposes embed, classify, summarize, and dispose methods', async () => {
    const { AILocalClient } = await import('../index');
    const client = new AILocalClient();
    expect(typeof client.embed).toBe('function');
    expect(typeof client.classify).toBe('function');
    expect(typeof client.summarize).toBe('function');
    expect(typeof client.embedBatch).toBe('function');
    expect(typeof client.dispose).toBe('function');
    client.dispose();
  });
});

describe('models registry', () => {
  it('has entries for all three tasks', async () => {
    const { MODEL_REGISTRY } = await import('../models');
    expect(MODEL_REGISTRY.embedding.modelId).toBe('Xenova/all-MiniLM-L6-v2');
    expect(MODEL_REGISTRY.classification.modelId).toBe('Xenova/mobilebert-uncased-mnli');
    expect(MODEL_REGISTRY.summarization.modelId).toBe('Xenova/distilbart-cnn-6-6');
  });

  it('DIMENSION_LABELS has 8 entries', async () => {
    const { DIMENSION_LABELS } = await import('../models');
    expect(DIMENSION_LABELS).toHaveLength(8);
  });
});
