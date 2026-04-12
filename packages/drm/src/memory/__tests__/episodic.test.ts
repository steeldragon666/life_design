import {
  createEpisodicEntry,
  rankEpisodicMemories,
  shouldConsolidate,
  formatEpisodicForPrompt,
} from '../episodic';
import type { EpisodicMemory } from '../../types';
import { MemoryDetailLevel } from '../../types';

// ── Helpers ─────────────────────────────────────────────────────────────────

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function makeEmbedding(seed: number, length = 4): number[] {
  return Array.from({ length }, (_, i) => Math.sin(seed + i));
}

function baseEntry(overrides: Partial<Parameters<typeof createEpisodicEntry>[0]> = {}): EpisodicMemory {
  return createEpisodicEntry({
    id: 'ep-1',
    userId: 'u-1',
    sessionId: 's-1',
    timestamp: new Date(),
    summary: 'Discussed anxiety about work deadlines.',
    emotionalValence: -0.3,
    topics: ['anxiety', 'work'],
    interventionsUsed: ['breathing'],
    outcomeRating: 0.6,
    notableQuotes: [],
    followUp: null,
    embedding: makeEmbedding(1),
    ...overrides,
  });
}

// ── createEpisodicEntry ──────────────────────────────────────────────────────

describe('createEpisodicEntry', () => {
  it('produces a valid EpisodicMemory shape', () => {
    const entry = baseEntry();
    expect(entry.id).toBe('ep-1');
    expect(entry.userId).toBe('u-1');
    expect(entry.sessionId).toBe('s-1');
    expect(typeof entry.summary).toBe('string');
    expect(Array.isArray(entry.topics)).toBe(true);
    expect(Array.isArray(entry.embedding)).toBe(true);
    expect(entry.detailLevel).toBe(MemoryDetailLevel.Full);
    expect(entry.createdAt).toBeInstanceOf(Date);
    expect(entry.timestamp).toBeInstanceOf(Date);
  });

  it('preserves all supplied fields', () => {
    const ts = new Date('2025-01-01T00:00:00Z');
    const entry = baseEntry({
      id: 'custom-id',
      timestamp: ts,
      summary: 'Custom summary',
      emotionalValence: 0.8,
      topics: ['joy'],
    });
    expect(entry.id).toBe('custom-id');
    expect(entry.timestamp).toEqual(ts);
    expect(entry.summary).toBe('Custom summary');
    expect(entry.emotionalValence).toBe(0.8);
    expect(entry.topics).toEqual(['joy']);
  });

  it('detail level defaults to full', () => {
    const entry = baseEntry();
    expect(entry.detailLevel).toBe('full');
  });
});

// ── rankEpisodicMemories ─────────────────────────────────────────────────────

