import { retrieveAllMemoryLayers } from '../retrieval';
import type { RetrieveAllMemoryLayersParams } from '../retrieval';
import { createDefaultSemanticMemory } from '../semantic';
import { createDefaultRelationalMemory } from '../relational';
import { createDefaultTherapeuticMemory } from '../therapeutic';
import { createEpisodicEntry } from '../episodic';
import type { EpisodicMemory } from '../../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function stubSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  let dot = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) dot += (a[i] ?? 0) * (b[i] ?? 0);
  return dot;
}

function makeEpisodic(id: string, daysOld: number, embedding: number[] = [1, 0, 0, 0]): EpisodicMemory {
  return createEpisodicEntry({
    id,
    userId: 'u-retrieval',
    sessionId: `s-${id}`,
    timestamp: daysAgo(daysOld),
    summary: `Session ${id} summary about various topics.`,
    emotionalValence: 0.1,
    topics: [`topic-${id}`],
    interventionsUsed: [],
    outcomeRating: null,
    notableQuotes: [],
    followUp: null,
    embedding,
  });
}

const DEFAULT_BUDGETS = {
  semantic: 500,
  relational: 300,
  therapeutic: 300,
  episodicRecent: 500,
  episodicRelevant: 500,
};

function buildParams(
  episodicMemories: EpisodicMemory[] = [],
  queryEmbedding: number[] = [1, 0, 0, 0],
): RetrieveAllMemoryLayersParams {
  return {
    semantic: createDefaultSemanticMemory('u-retrieval'),
    relational: createDefaultRelationalMemory('u-retrieval'),
    therapeutic: createDefaultTherapeuticMemory('u-retrieval'),
    episodicMemories,
    queryEmbedding,
    cosineSimilarityFn: stubSimilarity,
    tokenBudgets: DEFAULT_BUDGETS,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('retrieveAllMemoryLayers', () => {
  it('returns all required block keys', () => {
    const result = retrieveAllMemoryLayers(buildParams());
    expect(result).toHaveProperty('semanticBlock');
    expect(result).toHaveProperty('relationalBlock');
    expect(result).toHaveProperty('therapeuticBlock');
    expect(result).toHaveProperty('episodicRecentBlock');
    expect(result).toHaveProperty('episodicRelevantBlock');
    expect(result).toHaveProperty('totalTokenEstimate');
  });

  it('does not throw with empty input', () => {
    expect(() => retrieveAllMemoryLayers(buildParams([]))).not.toThrow();
  });

  it('returns string values for all block fields', () => {
    const result = retrieveAllMemoryLayers(buildParams());
    expect(typeof result.semanticBlock).toBe('string');
    expect(typeof result.relationalBlock).toBe('string');
    expect(typeof result.therapeuticBlock).toBe('string');
    expect(typeof result.episodicRecentBlock).toBe('string');
    expect(typeof result.episodicRelevantBlock).toBe('string');
  });

  it('returns a positive totalTokenEstimate', () => {
    const params = buildParams([makeEpisodic('e1', 1)]);
    const result = retrieveAllMemoryLayers(params);
    expect(result.totalTokenEstimate).toBeGreaterThan(0);
  });

  it('episodic blocks do not duplicate the same memory', () => {
    // A single memory should appear in either recent or relevant, not both
    const memory = makeEpisodic('e-single', 1, [1, 0, 0, 0]);
    const params = buildParams([memory], [1, 0, 0, 0]);
    const result = retrieveAllMemoryLayers(params);

    const recentHasIt = result.episodicRecentBlock.includes('e-single');
    const relevantHasIt = result.episodicRelevantBlock.includes('e-single');

    // The date string 'e-single' is not in blocks (summaries are), so check via date prefix
    const datePrefix = memory.timestamp.toISOString().slice(0, 10);
    const recentContainsDate = result.episodicRecentBlock.includes(datePrefix);
    const relevantContainsDate = result.episodicRelevantBlock.includes(datePrefix);

    // At most one block should include this memory's date
    expect(recentContainsDate && relevantContainsDate).toBe(false);
    void recentHasIt;
    void relevantHasIt;
  });

  it('truncates when token budget is very small', () => {
    const memories = Array.from({ length: 20 }, (_, i) =>
      makeEpisodic(`ep-${i}`, i + 1),
    );
    const params: RetrieveAllMemoryLayersParams = {
      ...buildParams(memories),
      tokenBudgets: {
        ...DEFAULT_BUDGETS,
        episodicRecent: 10, // tiny budget
        episodicRelevant: 10,
      },
    };

    const result = retrieveAllMemoryLayers(params);
    // With 10 token budget (40 chars), should not include all 20 memories
    expect(result.episodicRecentBlock.length).toBeLessThanOrEqual(10 * 4 + 20);
  });

  it('handles empty query embedding without throwing', () => {
    const params = buildParams([makeEpisodic('e1', 2)], []);
    expect(() => retrieveAllMemoryLayers(params)).not.toThrow();
  });
});
