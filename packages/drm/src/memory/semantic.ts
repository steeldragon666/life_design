/**
 * @module memory/semantic
 *
 * Layer 2: Semantic Memory — who you are.
 * Pure functions only. No I/O. Data in, results out.
 */

import type {
  SemanticMemory,
  LifeContext,
  PsychologicalProfile,
  TherapeuticPreferences,
} from '../types'

// ── Factory ───────────────────────────────────────────────────────────────────

const defaultLifeContext = (): LifeContext => ({
  relationships: [],
  work: null,
  healthConditions: [],
  medications: [],
  goals: [],
  values: [],
  interests: [],
  culturalBackground: null,
  spiritualOrientation: null,
})

const defaultPsychologicalProfile = (): PsychologicalProfile => ({
  attachmentStyle: null,
  commonDistortions: [],
  copingStrengths: [],
  copingGaps: [],
  personalityTraits: {},
  gritScore: null,
  selfCompassionLevel: null,
  locusOfControl: null,
})

const defaultTherapeuticPreferences = (): TherapeuticPreferences => ({
  preferredModalities: [],
  communicationStyle: null,
  depthPreference: 'medium',
  metaphorPreference: 'mixed',
  pacingPreference: 'mixed',
  culturalContext: null,
})

/** Create an empty semantic memory profile for a new user. */
export function createDefaultSemanticMemory(userId: string): SemanticMemory {
  return {
    userId,
    lifeContext: defaultLifeContext(),
    psychologicalProfile: defaultPsychologicalProfile(),
    therapeuticPreferences: defaultTherapeuticPreferences(),
    lastUpdated: new Date(),
  }
}

// ── Merging ───────────────────────────────────────────────────────────────────

/**
 * Deep-merge a partial update onto the current semantic memory.
 * Nested objects are merged shallowly one level down; arrays in the patch
 * replace (not extend) the corresponding arrays in `current`.
 * `lastUpdated` is always set to the current timestamp.
 */
export function mergeSemanticUpdate(
  current: SemanticMemory,
  patch: Partial<SemanticMemory>,
): SemanticMemory {
  return {
    userId: current.userId,
    lifeContext: patch.lifeContext
      ? { ...current.lifeContext, ...patch.lifeContext }
      : current.lifeContext,
    psychologicalProfile: patch.psychologicalProfile
      ? {
          ...current.psychologicalProfile,
          ...patch.psychologicalProfile,
          personalityTraits: patch.psychologicalProfile.personalityTraits
            ? {
                ...current.psychologicalProfile.personalityTraits,
                ...patch.psychologicalProfile.personalityTraits,
              }
            : current.psychologicalProfile.personalityTraits,
        }
      : current.psychologicalProfile,
    therapeuticPreferences: patch.therapeuticPreferences
      ? {
          ...current.therapeuticPreferences,
          ...patch.therapeuticPreferences,
        }
      : current.therapeuticPreferences,
    lastUpdated: new Date(),
  }
}

// ── Prompt Formatting ─────────────────────────────────────────────────────────

/**
 * Render the full semantic profile as human-readable sections for system
 * prompt injection.  No raw JSON — formatted prose and bullet lists.
 */
