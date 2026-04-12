/**
 * @module therapeutic/intervention-tracker
 *
 * Tracks intervention outcomes over time, enabling the adaptive engine to
 * learn which techniques work best for each individual user and issue.
 */

import { InterventionResponse } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InterventionTrackingResult {
  technique: string;
  issue: string;
  userResponse: InterventionResponse;
  estimatedEffectiveness: number;  // 0.0 to 1.0
}

/**
 * The raw shape Claude is asked to return. Parsed before being returned as
 * an InterventionTrackingResult so that the consumer never sees unvalidated data.
 */
interface RawTrackingEntry {
  technique: string;
  issue: string;
  userResponse: string;
  effectiveness: number;
}

// ── Prompt ────────────────────────────────────────────────────────────────────

/**
 * System-level prompt used to ask Claude to analyse a completed conversation
 * and extract intervention-outcome data. Inject the conversation transcript
 * before sending this to the model.
 *
 * Expected response: a JSON array only — no prose, no markdown fences.
 */
export const OUTCOME_TRACKING_PROMPT = `You are a clinical data extraction assistant working alongside a therapeutic AI. Your task is to analyse the conversation transcript below and identify every therapeutic technique that was introduced or attempted.

For each technique, return a JSON array of objects with EXACTLY these fields:
- "technique": the name or short identifier of the technique used (e.g., "Thought Record", "5-4-3-2-1 Grounding")
- "issue": the core psychological issue or concern the technique was applied to (e.g., "work anxiety", "self-criticism", "sleep problems")
- "userResponse": one of exactly four values — "engaged", "neutral", "resistant", or "breakthrough"
  - "engaged": user participated willingly and showed understanding
  - "neutral": user complied but showed little emotional response
  - "resistant": user pushed back, avoided, or deflected the technique
  - "breakthrough": user had a notable insight, shift in perspective, or emotional release
- "effectiveness": a number between 0.0 and 1.0 representing how effective the technique appeared to be
  - 0.0–0.2: no discernible benefit or made things worse
  - 0.3–0.5: minimal or uncertain benefit
  - 0.6–0.7: moderate benefit, user seemed somewhat helped
  - 0.8–0.9: clear benefit, user engaged well and the session progressed positively
  - 1.0: exceptional — clear breakthrough moment

Return ONLY the JSON array. No preamble, no explanation, no markdown code fences. If no therapeutic techniques were used in the conversation, return an empty array: []

Example output format:
[
  {"technique": "Thought Record", "issue": "work anxiety", "userResponse": "engaged", "effectiveness": 0.75},
  {"technique": "Breath Awareness", "issue": "acute distress", "userResponse": "neutral", "effectiveness": 0.45}
]`;

// ── Response Map ──────────────────────────────────────────────────────────────

const RESPONSE_MAP: Readonly<Record<string, InterventionResponse>> = {
  engaged: InterventionResponse.Engaged,
  neutral: InterventionResponse.Neutral,
  resistant: InterventionResponse.Resistant,
  breakthrough: InterventionResponse.Breakthrough,
};

// ── Parser ────────────────────────────────────────────────────────────────────

/**
 * Parse and validate Claude's JSON response from OUTCOME_TRACKING_PROMPT.
 *
 * Invalid entries are silently dropped so that one malformed record does not
 * discard an otherwise valid batch. Returns an empty array on total failure.
 */
export function parseOutcomeTrackingResponse(response: string): InterventionTrackingResult[] {
  const trimmed = response.trim();

  let parsed: unknown;
  try {
    // Strip accidental markdown fences if the model includes them despite instructions
    const cleaned = trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  const results: InterventionTrackingResult[] = [];

  for (const entry of parsed) {
    if (
      entry === null ||
      typeof entry !== 'object' ||
      typeof (entry as RawTrackingEntry).technique !== 'string' ||
      typeof (entry as RawTrackingEntry).issue !== 'string' ||
      typeof (entry as RawTrackingEntry).userResponse !== 'string' ||
      typeof (entry as RawTrackingEntry).effectiveness !== 'number'
    ) {
      continue;
    }

    const raw = entry as RawTrackingEntry;
    const responseKey = raw.userResponse.toLowerCase().trim();
    const userResponse = RESPONSE_MAP[responseKey];

    if (userResponse === undefined) {
      continue;
    }

    const effectiveness = Math.min(1, Math.max(0, raw.effectiveness));

    results.push({
      technique: raw.technique.trim(),
      issue: raw.issue.trim(),
      userResponse,
      estimatedEffectiveness: effectiveness,
    });
  }

  return results;
}

// ── Running Effectiveness ─────────────────────────────────────────────────────

/**
 * Update a running effectiveness score using a weighted moving average.
 *
 * The formula weights historical data proportionally to how many samples have
 * been collected, allowing the score to stabilise as evidence accumulates:
 *
 *   updatedScore = (previous * sampleCount + newRating) / (sampleCount + 1)
 *
 * @param previous     - Current running average (0.0 to 1.0).
 * @param newRating    - Latest effectiveness observation (0.0 to 1.0).
 * @param sampleCount  - Number of samples that contributed to `previous`.
 * @returns            - Updated effectiveness score (0.0 to 1.0).
 */
export function computeRunningEffectiveness(
  previous: number,
  newRating: number,
  sampleCount: number,
): number {
  if (sampleCount < 0) {
    throw new RangeError('sampleCount must be a non-negative integer');
  }
  const clampedPrevious = Math.min(1, Math.max(0, previous));
  const clampedNew = Math.min(1, Math.max(0, newRating));
  return (clampedPrevious * sampleCount + clampedNew) / (sampleCount + 1);
}
