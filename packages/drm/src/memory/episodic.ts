/**
 * @module memory/episodic
 *
 * Layer 1: Episodic Memory — what happened.
 * Pure functions only. No I/O. Data in, results out.
 */

import type { EpisodicMemory, MemoryDetailLevel } from '../types'

// ── Derived Types ─────────────────────────────────────────────────────────────

export type RankedMemory = EpisodicMemory & { relevanceScore: number }

// ── Factory ───────────────────────────────────────────────────────────────────

export interface CreateEpisodicEntryParams {
  id: string
  userId: string
  sessionId: string
  timestamp: Date
  summary: string
  emotionalValence: number
  topics: string[]
  interventionsUsed: string[]
  outcomeRating: number | null
  notableQuotes: string[]
  followUp: string | null
  embedding: number[]
}

/**
 * Create a new episodic memory entry from a session summary.
 * Detail level starts as Full; progressive summarisation downgrades it later.
 */
export function createEpisodicEntry(
  params: CreateEpisodicEntryParams,
): EpisodicMemory {
  return {
    id: params.id,
    userId: params.userId,
    sessionId: params.sessionId,
    timestamp: params.timestamp,
    summary: params.summary,
    emotionalValence: params.emotionalValence,
    topics: params.topics,
    interventionsUsed: params.interventionsUsed,
    outcomeRating: params.outcomeRating,
    notableQuotes: params.notableQuotes,
    followUp: params.followUp,
    embedding: params.embedding,
    detailLevel: 'full' as MemoryDetailLevel,
    createdAt: new Date(),
  }
}

// ── Ranking ───────────────────────────────────────────────────────────────────

/**
 * Rank episodic memories by a hybrid score:
 *   relevanceScore = similarity * 0.6 + recency * 0.4
 *
 * Recency is normalised to [0, 1] across the provided set so that the most
 * recent memory scores 1.0 and the oldest scores 0.0.  When only one memory
 * is present it receives a recency score of 1.0.
 *
 * Results are sorted descending by relevanceScore.
 */
export function rankEpisodicMemories(
  memories: EpisodicMemory[],
  queryEmbedding: number[],
  cosineSimilarityFn: (a: number[], b: number[]) => number,
): RankedMemory[] {
  if (memories.length === 0) return []

  const timestamps = memories.map((m) => m.timestamp.getTime())
  const minTs = Math.min(...timestamps)
  const maxTs = Math.max(...timestamps)
  const tsRange = maxTs - minTs

  const scored: RankedMemory[] = memories.map((memory) => {
    const similarity = cosineSimilarityFn(queryEmbedding, memory.embedding)
    const recency =
      tsRange === 0
        ? 1
        : (memory.timestamp.getTime() - minTs) / tsRange
    const relevanceScore = similarity * 0.6 + recency * 0.4
    return { ...memory, relevanceScore }
  })

  return scored.sort((a, b) => b.relevanceScore - a.relevanceScore)
}

// ── Prompt Formatting ─────────────────────────────────────────────────────────

const CHARS_PER_TOKEN = 4

/**
 * Format episodic memories for injection into a system prompt.
 * Iterates memories in descending relevance order, appending each block until
 * the token budget is exhausted.  Truncates at the block boundary — no partial
 * blocks are emitted.
 */
export function formatEpisodicForPrompt(
  memories: EpisodicMemory[],
  maxTokens: number,
): string {
  const maxChars = maxTokens * CHARS_PER_TOKEN
  const blocks: string[] = []
  let usedChars = 0

  for (const memory of memories) {
    const valenceLabel = formatValence(memory.emotionalValence)
    const topicsStr =
      memory.topics.length > 0 ? memory.topics.join(', ') : 'none noted'

    const block = [
      `[${memory.timestamp.toISOString().slice(0, 10)}]`,
      `Summary: ${memory.summary}`,
      `Emotional tone: ${valenceLabel} (${memory.emotionalValence.toFixed(2)})`,
      `Topics: ${topicsStr}`,
    ].join('\n')

    const blockChars = block.length + 2 // +2 for the separating newlines
    if (usedChars + blockChars > maxChars) break

    blocks.push(block)
    usedChars += blockChars
  }

  return blocks.join('\n\n')
}

function formatValence(v: number): string {
  if (v >= 0.6) return 'very positive'
  if (v >= 0.2) return 'positive'
  if (v >= -0.2) return 'neutral'
  if (v >= -0.6) return 'negative'
  return 'very negative'
}

// ── Consolidation Triage ──────────────────────────────────────────────────────

/**
 * Decide the consolidation action for a single episodic memory based on age:
 *   < 14 days  → keep   (retain at full detail)
 *   14–90 days → summarise
 *   > 90 days  → abstract
 */
export function shouldConsolidate(
  memory: EpisodicMemory,
): 'keep' | 'summarise' | 'abstract' {
  const ageMs = Date.now() - memory.timestamp.getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)

  if (ageDays < 14) return 'keep'
  if (ageDays <= 90) return 'summarise'
  return 'abstract'
}
