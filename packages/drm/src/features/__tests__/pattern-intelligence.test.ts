import {
  detectCyclicalPatterns,
  detectAvoidancePatterns,
} from '../pattern-intelligence.js';
import type { EpisodicMemory } from '../../types.js';
import { createEpisodicEntry } from '../../memory/episodic.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function makeMemory(
  id: string,
  daysOld: number,
  topics: string[],
): EpisodicMemory {
  return createEpisodicEntry({
    id,
    userId: 'u-pattern',
    sessionId: `s-${id}`,
    timestamp: daysAgo(daysOld),
    summary: `Session ${id}.`,
    emotionalValence: -0.1,
    topics,
    interventionsUsed: [],
    outcomeRating: null,
    notableQuotes: [],
    followUp: null,
    embedding: [0, 0, 0, 0],
  });
}

// ── detectCyclicalPatterns ───────────────────────────────────────────────────

describe('detectCyclicalPatterns', () => {
  it('returns empty array for fewer than 3 memories', () => {
    const memories = [
      makeMemory('e1', 7, ['work']),
      makeMemory('e2', 14, ['work']),
    ];
    expect(detectCyclicalPatterns(memories)).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(detectCyclicalPatterns([])).toEqual([]);
  });

  it('detects weekly patterns in appropriately spaced data', () => {
    // 4 occurrences of "anxiety" spaced ~7 days apart
    const memories = [
      makeMemory('e1', 28, ['anxiety']),
      makeMemory('e2', 21, ['anxiety']),
      makeMemory('e3', 14, ['anxiety']),
      makeMemory('e4', 7, ['anxiety']),
    ];

    const patterns = detectCyclicalPatterns(memories);
    const weeklyPatterns = patterns.filter((p) => p.periodicity === 'weekly');
    expect(weeklyPatterns.length).toBeGreaterThan(0);
    expect(weeklyPatterns[0]!.description).toContain('anxiety');
  });

  it('weekly pattern has confidence > 0', () => {
    const memories = [
      makeMemory('e1', 28, ['sleep']),
      makeMemory('e2', 21, ['sleep']),
      makeMemory('e3', 14, ['sleep']),
      makeMemory('e4', 7, ['sleep']),
    ];

    const patterns = detectCyclicalPatterns(memories);
    const sleepPattern = patterns.find((p) => p.description.includes('sleep'));
    expect(sleepPattern).toBeDefined();
    expect(sleepPattern!.confidence).toBeGreaterThan(0);
    expect(sleepPattern!.confidence).toBeLessThanOrEqual(1);
  });

  it('does not flag a topic that appears only twice', () => {
    const memories = [
      makeMemory('e1', 7, ['finance']),
      makeMemory('e2', 14, ['finance']),
      // Only 2 occurrences — not enough for a pattern
      makeMemory('e3', 21, ['other']),
    ];
    const patterns = detectCyclicalPatterns(memories);
    const financePattern = patterns.find((p) => p.description.includes('finance'));
    expect(financePattern).toBeUndefined();
  });

  it('assigns a lastOccurrence date', () => {
    const memories = [
      makeMemory('e1', 28, ['grief']),
      makeMemory('e2', 21, ['grief']),
      makeMemory('e3', 14, ['grief']),
      makeMemory('e4', 7, ['grief']),
    ];

    const patterns = detectCyclicalPatterns(memories);
    const griefPattern = patterns.find((p) => p.description.includes('grief'));
    if (griefPattern) {
      expect(griefPattern.lastOccurrence).not.toBeNull();
      expect(griefPattern.lastOccurrence).toBeInstanceOf(Date);
    }
  });
});

// ── detectAvoidancePatterns ──────────────────────────────────────────────────

describe('detectAvoidancePatterns', () => {
  it('returns empty array for empty memories', () => {
    expect(detectAvoidancePatterns([], [])).toEqual([]);
  });

  it('identifies topics mentioned but not explored', () => {
    // "family" mentioned in 3 sessions but never explored
    const memories = [
      makeMemory('e1', 30, ['family', 'work']),
      makeMemory('e2', 20, ['family', 'stress']),
      makeMemory('e3', 10, ['family', 'health']),
    ];

    const patterns = detectAvoidancePatterns(memories, []);
    const familyPattern = patterns.find((p) => p.topic === 'family');
    expect(familyPattern).toBeDefined();
    expect(familyPattern!.exploredCount).toBe(0);
    expect(familyPattern!.mentionCount).toBeGreaterThanOrEqual(3);
  });

  it('does not flag a topic that has been explored', () => {
    const memories = [
      makeMemory('e1', 20, ['relationships']),
      makeMemory('e2', 10, ['relationships']),
    ];

    // Mark 'relationships' as explored in the semantic topics
    const patterns = detectAvoidancePatterns(memories, ['relationships']);
    const relPattern = patterns.find((p) => p.topic === 'relationships');
    expect(relPattern).toBeUndefined();
  });

  it('does not flag a topic mentioned only once', () => {
    const memories = [makeMemory('e1', 10, ['finances'])];
    const patterns = detectAvoidancePatterns(memories, []);
    const finPattern = patterns.find((p) => p.topic === 'finances');
    expect(finPattern).toBeUndefined();
  });

  it('includes a mentionCount on each pattern', () => {
    const memories = [
      makeMemory('e1', 30, ['grief']),
      makeMemory('e2', 20, ['grief']),
      makeMemory('e3', 10, ['grief']),
    ];

    const patterns = detectAvoidancePatterns(memories, []);
    const griefPattern = patterns.find((p) => p.topic === 'grief');
    expect(griefPattern).toBeDefined();
    expect(typeof griefPattern!.mentionCount).toBe('number');
    expect(griefPattern!.mentionCount).toBeGreaterThanOrEqual(3);
  });

  it('sorts by mentionCount descending (strongest avoidance first)', () => {
    const memories = [
      makeMemory('e1', 40, ['trauma', 'anger']),
      makeMemory('e2', 30, ['trauma', 'anger']),
      makeMemory('e3', 20, ['trauma']),
      makeMemory('e4', 10, ['trauma']),
    ];

    const patterns = detectAvoidancePatterns(memories, []);
    if (patterns.length >= 2) {
      expect(patterns[0]!.mentionCount).toBeGreaterThanOrEqual(patterns[1]!.mentionCount);
    }
  });
});
