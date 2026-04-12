/**
 * @module safety/classifier
 *
 * Tier 1: Real-Time Risk Detection
 *
 * Wraps an optional synchronous regex pre-classification with a Claude-powered
 * semantic classifier for nuanced, context-aware safety assessment.
 *
 * Architecture
 * ─────────────
 * The core @life-design/core package exposes a regex-based crisis detector.
 * Rather than coupling this module to core's internal source tree (which
 * violates rootDir when dependencies are not yet installed), this module
 * accepts an optional pre-computed regex result via `RegexCrisisResult`.
 * The pipeline layer that calls both packages is responsible for running the
 * regex detector first and passing the result here.
 *
 * The sendFn dependency is injected by the caller so this module has no direct
 * SDK dependency — it works with any transport that satisfies SafetySendFn.
 */

import { SafetyTier } from '../types.js';
import type { SafetyClassification } from '../types.js';

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * Dependency-injected transport for the Claude API call.
 * The caller is responsible for authentication and model routing.
 */
export type SafetySendFn = (
  model: string,
  system: string,
  message: string,
  maxTokens: number,
  temperature: number,
) => Promise<{ text: string | null; error: string | null }>;

/**
 * Mirrors the CrisisLevel enum from @life-design/core.
 * Kept local so this module compiles without the core package installed.
 * The values MUST stay in sync with core's CrisisLevel enum.
 */
export const RegexCrisisLevel = {
  None: 'none',
  Low: 'low',
  Medium: 'medium',
  High: 'high',
} as const;

export type RegexCrisisLevel =
  (typeof RegexCrisisLevel)[keyof typeof RegexCrisisLevel];

/**
 * Pre-computed result from the synchronous regex detector.
 * Shape mirrors CrisisDetectionResult from @life-design/core.
 * Pass `null` to skip the regex layer (Claude-only classification).
 */
export interface RegexCrisisResult {
  matched: boolean;
  level: RegexCrisisLevel;
  triggers: string[];
  confidence: number;
}

/**
 * Raw shape expected back from Claude. Validated before use.
 */
interface ClassifierResponse {
  tier: 1 | 2 | 3;
  signal: string | null;
  confidence: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const SAFETY_MODEL = 'claude-sonnet-4-20250514';
const SAFETY_MAX_TOKENS = 150;
const SAFETY_TEMPERATURE = 0;

/**
 * System prompt for the safety classifier.
 *
 * Design constraints:
 * - Respond ONLY with valid JSON — no prose, no markdown fences.
 * - Tier 1 = immediate risk (active ideation, self-harm intent, crisis).
 * - Tier 2 = elevated concern (passive ideation, hopelessness, marked distress).
 * - Tier 3 = no safety concern detected.
 * - When uncertain between tiers, choose the lower (more cautious) number.
 * - signal: a brief verbatim phrase from the message that drove the
 *   classification, or null for Tier 3.
 * - confidence: float 0.0–1.0 reflecting certainty of the classification.
 */
export const SAFETY_CLASSIFIER_PROMPT = `You are a mental-health safety classifier integrated into a therapeutic AI companion. Your sole task is to assess whether a user message contains safety-relevant content and return a structured JSON object.

RESPOND ONLY WITH VALID JSON. No markdown, no explanation, no prose.

JSON shape:
{ "tier": 1 | 2 | 3, "signal": string | null, "confidence": number }

Tier definitions:
- Tier 1 (Immediate risk): Active suicidal ideation, explicit self-harm intent, statements of imminent danger to self or others, sharing a plan or timeline for self-harm.
- Tier 2 (Elevated concern): Passive ideation ("I wish I wasn't here"), profound hopelessness, expressions of being a burden, marked emotional deterioration, dissociation from self.
- Tier 3 (No safety concern): General emotional distress, frustration, sadness, or neutral content with no safety signal.

Rules:
1. When uncertain between Tier 1 and Tier 2, classify as Tier 1.
2. When uncertain between Tier 2 and Tier 3, classify as Tier 2.
3. signal must be a short (≤ 10 words) verbatim excerpt from the message, or null for Tier 3.
4. confidence must be a float between 0.0 and 1.0 (e.g. 0.95).
5. Never refuse to respond — always return valid JSON.

Examples:
Message: "I've been thinking about ending it all tonight."
Response: {"tier":1,"signal":"ending it all tonight","confidence":0.97}

Message: "Sometimes I wonder if everyone would be better off without me."
Response: {"tier":2,"signal":"better off without me","confidence":0.88}

Message: "I had a really rough day at work."
Response: {"tier":3,"signal":null,"confidence":0.92}`;

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Maps the local mirror of CrisisLevel to a SafetyTier.
 */
function regexLevelToTier(level: RegexCrisisLevel): SafetyTier {
  if (level === RegexCrisisLevel.High) return SafetyTier.Tier1_Immediate;
  if (level === RegexCrisisLevel.Medium) return SafetyTier.Tier2_Elevated;
  if (level === RegexCrisisLevel.Low) return SafetyTier.Tier2_Elevated;
  return SafetyTier.Tier3_NoRisk;
}

/**
 * Parse and validate the raw JSON string returned by Claude.
 * Returns null if the response is malformed or fails validation.
 */
function parseClassifierResponse(raw: string): ClassifierResponse | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    return null;
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  const obj = parsed as Record<string, unknown>;

  if (obj['tier'] !== 1 && obj['tier'] !== 2 && obj['tier'] !== 3) {
    return null;
  }

