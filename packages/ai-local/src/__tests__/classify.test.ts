import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @life-design/core
// ---------------------------------------------------------------------------

vi.mock('@life-design/core', () => {
  const dims = ['career', 'finance', 'health', 'fitness', 'family', 'social', 'romance', 'growth'];
  return {
    ALL_DIMENSIONS: dims,
    Dimension: Object.fromEntries(dims.map((d) => [d.charAt(0).toUpperCase() + d.slice(1), d])),
  };
});

// ---------------------------------------------------------------------------
// Mock ./embed — deterministic vectors based on text hash, no real model
// ---------------------------------------------------------------------------

vi.mock('../embed', () => {
  const DIM = 384;
  return {
    embed: vi.fn(async (text: string) => {
      if (!text.trim()) return new Float32Array(DIM);
      // Create a deterministic vector based on text hash
      const vec = new Float32Array(DIM);
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
      }
      for (let i = 0; i < DIM; i++) {
        vec[i] = Math.sin(hash + i);
      }
      // L2 normalize
      let norm = 0;
      for (let i = 0; i < DIM; i++) norm += vec[i] * vec[i];
      norm = Math.sqrt(norm);
      if (norm > 0) for (let i = 0; i < DIM; i++) vec[i] /= norm;
      return vec;
    }),
    embedBatch: vi.fn(async (texts: string[]) => {
      const { embed } = await import('../embed');
      return Promise.all(texts.map((t) => embed(t)));
    }),
    EMBEDDING_DIM: DIM,
  };
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const ALL_DIMS = ['career', 'finance', 'health', 'fitness', 'family', 'social', 'romance', 'growth'];

describe('classifyDimension', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('empty text returns uniform scores (1/8 each)', async () => {
    const { classifyDimension } = await import('../classify');
    const result = await classifyDimension('');
    const expected = 1 / 8;
    for (const dim of ALL_DIMS) {
      expect(result[dim as keyof typeof result]).toBeCloseTo(expected, 5);
    }
  });

  it('non-empty text returns Record with all 8 dimensions', async () => {
    const { classifyDimension } = await import('../classify');
    const result = await classifyDimension('I want to get a promotion at work this year');
    expect(Object.keys(result)).toHaveLength(8);
    for (const dim of ALL_DIMS) {
      expect(result[dim as keyof typeof result]).toBeGreaterThanOrEqual(0);
      expect(result[dim as keyof typeof result]).toBeLessThanOrEqual(1);
    }
  });

  it('non-empty text scores sum to approximately 1', async () => {
    const { classifyDimension } = await import('../classify');
    const result = await classifyDimension('I want to get a promotion at work this year');
    const sum = Object.values(result).reduce((acc, v) => acc + v, 0);
    expect(sum).toBeCloseTo(1, 4);
  });
});

describe('classifyGoal', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('empty text returns empty dimensions and weights', async () => {
    const { classifyGoal } = await import('../classify');
    const result = await classifyGoal('');
    expect(result.dimensions).toEqual([]);
    expect(result.weights).toEqual({});
  });

  it('non-empty text returns dimensions array and weights record', async () => {
    const { classifyGoal } = await import('../classify');
    const result = await classifyGoal('Run a half marathon and improve my fitness');
    expect(Array.isArray(result.dimensions)).toBe(true);
    expect(typeof result.weights).toBe('object');
    expect(result.weights).not.toBeNull();
  });

  it('dimensions below 0.15 threshold are filtered out', async () => {
    const { classifyGoal } = await import('../classify');
    const result = await classifyGoal('Save money and invest in index funds');
    // All returned dimensions must have a weight > 0.15
    for (const dim of result.dimensions) {
      expect(result.weights[dim]).toBeGreaterThan(0.15);
    }
  });

  it('weights keys match dimensions array', async () => {
    const { classifyGoal } = await import('../classify');
    const result = await classifyGoal('Learn a new programming language this quarter');
    const weightKeys = Object.keys(result.weights).sort();
    const dimsSorted = [...result.dimensions].sort();
    expect(weightKeys).toEqual(dimsSorted);
  });
});

describe('classifyJournalEntry', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('empty text returns neutral sentiment, empty dimensions, empty topics', async () => {
    const { classifyJournalEntry } = await import('../classify');
    const result = await classifyJournalEntry('');
    expect(result.sentiment).toBe('neutral');
    expect(result.dimensions).toEqual([]);
    expect(result.topics).toEqual([]);
  });

  it('text with positive words returns positive sentiment', async () => {
    const { classifyJournalEntry } = await import('../classify');
    const result = await classifyJournalEntry(
      'Today was amazing! I felt so happy and grateful. Everything went great.',
    );
    expect(result.sentiment).toBe('positive');
  });

  it('text with negative words returns negative sentiment', async () => {
    const { classifyJournalEntry } = await import('../classify');
    const result = await classifyJournalEntry(
      'Feeling terrible and exhausted. Stressed about problems and struggling badly.',
    );
    expect(result.sentiment).toBe('negative');
  });

  it('returns topics (non-stopwords) from text', async () => {
    const { classifyJournalEntry } = await import('../classify');
    const result = await classifyJournalEntry(
      'Went running today and completed marathon training session',
    );
    expect(Array.isArray(result.topics)).toBe(true);
    // Topics should be non-empty words; check they are strings
    for (const topic of result.topics) {
      expect(typeof topic).toBe('string');
      expect(topic.length).toBeGreaterThan(0);
    }
  });

  it('returns dimensions and sentiment fields as expected types', async () => {
    const { classifyJournalEntry } = await import('../classify');
    const result = await classifyJournalEntry('Had a productive work session today.');
    expect(Array.isArray(result.dimensions)).toBe(true);
    expect(['positive', 'negative', 'neutral']).toContain(result.sentiment);
    expect(Array.isArray(result.topics)).toBe(true);
  });
});

describe('detectMoodFromText', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('empty text returns mood 5 with confidence 0', async () => {
    const { detectMoodFromText } = await import('../classify');
    const result = await detectMoodFromText('');
    expect(result.estimatedMood).toBe(5);
    expect(result.confidence).toBe(0);
  });

  it('positive text returns mood > 5', async () => {
    const { detectMoodFromText } = await import('../classify');
    const result = await detectMoodFromText(
      'Amazing day! Happy, grateful, excited, wonderful, fantastic!',
    );
    expect(result.estimatedMood).toBeGreaterThan(5);
  });

  it('negative text returns mood < 5', async () => {
    const { detectMoodFromText } = await import('../classify');
    const result = await detectMoodFromText(
      'Terrible, awful, sad, stressed, exhausted, depressed, miserable.',
    );
    expect(result.estimatedMood).toBeLessThan(5);
  });

  it('mood is always in 1-10 range', async () => {
    const { detectMoodFromText } = await import('../classify');

    const texts = [
      '',
      'great happy amazing wonderful excellent',
      'terrible awful sad horrible miserable',
      'Today I went to the store.',
    ];

    for (const text of texts) {
      const result = await detectMoodFromText(text);
      expect(result.estimatedMood).toBeGreaterThanOrEqual(1);
      expect(result.estimatedMood).toBeLessThanOrEqual(10);
    }
  });

  it('confidence is between 0 and 1', async () => {
    const { detectMoodFromText } = await import('../classify');
    const result = await detectMoodFromText('I feel happy and great today!');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});