describe('rankEpisodicMemories', () => {
  const queryEmbedding = [1, 0, 0, 0];

  const stubSimilarity = (a: number[], b: number[]): number => {
    if (a.length !== b.length) return 0;
    return a.reduce((sum, v, i) => sum + v * b[i]!, 0);
  };

  it('returns empty array for empty input', () => {
    expect(rankEpisodicMemories([], queryEmbedding, stubSimilarity)).toEqual([]);
  });

  it('returns the same number of items as input', () => {
    const memories = [
      baseEntry({ id: 'e1', timestamp: daysAgo(5), embedding: [1, 0, 0, 0] }),
      baseEntry({ id: 'e2', timestamp: daysAgo(10), embedding: [0, 1, 0, 0] }),
      baseEntry({ id: 'e3', timestamp: daysAgo(1), embedding: [0, 0, 1, 0] }),
    ];
    const ranked = rankEpisodicMemories(memories, queryEmbedding, stubSimilarity);
    expect(ranked).toHaveLength(3);
  });

  it('places highest-scoring item first', () => {
    // e1 has perfect similarity AND is most recent → should rank first
    const memories = [
      baseEntry({ id: 'e1', timestamp: daysAgo(1), embedding: [1, 0, 0, 0] }),
      baseEntry({ id: 'e2', timestamp: daysAgo(20), embedding: [0, 0, 0, 1] }),
    ];
    const ranked = rankEpisodicMemories(memories, queryEmbedding, stubSimilarity);
    expect(ranked[0]!.id).toBe('e1');
  });

  it('attaches a relevanceScore to every item', () => {
    const memories = [
      baseEntry({ id: 'e1', timestamp: daysAgo(2), embedding: [1, 0, 0, 0] }),
    ];
    const ranked = rankEpisodicMemories(memories, queryEmbedding, stubSimilarity);
    expect(typeof ranked[0]!.relevanceScore).toBe('number');
    expect(Number.isFinite(ranked[0]!.relevanceScore)).toBe(true);
  });

  it('gives the most recent item a recency score of 1 when only one memory', () => {
    const memories = [baseEntry({ id: 'only', timestamp: new Date(), embedding: [0, 0, 0, 0] })];
    const ranked = rankEpisodicMemories(memories, queryEmbedding, stubSimilarity);
    // recency = 1.0, similarity = 0 → relevanceScore = 0*0.6 + 1*0.4 = 0.4
    expect(ranked[0]!.relevanceScore).toBeCloseTo(0.4, 5);
  });
});

// ── shouldConsolidate ────────────────────────────────────────────────────────

describe('shouldConsolidate', () => {
  it('returns "keep" for memories younger than 14 days', () => {
    const recent = baseEntry({ timestamp: daysAgo(5) });
    expect(shouldConsolidate(recent)).toBe('keep');
  });

  it('returns "summarise" for memories 14–90 days old', () => {
    const mid = baseEntry({ timestamp: daysAgo(30) });
    expect(shouldConsolidate(mid)).toBe('summarise');
  });

  it('returns "abstract" for memories older than 90 days', () => {
    const old = baseEntry({ timestamp: daysAgo(100) });
    expect(shouldConsolidate(old)).toBe('abstract');
  });

  it('returns "summarise" for a memory exactly 14 days old', () => {
    const edge = baseEntry({ timestamp: daysAgo(14) });
    expect(shouldConsolidate(edge)).toBe('summarise');
  });

  it('returns "abstract" for a memory exactly 91 days old', () => {
    const edge = baseEntry({ timestamp: daysAgo(91) });
    expect(shouldConsolidate(edge)).toBe('abstract');
  });
});

// ── formatEpisodicForPrompt ──────────────────────────────────────────────────

describe('formatEpisodicForPrompt', () => {
  it('returns an empty string for empty input', () => {
    expect(formatEpisodicForPrompt([], 1000)).toBe('');
  });

  it('respects token budget — truncates large input', () => {
    // Create many memories with long summaries to force truncation
    const memories: EpisodicMemory[] = Array.from({ length: 50 }, (_, i) =>
      baseEntry({
        id: `ep-${i}`,
        summary: 'A'.repeat(500),
        timestamp: daysAgo(i),
      }),
    );

    const maxTokens = 50; // tiny budget → truncation expected
    const result = formatEpisodicForPrompt(memories, maxTokens);
    // 50 tokens * 4 chars = 200 chars max
    expect(result.length).toBeLessThanOrEqual(maxTokens * 4 + 10); // slight buffer for rounding
  });

  it('includes a date, summary, and topics for each included memory', () => {
    const ts = new Date('2025-06-01T00:00:00Z');
    const memory = baseEntry({
      timestamp: ts,
      summary: 'Session about grief.',
      topics: ['grief', 'loss'],
    });
    const result = formatEpisodicForPrompt([memory], 10000);
    expect(result).toContain('2025-06-01');
    expect(result).toContain('Session about grief.');
    expect(result).toContain('grief');
  });

  it('includes emotional tone information', () => {
    const memory = baseEntry({ emotionalValence: 0.9 });
    const result = formatEpisodicForPrompt([memory], 10000);
    expect(result).toContain('very positive');
  });
});
