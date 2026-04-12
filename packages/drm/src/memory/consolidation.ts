/**
 * @module memory/consolidation
 *
 * Progressive Summarisation — prompts and utilities for condensing episodic
 * memories over time.  Pure functions only.  No I/O.
 */

import type { EpisodicMemory } from '../types'
import { shouldConsolidate } from './episodic'

// ── Prompt Constants ──────────────────────────────────────────────────────────

/**
 * The system + user prompt sent to Claude to summarise a single episodic
 * memory.  The caller must interpolate `{{FULL_EPISODE}}` with the episode
 * content before sending.
 */
export const CONSOLIDATION_PROMPT = `You are a clinical memory summarisation system. Your task is to compress a therapy session episode into a concise summary that preserves the most therapeutically significant information.

Original episode:
{{FULL_EPISODE}}

Instructions:
- Write a 2–4 sentence summary capturing: (1) the primary emotional theme, (2) any notable insights or breakthroughs, (3) interventions used and how the user responded.
- Preserve exact quotes only if they are clinically significant (e.g., a key belief statement or breakthrough).
- Omit logistical details, small-talk, and repeated content.
- Maintain the emotional valence score as a number between -1.0 and +1.0.
- Return ONLY valid JSON in this shape:
{
  "summary": "<condensed summary>",
  "emotionalValence": <number>,
  "topics": ["<topic1>", "<topic2>"],
  "interventionsUsed": ["<intervention1>"],
  "notableQuotes": ["<quote if significant>"],
  "followUp": "<any follow-up item or null>"
}`

/**
 * The prompt sent to Claude to abstract patterns from multiple summarised
 * episodes into a high-level narrative.  The caller must interpolate
 * `{{SUMMARIES}}` with the batch of summaries (newline-delimited JSON objects
 * or plain text) before sending.
 */
export const PATTERN_EXTRACTION_PROMPT = `You are a clinical pattern recognition system. You will analyse a collection of therapy session summaries and extract the underlying patterns.

Session summaries:
{{SUMMARIES}}

Instructions:
- Identify 2–5 recurring themes or patterns across these sessions.
- Note any trajectory (improving, worsening, cycling).
- Identify key cognitive or behavioural patterns.
- Summarise in 3–6 sentences total.
- Return ONLY valid JSON in this shape:
{
  "abstractSummary": "<3–6 sentence narrative>",
  "recurringThemes": ["<theme1>", "<theme2>"],
  "trajectory": "<improving | stable | worsening | cycling>",
  "keyPatterns": ["<pattern1>"],
  "emotionalValenceAverage": <number between -1.0 and 1.0>
}`

// ── Target Identification ─────────────────────────────────────────────────────

/**
 * Partition a list of episodic memories into those that need summarisation and
 * those that should be abstracted (based on age thresholds from
 * `shouldConsolidate`).  Memories tagged "keep" are excluded from both groups.
 */
export function identifyConsolidationTargets(memories: EpisodicMemory[]): {
  toSummarise: EpisodicMemory[]
  toAbstract: EpisodicMemory[]
} {
  const toSummarise: EpisodicMemory[] = []
  const toAbstract: EpisodicMemory[] = []

  for (const memory of memories) {
    const action = shouldConsolidate(memory)
    if (action === 'summarise') toSummarise.push(memory)
    else if (action === 'abstract') toAbstract.push(memory)
  }

  return { toSummarise, toAbstract }
}

// ── Batch Builder ─────────────────────────────────────────────────────────────

/**
 * Prepare batch API payloads for each memory that needs consolidation.
 * Returns an array of `{ id, prompt }` objects ready to be dispatched to
 * the Claude API by the pipeline layer.
 *
 * For "summarise" targets the `CONSOLIDATION_PROMPT` template is used.
 * The caller should use `PATTERN_EXTRACTION_PROMPT` separately when
 * abstracting groups of already-summarised memories.
 */
export function buildConsolidationBatch(
  targets: EpisodicMemory[],
): Array<{ id: string; prompt: string }> {
  return targets.map((memory) => {
    const episodeText = buildEpisodeText(memory)
    const prompt = CONSOLIDATION_PROMPT.replace('{{FULL_EPISODE}}', episodeText)
    return { id: memory.id, prompt }
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildEpisodeText(memory: EpisodicMemory): string {
  const lines: string[] = [
    `Date: ${memory.timestamp.toISOString().slice(0, 10)}`,
    `Summary: ${memory.summary}`,
    `Emotional valence: ${memory.emotionalValence.toFixed(2)}`,
    `Topics: ${memory.topics.join(', ')}`,
    `Interventions used: ${memory.interventionsUsed.join(', ')}`,
  ]

  if (memory.notableQuotes.length > 0) {
    lines.push(`Notable quotes: ${memory.notableQuotes.map((q) => `"${q}"`).join('; ')}`)
  }

  if (memory.followUp) {
    lines.push(`Follow-up: ${memory.followUp}`)
  }

  if (memory.outcomeRating !== null) {
    lines.push(`Outcome rating: ${memory.outcomeRating.toFixed(2)}`)
  }

  return lines.join('\n')
}
