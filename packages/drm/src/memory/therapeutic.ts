/**
 * @module memory/therapeutic
 *
 * Layer 4: Therapeutic Memory — what works for you.
 * Pure functions only. No I/O. Data in, results out.
 */

import { InterventionResponse } from '../types'
import type {
  TherapeuticMemory,
  IssueInterventionRecord,
  InterventionOutcome,
  TimingIntelligence,
  ResistancePattern,
  TherapeuticModality,
} from '../types'

// ── Factory ───────────────────────────────────────────────────────────────────

const defaultTimingIntelligence = (): TimingIntelligence => ({
  pushTopics: [],
  holdSpaceTopics: [],
  dayPatterns: {},
  bestInterventionTiming: null,
})

/** Create an empty therapeutic memory for a new user. */
export function createDefaultTherapeuticMemory(userId: string): TherapeuticMemory {
  return {
    userId,
    issueInterventionMap: [],
    timingIntelligence: defaultTimingIntelligence(),
    resistancePatterns: [],
    lastUpdated: new Date(),
  }
}

// ── Intervention Recording ────────────────────────────────────────────────────

/**
 * Upsert an intervention outcome.
 *
 * If an existing record for the same issue + modality + technique is found,
 * its effectiveness is updated as a running average and `sessionsExposed` is
 * incremented.  Otherwise a new record is created.
 *
 * Issue records are keyed by `issueName`; a stable `issueId` is derived by
 * slugifying the name when creating a new issue record.
 */
export function recordInterventionOutcome(
  memory: TherapeuticMemory,
  params: {
    issueName: string
    modality: TherapeuticModality
    technique: string
    effectiveness: number
    userResponse: InterventionResponse
  },
): TherapeuticMemory {
  const now = new Date()
  const issueId = slugify(params.issueName)

  const existingIssueIndex = memory.issueInterventionMap.findIndex(
    (r) => r.issueId === issueId,
  )

  let issueInterventionMap: IssueInterventionRecord[]

  if (existingIssueIndex === -1) {
    // New issue — create record with one intervention
    const newIntervention: InterventionOutcome = {
      modality: params.modality,
      technique: params.technique,
      effectiveness: params.effectiveness,
      sessionsExposed: 1,
      lastUsed: now,
      userResponse: params.userResponse,
      notes: null,
    }
    const newRecord: IssueInterventionRecord = {
      issueId,
      issueName: params.issueName,
      interventions: [newIntervention],
    }
    issueInterventionMap = [...memory.issueInterventionMap, newRecord]
  } else {
    const issueRecord = memory.issueInterventionMap[existingIssueIndex]!
    const existingIdx = issueRecord.interventions.findIndex(
      (i) => i.modality === params.modality && i.technique === params.technique,
    )

    let updatedInterventions: InterventionOutcome[]

    if (existingIdx === -1) {
      // New technique under existing issue
      const newIntervention: InterventionOutcome = {
        modality: params.modality,
        technique: params.technique,
        effectiveness: params.effectiveness,
        sessionsExposed: 1,
        lastUsed: now,
        userResponse: params.userResponse,
        notes: null,
      }
      updatedInterventions = [...issueRecord.interventions, newIntervention]
    } else {
      // Update running average
      const existing = issueRecord.interventions[existingIdx]!
      const newSessions = existing.sessionsExposed + 1
      const newEffectiveness =
        (existing.effectiveness * existing.sessionsExposed + params.effectiveness) /
        newSessions

      const updated: InterventionOutcome = {
        ...existing,
        effectiveness: newEffectiveness,
        sessionsExposed: newSessions,
        lastUsed: now,
        userResponse: params.userResponse,
      }
      updatedInterventions = issueRecord.interventions.map((iv, idx) =>
        idx === existingIdx ? updated : iv,
      )
    }

    const updatedRecord: IssueInterventionRecord = {
      ...issueRecord,
      interventions: updatedInterventions,
    }
    issueInterventionMap = memory.issueInterventionMap.map((r, idx) =>
      idx === existingIssueIndex ? updatedRecord : r,
    )
  }

  return { ...memory, issueInterventionMap, lastUpdated: now }
}

// ── Effective Interventions ───────────────────────────────────────────────────

/**
 * Return all interventions recorded for a given issue name, sorted by
 * effectiveness descending.  Returns an empty array if the issue is unknown.
 */
export function getEffectiveInterventions(
  memory: TherapeuticMemory,
  issueName: string,
): InterventionOutcome[] {
  const issueId = slugify(issueName)
  const record = memory.issueInterventionMap.find((r) => r.issueId === issueId)
  if (!record) return []
  return [...record.interventions].sort((a, b) => b.effectiveness - a.effectiveness)
}