export function formatSemanticForPrompt(memory: SemanticMemory): string {
  const sections: string[] = []

  // ── Life Context ────────────────────────────────────────────────────────────
  const lc = memory.lifeContext
  const lifeLines: string[] = ['## Life Context']

  if (lc.work) lifeLines.push(`Work/Study: ${lc.work}`)
  if (lc.relationships.length > 0)
    lifeLines.push(`Relationships: ${lc.relationships.join(', ')}`)
  if (lc.healthConditions.length > 0)
    lifeLines.push(`Health conditions: ${lc.healthConditions.join(', ')}`)
  if (lc.medications.length > 0)
    lifeLines.push(`Medications: ${lc.medications.join(', ')}`)
  if (lc.goals.length > 0)
    lifeLines.push(`Goals: ${lc.goals.join('; ')}`)
  if (lc.values.length > 0)
    lifeLines.push(`Values: ${lc.values.join(', ')}`)
  if (lc.interests.length > 0)
    lifeLines.push(`Interests: ${lc.interests.join(', ')}`)
  if (lc.culturalBackground)
    lifeLines.push(`Cultural background: ${lc.culturalBackground}`)
  if (lc.spiritualOrientation)
    lifeLines.push(`Spiritual orientation: ${lc.spiritualOrientation}`)

  sections.push(lifeLines.join('\n'))

  // ── Psychological Profile ───────────────────────────────────────────────────
  const pp = memory.psychologicalProfile
  const psychLines: string[] = ['## Psychological Profile']

  if (pp.attachmentStyle)
    psychLines.push(`Attachment style: ${pp.attachmentStyle}`)
  if (pp.selfCompassionLevel)
    psychLines.push(`Self-compassion level: ${pp.selfCompassionLevel}`)
  if (pp.locusOfControl)
    psychLines.push(`Locus of control: ${pp.locusOfControl}`)
  if (pp.gritScore !== null)
    psychLines.push(`Grit score: ${pp.gritScore.toFixed(1)}`)
  if (pp.copingStrengths.length > 0)
    psychLines.push(`Coping strengths: ${pp.copingStrengths.join(', ')}`)
  if (pp.copingGaps.length > 0)
    psychLines.push(`Coping gaps: ${pp.copingGaps.join(', ')}`)
  if (pp.commonDistortions.length > 0)
    psychLines.push(`Common cognitive distortions: ${pp.commonDistortions.join(', ')}`)

  const traitEntries = Object.entries(pp.personalityTraits)
  if (traitEntries.length > 0) {
    const traitsStr = traitEntries
      .map(([trait, score]) => `${trait}: ${(score as number).toFixed(1)}`)
      .join(', ')
    psychLines.push(`Personality traits (Big Five): ${traitsStr}`)
  }

  sections.push(psychLines.join('\n'))

  // ── Therapeutic Preferences ─────────────────────────────────────────────────
  const tp = memory.therapeuticPreferences
  const prefLines: string[] = ['## Therapeutic Preferences']

  if (tp.preferredModalities.length > 0)
    prefLines.push(`Preferred modalities: ${tp.preferredModalities.join(', ')}`)
  if (tp.communicationStyle)
    prefLines.push(`Communication style: ${tp.communicationStyle}`)
  prefLines.push(`Depth preference: ${tp.depthPreference}`)
  prefLines.push(`Metaphor preference: ${tp.metaphorPreference.replace(/_/g, ' ')}`)
  prefLines.push(`Pacing preference: ${tp.pacingPreference.replace(/_/g, ' ')}`)
  if (tp.culturalContext)
    prefLines.push(`Cultural context: ${tp.culturalContext}`)

  sections.push(prefLines.join('\n'))

  return sections.join('\n\n')
}

// ── Extraction Prompt ─────────────────────────────────────────────────────────

/**
 * Generate the prompt sent to Claude to extract semantic profile updates from a
 * conversation transcript.  Returns the prompt string only — the caller is
 * responsible for making the actual API call.
 */
export function extractSemanticUpdatePrompt(
  conversationTranscript: string,
  currentProfile: SemanticMemory,
): string {
  const currentProfileJson = JSON.stringify(
    {
      lifeContext: currentProfile.lifeContext,
      psychologicalProfile: currentProfile.psychologicalProfile,
      therapeuticPreferences: currentProfile.therapeuticPreferences,
    },
    null,
    2,
  )

  return `You are a clinical data extraction system. Analyse the conversation transcript below and identify any new or updated information about the user that should be reflected in their profile.

Current profile:
\`\`\`json
${currentProfileJson}
\`\`\`

Conversation transcript:
\`\`\`
${conversationTranscript}
\`\`\`

Instructions:
- Extract ONLY information that is clearly stated or strongly implied by the user.
- Do NOT infer or assume. Do NOT hallucinate details not present in the transcript.
- Return a JSON object with the same structure as the current profile, containing ONLY the fields that have changed or been added. Omit unchanged fields.
- For array fields, return the COMPLETE updated array (not a delta).
- For string/null fields, return the new value or null to clear.
- If nothing has changed, return an empty object: {}

Respond with valid JSON only. No explanation, no markdown fences.`
}
