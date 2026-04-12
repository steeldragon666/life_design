/**
 * @module memory/retrieval
 *
 * Unified Memory Retrieval — orchestrates all four memory layers and formats
 * each into a prompt block respecting the caller-supplied token budgets.
 *
 * Pure function. No I/O. Data in, results out.
 */

import type { EpisodicMemory, SemanticMemory, RelationalMemory, TherapeuticMemory } from '../types'
import { formatSemanticForPrompt } from './semantic'
import { formatRelationalForPrompt } from './relational'
import { formatTherapeuticForPrompt } from './therapeutic'
import { rankEpisodicMemories, formatEpisodicForPrompt } from './episodic'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RetrievedContext {
  semanticBlock: string
  relationalBlock: string
  therapeuticBlock: string
  /** Most recent N episodes formatted to fit the recent-episode budget. */
  episodicRecentBlock: string
  /** Highest-relevance episodes formatted to fit the relevant-episode budget. */
  episodicRelevantBlock: string
  /** Rough total token estimate across all blocks (~4 chars per token). */
  totalTokenEstimate: number
}

export interface RetrieveAllMemoryLayersParams {
  semantic: SemanticMemory
  relational: RelationalMemory
  therapeutic: TherapeuticMemory
  episodicMemories: EpisodicMemory[]
  queryEmbedding: number[]
  cosineSimilarityFn: (a: number[], b: number[]) => number
  tokenBudgets: {
    semantic: number
    relational: number
    therapeutic: number
    episodicRecent: number
    episodicRelevant: number
  }
}

const CHARS_PER_TOKEN = 4

// ── Retrieval Orchestrator ────────────────────────────────────────────────────

/**
 * Retrieve and format all four memory layers within the supplied token budgets.
 *
 * For episodic memories the function produces two separate blocks:
 *   - `episodicRecentBlock`:   chronologically latest memories
 *   - `episodicRelevantBlock`: highest-relevance memories (by embedding similarity)
 *
 * Both blocks exclude any memory already included in the other to avoid
 * duplication in the system prompt.
 */
export function retrieveAllMemoryLayers(
  params: RetrieveAllMemoryLayersParams,
): RetrievedContext {
  const {
    semantic,
    relational,
    therapeutic,
    episodicMemories,
    queryEmbedding,
    cosineSimilarityFn,
    tokenBudgets,
  } = params

  // ── Static layers ────────────────────────────────────────────────────────────
  const semanticBlock = truncateToTokenBudget(
    formatSemanticForPrompt(semantic),
    tokenBudgets.semantic,
  )

  const relationalBlock = truncateToTokenBudget(
    formatRelationalForPrompt(relational),
    tokenBudgets.relational,
  )

  const therapeuticBlock = truncateToTokenBudget(
    formatTherapeuticForPrompt(therapeutic),
    tokenBudgets.therapeutic,
  )

  // ── Episodic: recent ─────────────────────────────────────────────────────────
  // Sort chronologically descending (most recent first) for the "recent" block.
  const sortedByRecency = [...episodicMemories].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
  )
  const episodicRecentBlock = formatEpisodicForPrompt(
    sortedByRecency,
    tokenBudgets.episodicRecent,
  )

  // Collect IDs already used in the recent block so we can exclude them.
  const recentIds = new Set(extractIncludedIds(episodicRecentBlock, sortedByRecency))

  // ── Episodic: relevant ───────────────────────────────────────────────────────
  const ranked = rankEpisodicMemories(
    episodicMemories,
    queryEmbedding,
    cosineSimilarityFn,
  )
  const rankedExcludingRecent = ranked.filter((m) => !recentIds.has(m.id))
  const episodicRelevantBlock = formatEpisodicForPrompt(
    rankedExcludingRecent,
    tokenBudgets.episodicRelevant,
  )

  // ── Token estimate ────────────────────────────────────────────────────────────
  const totalChars =
    semanticBlock.length +
    relationalBlock.length +
    therapeuticBlock.length +
    episodicRecentBlock.length +
    episodicRelevantBlock.length

  const totalTokenEstimate = Math.ceil(totalChars / CHARS_PER_TOKEN)

  return {
    semanticBlock,
    relationalBlock,
    therapeuticBlock,
    episodicRecentBlock,
    episodicRelevantBlock,
    totalTokenEstimate,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Truncate a formatted string to fit within a token budget.
 * Truncation happens on a line boundary to avoid cutting mid-sentence.
 */
function truncateToTokenBudget(text: string, maxTokens: number): string {
  const maxChars = maxTokens * CHARS_PER_TOKEN
  if (text.length <= maxChars) return text

  let truncated = text.slice(0, maxChars)
  const lastNewline = truncated.lastIndexOf('\n')
  if (lastNewline > 0) {
    truncated = truncated.slice(0, lastNewline)
  }
  return truncated
}

/**
 * Determine which memories were successfully included in a formatted block by
 * matching their timestamps (ISO date prefix) against the block text.
 *
 * This is a best-effort heuristic: `formatEpisodicForPrompt` stops appending
 * when the budget is exhausted, so we check which memories' dates appear in the
 * block to infer inclusion.
 */
function extractIncludedIds(
  block: string,
  memoriesInOrder: EpisodicMemory[],
): string[] {
  const ids: string[] = []
  let charsUsed = 0
  const maxChars = block.length

  for (const memory of memoriesInOrder) {
    const datePrefix = memory.timestamp.toISOString().slice(0, 10)
    if (!block.includes(`[${datePrefix}]`)) break
    ids.push(memory.id)
    charsUsed += memory.summary.length // rough guard
    if (charsUsed > maxChars) break
  }

  return ids
}