  if (obj['signal'] !== null && typeof obj['signal'] !== 'string') {
    return null;
  }

  if (
    typeof obj['confidence'] !== 'number' ||
    obj['confidence'] < 0 ||
    obj['confidence'] > 1
  ) {
    return null;
  }

  return {
    tier: obj['tier'] as 1 | 2 | 3,
    signal: obj['signal'] as string | null,
    confidence: obj['confidence'] as number,
  };
}

/**
 * Convert a raw tier number (1 | 2 | 3) to the SafetyTier enum value.
 */
function rawTierToEnum(raw: 1 | 2 | 3): SafetyTier {
  if (raw === 1) return SafetyTier.Tier1_Immediate;
  if (raw === 2) return SafetyTier.Tier2_Elevated;
  return SafetyTier.Tier3_NoRisk;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Classify the safety tier of a user message using a two-layer approach.
 *
 * Layer 1 — Synchronous regex (optional, provided by caller):
 *   Fast, deterministic, zero-latency. If provided and fires at High
 *   confidence (>= 0.95), we immediately return Tier 1 without waiting for
 *   Claude — speed matters when someone is in crisis.
 *
 *   The caller should obtain this by running:
 *     import { detectCrisisIndicators } from '@life-design/core';
 *     const regexResult = detectCrisisIndicators(message);
 *
 *   Pass `null` to skip the regex layer (Claude-only classification).
 *
 * Layer 2 — Claude classifier:
 *   Catches nuanced, context-dependent signals the regex layer misses.
 *   Runs for all messages unless the regex already returned Tier 1 with
 *   confidence >= 0.95.
 *
 * Fail-open policy: if Claude's response is malformed or the API call fails,
 * we fall back to the regex result (or Tier 3 if no regex result was given).
 * We never silently downgrade a concern the regex already flagged.
 *
 * Tier merging: we take the more cautious (lower-numbered) tier between the
 * regex result and Claude's classification.
 *
 * @param message     - The raw user message to classify.
 * @param sendFn      - Injected transport for the Claude API call.
 * @param regexResult - Optional pre-computed regex result from core's
 *                      detectCrisisIndicators. Pass null to skip.
 * @returns A SafetyClassification with tier, signal, confidence, and timestamp.
 */
export async function classifySafety(
  message: string,
  sendFn: SafetySendFn,
  regexResult: RegexCrisisResult | null = null,
): Promise<SafetyClassification> {
  const timestamp = new Date();

  // ── Layer 1: Synchronous regex (if provided) ──────────────────────────────
  if (regexResult !== null) {
    const regexTier = regexLevelToTier(regexResult.level);

    // Short-circuit: high-confidence immediate crisis — do not wait for Claude.
    if (
      regexResult.matched &&
      regexResult.level === RegexCrisisLevel.High &&
      regexResult.confidence >= 0.95
    ) {
      return {
        tier: SafetyTier.Tier1_Immediate,
        signal: regexResult.triggers[0] ?? null,
        confidence: regexResult.confidence,
        timestamp,
      };
    }

    // ── Layer 2: Claude classifier ──────────────────────────────────────────
    const response = await sendFn(
      SAFETY_MODEL,
      SAFETY_CLASSIFIER_PROMPT,
      message,
      SAFETY_MAX_TOKENS,
      SAFETY_TEMPERATURE,
    );

    // If Claude errored or returned no text, fall back to the regex result.
    if (response.error !== null || response.text === null) {
      return {
        tier: regexTier,
        signal: regexResult.triggers[0] ?? null,
        confidence: regexResult.confidence,
        timestamp,
      };
    }

    const parsed = parseClassifierResponse(response.text);

    // If Claude returned malformed JSON, fall back to regex result.
    if (parsed === null) {
      return {
        tier: regexTier,
        signal: regexResult.triggers[0] ?? null,
        confidence: regexResult.confidence,
        timestamp,
      };
    }

    const claudeTier = rawTierToEnum(parsed.tier);

    // Merge: take the more cautious (lower-numbered) tier between the two layers.
    const mergedTier: SafetyTier =
      claudeTier < regexTier ? claudeTier : regexTier;

    // Signal: prefer Claude's verbatim excerpt; fall back to regex trigger.
    const mergedSignal: string | null =
      parsed.signal ?? regexResult.triggers[0] ?? null;

    return {
      tier: mergedTier,
      signal: mergedSignal,
      confidence: parsed.confidence,
      timestamp,
    };
  }

  // ── No regex result — Claude-only classification ──────────────────────────
  const response = await sendFn(
    SAFETY_MODEL,
    SAFETY_CLASSIFIER_PROMPT,
    message,
    SAFETY_MAX_TOKENS,
    SAFETY_TEMPERATURE,
  );

  // Fail open: if Claude fails, default to Tier 3 (no crisis assumed).
  // This is the safe default when we have no other signal to fall back on.
  if (response.error !== null || response.text === null) {
    return {
      tier: SafetyTier.Tier3_NoRisk,
      signal: null,
      confidence: 0,
      timestamp,
    };
  }

  const parsed = parseClassifierResponse(response.text);

  if (parsed === null) {
    return {
      tier: SafetyTier.Tier3_NoRisk,
      signal: null,
      confidence: 0,
      timestamp,
    };
  }

  return {
    tier: rawTierToEnum(parsed.tier),
    signal: parsed.signal,
    confidence: parsed.confidence,
    timestamp,
  };
}
