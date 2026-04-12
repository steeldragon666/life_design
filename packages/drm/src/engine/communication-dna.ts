/**
 * @module engine/communication-dna
 *
 * Manages the adaptive communication style that shapes how the companion
 * speaks to each user. The DNA evolves over sessions based on observed
 * engagement — directness, humour, challenge tolerance, and metaphor use
 * are all tuned to the individual.
 */

import type { CommunicationDNA } from '../types.js';
import { EmotionalRegister } from '../types.js';

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * Feedback signal collected from a session, used to nudge the DNA.
 * All fields are optional — record only what was observed.
 */
export interface CommunicationFeedback {
  /** Emotional registers the user responded well to this session. */
  respondedWellTo?: EmotionalRegister[];
  /** Specific things the user disliked or withdrew from (free-text tags). */
  disliked?: string[];
  /** User engaged more when responses were direct and to-the-point. */
  prefersDirect?: boolean;
  /** User lit up when metaphors or analogies were used. */
  prefersMetaphors?: boolean;
  /** User responded positively to light humour. */
  engagedWithHumour?: boolean;
  /** User responded positively to gentle challenge / Socratic questioning. */
  engagedWithChallenge?: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

/** Step size for numeric dimension adjustments. */
const ADJUSTMENT_STEP = 0.1;

/** Clamp a number to [0, 1]. */
function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Returns a warm, moderate default CommunicationDNA suitable for a first session
 * with an unknown user. All dimensions sit in the middle of their range so the
 * companion does not come across as either flat or overwhelming.
 */
export function createDefaultCommunicationDNA(): CommunicationDNA {
  return {
    emotionalRegister: EmotionalRegister.Warm,
    metaphorUsage: 'moderate',
    directnessLevel: 0.5,
    humourLevel: 0.3,
    challengeLevel: 0.3,
    pacing: 'moderate',
    languageComplexity: 'moderate',
  };
}

// ── Adaptation ───────────────────────────────────────────────────────────────

/**
 * Produces an updated CommunicationDNA by applying observed session feedback.
 * Each call represents one session's worth of signal — small, cumulative nudges.
 * Returns a new object; the original is not mutated.
 */
export function adaptCommunicationDNA(
  current: CommunicationDNA,
  feedback: CommunicationFeedback,
): CommunicationDNA {
  let directnessLevel = current.directnessLevel;
  let humourLevel = current.humourLevel;
  let challengeLevel = current.challengeLevel;
  let metaphorUsage = current.metaphorUsage;
  let emotionalRegister = current.emotionalRegister;
  let pacing = current.pacing;
  let languageComplexity = current.languageComplexity;

  // Positive directness signal
  if (feedback.prefersDirect === true) {
    directnessLevel = clamp(directnessLevel + ADJUSTMENT_STEP);
  }

  // Negative directness signal — user found something too blunt
  if (feedback.disliked?.includes('too_direct') === true) {
    directnessLevel = clamp(directnessLevel - ADJUSTMENT_STEP);
  }

  // Metaphor engagement
  if (feedback.prefersMetaphors === true) {
    metaphorUsage = nudgeMetaphorUp(metaphorUsage);
  }
  if (feedback.disliked?.includes('too_abstract') === true) {
    metaphorUsage = nudgeMetaphorDown(metaphorUsage);
  }

  // Humour engagement
  if (feedback.engagedWithHumour === true) {
    humourLevel = clamp(humourLevel + ADJUSTMENT_STEP);
  }
  if (feedback.disliked?.includes('humour') === true) {
    humourLevel = clamp(humourLevel - ADJUSTMENT_STEP);
  }

  // Challenge / Socratic engagement
  if (feedback.engagedWithChallenge === true) {
    challengeLevel = clamp(challengeLevel + ADJUSTMENT_STEP);
  }
  if (feedback.disliked?.includes('too_challenging') === true) {
    challengeLevel = clamp(challengeLevel - ADJUSTMENT_STEP);
  }

  // Emotional register: if multiple positive registers observed, take the most
  // frequent; if only one, adopt it; if none, keep current.
  if (feedback.respondedWellTo !== undefined && feedback.respondedWellTo.length > 0) {
    emotionalRegister = dominantRegister(feedback.respondedWellTo, emotionalRegister);
  }
  if (feedback.disliked?.includes('too_challenging_tone') === true) {
    // Soften from Challenging toward Warm if user pushed back on tone
    if (emotionalRegister === EmotionalRegister.Challenging) {
      emotionalRegister = EmotionalRegister.Direct;
    } else if (emotionalRegister === EmotionalRegister.Direct) {
      emotionalRegister = EmotionalRegister.Warm;
    }
  }

  // Pacing adjustments
  if (feedback.disliked?.includes('too_long') === true) {
    pacing = nudgePacingDown(pacing);
  }
  if (feedback.disliked?.includes('too_brief') === true) {
    pacing = nudgePacingUp(pacing);
  }

  // Language complexity adjustments
  if (feedback.disliked?.includes('too_complex') === true) {
    languageComplexity = nudgeComplexityDown(languageComplexity);
  }
  if (feedback.disliked?.includes('too_simple') === true) {
    languageComplexity = nudgeComplexityUp(languageComplexity);
  }

  return {
    emotionalRegister,
    metaphorUsage,
    directnessLevel,
    humourLevel,
    challengeLevel,
    pacing,
    languageComplexity,
  };
}

// ── Formatting ───────────────────────────────────────────────────────────────

/**
 * Converts the CommunicationDNA into a plain-English block suitable for
 * injection into the system prompt. Keeps it concrete and directive.
 */
export function formatCommunicationDNA(dna: CommunicationDNA): string {
  const lines: string[] = ['Communication style guidelines for this person:'];

  // Tone / register
  lines.push(`- Tone: Be ${describeRegister(dna.emotionalRegister)}.`);

  // Directness
  if (dna.directnessLevel >= 0.7) {
    lines.push('- Be direct and concise. Get to the point without excessive softening.');
  } else if (dna.directnessLevel <= 0.3) {
    lines.push('- Be gentle and exploratory. Arrive at points gradually; don\'t rush to conclusions.');
  } else {
    lines.push('- Balance warmth with clarity — neither blunt nor evasive.');
  }

  // Humour
  if (dna.humourLevel >= 0.6) {
    lines.push('- Humour is welcome. Light wit and playfulness land well with this person.');
  } else if (dna.humourLevel <= 0.2) {
    lines.push('- Keep humour minimal. This person prefers a serious, grounded tone.');
  } else {
    lines.push('- Use humour sparingly and gently — a light touch when it fits naturally.');
  }

  // Challenge
  if (dna.challengeLevel >= 0.6) {
    lines.push('- This person responds well to challenge. You can use Socratic questioning and gentle confrontation.');
  } else if (dna.challengeLevel <= 0.2) {
    lines.push('- Prioritise validation over challenge. Hold space before offering alternative perspectives.');
  } else {
    lines.push('- Challenge gently when appropriate, but lead with validation.');
  }

  // Pacing
  lines.push(`- Pacing: Keep responses ${describePacing(dna.pacing)}.`);

  // Metaphors
  lines.push(`- Metaphor usage: ${describeMetaphor(dna.metaphorUsage)}.`);

  // Language complexity
  lines.push(`- Language: Use ${dna.languageComplexity} vocabulary and sentence complexity.`);

  return lines.join('\n');
}

// ── Private Helpers ──────────────────────────────────────────────────────────

function describeRegister(register: EmotionalRegister): string {
  switch (register) {
    case EmotionalRegister.Warm:        return 'warm and caring';
    case EmotionalRegister.Gentle:      return 'gentle and tender';
    case EmotionalRegister.Direct:      return 'clear and direct';
    case EmotionalRegister.Challenging: return 'warmly challenging';
    case EmotionalRegister.Playful:     return 'light and playful';
    case EmotionalRegister.Grounding:   return 'calm and grounding';
  }
}

function describePacing(pacing: CommunicationDNA['pacing']): string {
  switch (pacing) {
    case 'brief':     return 'focused and brief — avoid over-explaining';
    case 'moderate':  return 'moderate — thorough but not verbose';
    case 'expansive': return 'expansive — this person appreciates depth and space to explore';
  }
}

function describeMetaphor(usage: CommunicationDNA['metaphorUsage']): string {
  switch (usage) {
    case 'high':     return 'Use rich analogies and metaphors freely — they resonate well';
    case 'moderate': return 'Use metaphors occasionally when they genuinely illuminate';
    case 'low':      return 'Keep language literal; metaphors and analogies distract this person';
  }
}

function nudgeMetaphorUp(current: CommunicationDNA['metaphorUsage']): CommunicationDNA['metaphorUsage'] {
  if (current === 'low') return 'moderate';
  if (current === 'moderate') return 'high';
  return 'high';
}

function nudgeMetaphorDown(current: CommunicationDNA['metaphorUsage']): CommunicationDNA['metaphorUsage'] {
  if (current === 'high') return 'moderate';
  if (current === 'moderate') return 'low';
  return 'low';
}

function nudgePacingUp(current: CommunicationDNA['pacing']): CommunicationDNA['pacing'] {
  if (current === 'brief') return 'moderate';
  if (current === 'moderate') return 'expansive';
  return 'expansive';
}

function nudgePacingDown(current: CommunicationDNA['pacing']): CommunicationDNA['pacing'] {
  if (current === 'expansive') return 'moderate';
  if (current === 'moderate') return 'brief';
  return 'brief';
}

function nudgeComplexityUp(
  current: CommunicationDNA['languageComplexity'],
): CommunicationDNA['languageComplexity'] {
  if (current === 'simple') return 'moderate';
  if (current === 'moderate') return 'sophisticated';
  return 'sophisticated';
}

function nudgeComplexityDown(
  current: CommunicationDNA['languageComplexity'],
): CommunicationDNA['languageComplexity'] {
  if (current === 'sophisticated') return 'moderate';
  if (current === 'moderate') return 'simple';
  return 'simple';
}

/**
 * Given a list of observed registers, returns the most frequently occurring
 * one, falling back to `fallback` on a tie or empty input.
 */
function dominantRegister(
  observed: EmotionalRegister[],
  fallback: EmotionalRegister,
): EmotionalRegister {
  const counts = new Map<EmotionalRegister, number>();
  for (const r of observed) {
    counts.set(r, (counts.get(r) ?? 0) + 1);
  }
  let best: EmotionalRegister = fallback;
  let bestCount = 0;
  for (const [register, count] of counts) {
    if (count > bestCount) {
      best = register;
      bestCount = count;
    }
  }
  return best;
}
