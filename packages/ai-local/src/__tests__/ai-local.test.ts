import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EMBEDDING_DIM } from '../models';

// ---------------------------------------------------------------------------
// Mock @huggingface/transformers before importing modules that depend on it.
// vi.mock factories are hoisted — cannot reference variables declared later.
// ---------------------------------------------------------------------------

vi.mock('../transformers-entry', () => {
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

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', async () => {
    const { cosineSimilarity } = await import('../similarity');
    const a = new Float32Array([1, 0, 0]);
    const b = new Float32Array([1, 0, 0]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0, 5);
  });

  it('returns 0 for orthogonal vectors', async () => {
    const { cosineSimilarity } = await import('../similarity');
    const a = new Float32Array([1, 0, 0]);
    const b = new Float32Array([0, 1, 0]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 5);
  });

  it('returns -1 for opposite vectors', async () => {
    const { cosineSimilarity } = await import('../similarity');
    const a = new Float32Array([1, 0, 0]);
    const b = new Float32Array([-1, 0, 0]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 5);
  });

  it('returns 0 for zero vectors', async () => {
    const { cosineSimilarity } = await import('../similarity');
    const a = new Float32Array([0, 0, 0]);
    const b = new Float32Array([1, 2, 3]);
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  it('throws on mismatched lengths', async () => {
    const { cosineSimilarity } = await import('../similarity');
    const a = new Float32Array([1, 0]);
    const b = new Float32Array([1, 0, 0]);
    expect(() => cosineSimilarity(a, b)).toThrow('vectors must have the same length');
  });
});

describe('findSimilarCheckIns', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns empty for empty check-ins array', async () => {
    const { findSimilarCheckIns } = await import('../similarity');
    const result = await findSimilarCheckIns('test', []);
    expect(result).toEqual([]);
  });

  it('returns scored check-ins up to topK', async () => {
    const { findSimilarCheckIns } = await import('../similarity');
    const mockCheckIns = Array.from({ length: 8 }, (_, i) => ({
      id: `ci-${i}`,
      user_id: 'u1',
      date: `2024-01-0${i + 1}`,
      mood: 5 + (i % 3),
      duration_type: 'quick' as any,
      journal_entry: `Journal entry ${i}`,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    }));

    const result = await findSimilarCheckIns('feeling great', mockCheckIns, 3);
    expect(result).toHaveLength(3);
    expect(result[0]).toHaveProperty('checkIn');
    expect(result[0]).toHaveProperty('similarity');
    expect(typeof result[0].similarity).toBe('number');
  });
});

describe('clusterCheckIns', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns empty for empty input', async () => {
    const { clusterCheckIns } = await import('../similarity');
    const result = await clusterCheckIns([]);
    expect(result).toEqual([]);
  });

  it('returns clusters with members', async () => {
    const { clusterCheckIns } = await import('../similarity');
    const mockCheckIns = Array.from({ length: 6 }, (_, i) => ({
      id: `ci-${i}`,
      user_id: 'u1',
      date: `2024-01-0${i + 1}`,
      mood: i < 3 ? 8 : 3,
      duration_type: 'quick' as any,
      journal_entry: `Entry ${i}`,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    }));

    const result = await clusterCheckIns(mockCheckIns, 2);
    expect(result.length).toBeGreaterThan(0);
    for (const cluster of result) {
      expect(cluster).toHaveProperty('centroid');
      expect(cluster).toHaveProperty('label');
      expect(cluster).toHaveProperty('members');
      expect(cluster.members.length).toBeGreaterThan(0);
    }
  });
});

describe('classifyGoal', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns dimensions and weights for a goal', async () => {
    const { classifyGoal } = await import('../classify');
    const result = await classifyGoal('Run a half marathon in under 2 hours');
    expect(result).toHaveProperty('dimensions');
    expect(result).toHaveProperty('weights');
    expect(Array.isArray(result.dimensions)).toBe(true);
  });

  it('returns empty for empty input', async () => {
    const { classifyGoal } = await import('../classify');
    const result = await classifyGoal('');
    expect(result.dimensions).toEqual([]);
    expect(result.weights).toEqual({});
  });
});

describe('classifyJournalEntry', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns dimensions, sentiment, and topics', async () => {
    const { classifyJournalEntry } = await import('../classify');
    const result = await classifyJournalEntry(
      'Had a great workout at the gym and then met friends for dinner',
    );
    expect(result).toHaveProperty('dimensions');
    expect(result).toHaveProperty('sentiment');
    expect(result).toHaveProperty('topics');
    // The mock returns dimension labels as the top label from zero-shot;
    // sentiment is the first label from the second classifier call.
    // Just verify the structure and types are correct.
    expect(typeof result.sentiment).toBe('string');
    expect(Array.isArray(result.dimensions)).toBe(true);
    expect(Array.isArray(result.topics)).toBe(true);
  });

  it('returns neutral for empty input', async () => {
    const { classifyJournalEntry } = await import('../classify');
    const result = await classifyJournalEntry('');
    expect(result.sentiment).toBe('neutral');
    expect(result.dimensions).toEqual([]);
  });
});