// ── Timing Intelligence ───────────────────────────────────────────────────────

/** Shallow-merge a partial update onto the timing intelligence block. */
export function updateTimingIntelligence(
  memory: TherapeuticMemory,
  update: Partial<TimingIntelligence>,
): TherapeuticMemory {
  return {
    ...memory,
    timingIntelligence: {
      ...memory.timingIntelligence,
      ...update,
      dayPatterns: update.dayPatterns
        ? { ...memory.timingIntelligence.dayPatterns, ...update.dayPatterns }
        : memory.timingIntelligence.dayPatterns,
    },
    lastUpdated: new Date(),
  }
}

// ── Prompt Formatting ─────────────────────────────────────────────────────────

/**
 * Render the therapeutic memory as human-readable sections for system prompt
 * injection.  Groups interventions by issue; highlights what works (> 0.6)
 * and what does not (< 0.4).  Includes timing intelligence and resistance
 * patterns.
 */
export function formatTherapeuticForPrompt(memory: TherapeuticMemory): string {
  const sections: string[] = ['## What Works For You']

  // ── Issue Intervention Map ──────────────────────────────────────────────────
  if (memory.issueInterventionMap.length === 0) {
    sections.push('No intervention data recorded yet.')
  } else {
    for (const record of memory.issueInterventionMap) {
      const lines: string[] = [`### ${record.issueName}`]
      const effective = record.interventions.filter((i) => i.effectiveness > 0.6)
      const ineffective = record.interventions.filter((i) => i.effectiveness < 0.4)
      const neutral = record.interventions.filter(
        (i) => i.effectiveness >= 0.4 && i.effectiveness <= 0.6,
      )

      if (effective.length > 0) {
        lines.push('What works well:')
        for (const iv of effective) {
          lines.push(
            `  - ${iv.technique} (${iv.modality}, effectiveness ${formatPct(iv.effectiveness)}, ${iv.sessionsExposed} session${iv.sessionsExposed !== 1 ? 's' : ''}, response: ${iv.userResponse})`,
          )
        }
      }

      if (neutral.length > 0) {
        lines.push('Mixed results:')
        for (const iv of neutral) {
          lines.push(
            `  - ${iv.technique} (${iv.modality}, effectiveness ${formatPct(iv.effectiveness)})`,
          )
        }
      }

      if (ineffective.length > 0) {
        lines.push('What has not helped:')
        for (const iv of ineffective) {
          lines.push(
            `  - ${iv.technique} (${iv.modality}, effectiveness ${formatPct(iv.effectiveness)}, response: ${iv.userResponse})`,
          )
        }
      }

      sections.push(lines.join('\n'))
    }
  }

  // ── Timing Intelligence ─────────────────────────────────────────────────────
  const ti = memory.timingIntelligence
  const timingLines: string[] = ['## Timing Intelligence']

  if (ti.pushTopics.length > 0)
    timingLines.push(`Receptive to challenge on: ${ti.pushTopics.join(', ')}`)
  if (ti.holdSpaceTopics.length > 0)
    timingLines.push(`Needs to feel heard first on: ${ti.holdSpaceTopics.join(', ')}`)
  if (ti.bestInterventionTiming)
    timingLines.push(`Best intervention timing: ${ti.bestInterventionTiming}`)

  const dayEntries = Object.entries(ti.dayPatterns)
  if (dayEntries.length > 0) {
    timingLines.push('Day patterns:')
    for (const [day, pattern] of dayEntries) {
      timingLines.push(`  ${day}: ${pattern}`)
    }
  }

  if (timingLines.length > 1) sections.push(timingLines.join('\n'))

  // ── Resistance Patterns ─────────────────────────────────────────────────────
  if (memory.resistancePatterns.length > 0) {
    const resistanceLines: string[] = ['## Resistance Patterns']
    for (const rp of memory.resistancePatterns) {
      resistanceLines.push(
        `- Trigger: ${rp.trigger}\n  Response: ${rp.response}\n  Strategy: ${rp.navigationStrategy}`,
      )
    }
    sections.push(resistanceLines.join('\n'))
  }

  return sections.join('\n\n')
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

function formatPct(v: number): string {
  return `${Math.round(v * 100)}%`
}

// Re-export for consumers who need the type but import from this module
export type { ResistancePattern }
// Re-export InterventionResponse so callers can do: import { InterventionResponse } from './therapeutic'
export { InterventionResponse }
