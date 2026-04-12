/**
 * @module memory/relational
 *
 * Layer 3: Relational Memory — our history together.
 * Pure functions only. No I/O. Data in, results out.
 */

import { DRMPhase } from '../types'
import type { RelationalMemory, RelationalMilestone, InteractionPatterns } from '../types'

// ── Factory ───────────────────────────────────────────────────────────────────

const defaultInteractionPatterns = (): InteractionPatterns => ({
  typicalFrequency: 'unknown',
  typicalDuration: 'unknown',
  preferredTimes: [],
  topicsApproached: [],
  topicsAvoided: [],
  engagementTrend: 'stable',
})

/** Create a fresh relational memory for a new user relationship. */
export function createDefaultRelationalMemory(userId: string): RelationalMemory {
  const now = new Date()
  return {
    userId,
    relationshipStarted: now,
    totalSessions: 0,
    totalMessages: 0,
    trustTrajectory: 'building',
    currentPhase: DRMPhase.Initial,
    interactionPatterns: defaultInteractionPatterns(),
    milestones: [],
    rapportNotes: '',
    lastUpdated: now,
  }
}

// ── Session Metrics ───────────────────────────────────────────────────────────

/**
 * Increment session and message counters and update interaction patterns
 * from fresh session data.  Phase is recalculated automatically.
 */
export function updateRelationalMetrics(
  current: RelationalMemory,
  sessionData: { duration: number; messageCount: number; timestamp: Date },
): RelationalMemory {
  const newTotalSessions = current.totalSessions + 1
  const newTotalMessages = current.totalMessages + sessionData.messageCount

  // Derive a human-readable typical duration label from the session duration
  // (minutes).  We use the running average approximated by the previous label
  // only on the first update; subsequent sessions progressively adjust the
  // label rather than keeping a full history (keeps the type simple).
  const durationMinutes = Math.round(sessionData.duration / 60)
  const durationLabel = formatDurationLabel(durationMinutes)

  const updatedPatterns: InteractionPatterns = {
    ...current.interactionPatterns,
    typicalDuration: durationLabel,
  }

  const updated: RelationalMemory = {
    ...current,
    totalSessions: newTotalSessions,
    totalMessages: newTotalMessages,
    interactionPatterns: updatedPatterns,
    lastUpdated: sessionData.timestamp,
  }

  // Recalculate phase after incrementing the counter
  return { ...updated, currentPhase: determinePhase(updated) }
}

function formatDurationLabel(minutes: number): string {
  if (minutes < 10) return 'under 10 minutes'
  if (minutes < 20) return '10–20 minutes'
  if (minutes < 35) return '20–35 minutes'
  if (minutes < 60) return '35–60 minutes'
  return 'over an hour'
}

// ── Phase Determination ───────────────────────────────────────────────────────

/**
 * Map session count to a DRM phase:
 *   0–6    → Initial
 *   7–18   → Calibration
 *   19–42  → Personalised
 *   43+    → Deepening
 */
export function determinePhase(memory: RelationalMemory): DRMPhase {
  const { totalSessions } = memory
  if (totalSessions <= 6) return DRMPhase.Initial
  if (totalSessions <= 18) return DRMPhase.Calibration
  if (totalSessions <= 42) return DRMPhase.Personalised
  return DRMPhase.Deepening
}

// ── Milestones ────────────────────────────────────────────────────────────────

/**
 * Append a milestone to the relationship record, keeping the list sorted by
 * date ascending.
 */
export function addMilestone(
  memory: RelationalMemory,
  milestone: RelationalMilestone,
): RelationalMemory {
  const milestones = [...memory.milestones, milestone].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  )
  return { ...memory, milestones, lastUpdated: new Date() }
}

// ── Prompt Formatting ─────────────────────────────────────────────────────────

/**
 * Render the relational memory as human-readable context for system prompt
 * injection.  Covers relationship duration, session count, current phase,
 * trust trajectory, interaction patterns, and milestones.
 */
export function formatRelationalForPrompt(memory: RelationalMemory): string {
  const lines: string[] = ['## Our Relationship']

  // Duration
  const durationDays = Math.floor(
    (Date.now() - memory.relationshipStarted.getTime()) / (1000 * 60 * 60 * 24),
  )
  const durationLabel = formatRelationshipAge(durationDays)
  lines.push(`We have been talking for ${durationLabel}.`)
  lines.push(`Total sessions: ${memory.totalSessions}`)
  lines.push(`Total messages exchanged: ${memory.totalMessages}`)

  // Phase
  lines.push(`Current relationship phase: ${formatPhaseLabel(memory.currentPhase)}`)
  lines.push(`Trust trajectory: ${memory.trustTrajectory}`)

  if (memory.rapportNotes) {
    lines.push(`Rapport notes: ${memory.rapportNotes}`)
  }

  // Interaction patterns
  const ip = memory.interactionPatterns
  lines.push('\n### Interaction Patterns')
  lines.push(`Typical frequency: ${ip.typicalFrequency}`)
  lines.push(`Typical session duration: ${ip.typicalDuration}`)
  if (ip.preferredTimes.length > 0)
    lines.push(`Preferred times: ${ip.preferredTimes.join(', ')}`)
  if (ip.topicsApproached.length > 0)
    lines.push(`Topics explored: ${ip.topicsApproached.join(', ')}`)
  if (ip.topicsAvoided.length > 0)
    lines.push(`Topics avoided so far: ${ip.topicsAvoided.join(', ')}`)
  lines.push(`Engagement trend: ${ip.engagementTrend}`)

  // Milestones
  if (memory.milestones.length > 0) {
    lines.push('\n### Key Milestones')
    for (const m of memory.milestones) {
      const dateStr = m.date.toISOString().slice(0, 10)
      lines.push(`- [${dateStr}] (${m.significance}) ${m.event}`)
    }
  }

  return lines.join('\n')
}

function formatRelationshipAge(days: number): string {
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''}`
  if (days < 30) {
    const weeks = Math.floor(days / 7)
    return `${weeks} week${weeks !== 1 ? 's' : ''}`
  }
  if (days < 365) {
    const months = Math.floor(days / 30)
    return `${months} month${months !== 1 ? 's' : ''}`
  }
  const years = (days / 365).toFixed(1)
  return `${years} years`
}

function formatPhaseLabel(phase: DRMPhase): string {
  switch (phase) {
    case DRMPhase.Initial:
      return 'Initial (building rapport and assessment)'
    case DRMPhase.Calibration:
      return 'Calibration (exploring what works for you)'
    case DRMPhase.Personalised:
      return 'Personalised (tailored interventions)'
    case DRMPhase.Deepening:
      return 'Deepening (pattern references and growth arcs)'
  }
}