describe('detectMoodFromText', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns mood estimate and confidence', async () => {
    const { detectMoodFromText } = await import('../classify');
    const result = await detectMoodFromText('Today was absolutely amazing!');
    expect(result).toHaveProperty('estimatedMood');
    expect(result).toHaveProperty('confidence');
    expect(result.estimatedMood).toBeGreaterThanOrEqual(1);
    expect(result.estimatedMood).toBeLessThanOrEqual(10);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('returns neutral mood (3) for empty input', async () => {
    const { detectMoodFromText } = await import('../classify');
    const result = await detectMoodFromText('');
    expect(result.estimatedMood).toBe(3);
    expect(result.confidence).toBe(0);
  });
});

describe('generateJournalPreview', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns short text unchanged', async () => {
    const { generateJournalPreview } = await import('../summarize');
    const shortText = 'Just a quick note.';
    const result = await generateJournalPreview(shortText);
    expect(result).toBe(shortText);
  });

  it('summarizes long text', async () => {
    const { generateJournalPreview } = await import('../summarize');
    const longText = 'A'.repeat(150) + ' this is a very long journal entry that needs summarizing.';
    const result = await generateJournalPreview(longText);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns empty for empty input', async () => {
    const { generateJournalPreview } = await import('../summarize');
    const result = await generateJournalPreview('');
    expect(result).toBe('');
  });
});

describe('summarizeWeeklyJournals', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns a summary for multiple journals', async () => {
    const { summarizeWeeklyJournals } = await import('../summarize');
    const journals = [
      'Had a productive day at work today.',
      'Went for a long run and felt energized.',
      'Spent quality time with family.',
    ];
    const result = await summarizeWeeklyJournals(journals);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns empty for empty input', async () => {
    const { summarizeWeeklyJournals } = await import('../summarize');
    const result = await summarizeWeeklyJournals([]);
    expect(result).toBe('');
  });
});

describe('extractScoresFromSpeech', () => {
  it('extracts explicit dimension scores', async () => {
    const { extractScoresFromSpeech } = await import('../voice-processor');
    const transcript = 'My career is about a 4 and fitness maybe 5. Health is about a 3.';
    const result = extractScoresFromSpeech(transcript);
    expect(result.career).toBe(4);
    expect(result.fitness).toBe(5);
    expect(result.health).toBe(3);
  });

  it('handles "I\'d say my X is a Y" patterns', async () => {
    const { extractScoresFromSpeech } = await import('../voice-processor');
    const transcript = "I'd say my social is a 4";
    const result = extractScoresFromSpeech(transcript);
    expect(result.social).toBe(4);
  });

  it('ignores out of range scores', async () => {
    const { extractScoresFromSpeech } = await import('../voice-processor');
    const transcript = 'career is about a 15';
    const result = extractScoresFromSpeech(transcript);
    expect(result.career).toBeUndefined();
  });

  it('returns empty for text without scores', async () => {
    const { extractScoresFromSpeech } = await import('../voice-processor');
    const result = extractScoresFromSpeech('Today was a good day overall.');
    expect(Object.keys(result)).toHaveLength(0);
  });
});

describe('processVoiceCheckIn', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns structured check-in from transcript', async () => {
    const { processVoiceCheckIn } = await import('../voice-processor');
    const result = await processVoiceCheckIn('Career is about a 4, feeling pretty good today.');
    expect(result).toHaveProperty('mood');
    expect(result).toHaveProperty('dimensions');
    expect(result).toHaveProperty('cleanedJournal');
    expect(result).toHaveProperty('rawTranscript');
    expect(result.mood).toBeGreaterThanOrEqual(1);
    expect(result.mood).toBeLessThanOrEqual(5);
    // Explicit career score should override classifier
    expect(result.dimensions.career).toBe(4);
  });

  it('returns defaults for empty transcript', async () => {
    const { processVoiceCheckIn } = await import('../voice-processor');
    const result = await processVoiceCheckIn('');
    expect(result.mood).toBe(3);
    expect(result.cleanedJournal).toBe('');
    expect(Object.keys(result.dimensions)).toHaveLength(0);
  });
});

describe('AILocalClient', () => {
  it('exposes all methods including new ones', async () => {
    const { AILocalClient } = await import('../index');
    const client = new AILocalClient();
    expect(typeof client.embed).toBe('function');
    expect(typeof client.classify).toBe('function');
    expect(typeof client.summarize).toBe('function');
    expect(typeof client.embedBatch).toBe('function');
    expect(typeof client.classifyGoal).toBe('function');
    expect(typeof client.classifyJournal).toBe('function');
    expect(typeof client.detectMood).toBe('function');
    expect(typeof client.journalPreview).toBe('function');
    expect(typeof client.summarizeWeekly).toBe('function');
    expect(typeof client.processVoice).toBe('function');
    expect(typeof client.dispose).toBe('function');
    client.dispose();
  });
});

describe('models registry', () => {
  it('has embedding model entry', async () => {
    const { MODEL_REGISTRY } = await import('../models');
    expect(MODEL_REGISTRY.embedding.modelId).toBe('Xenova/all-MiniLM-L6-v2');
  });

  it('DIMENSION_LABELS has 8 entries', async () => {
    const { DIMENSION_LABELS } = await import('../models');
    expect(DIMENSION_LABELS).toHaveLength(8);
  });
});
