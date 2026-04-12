/**
 * @module engine/modality-selector
 *
 * Selects which therapeutic modality (or pair of modalities) to apply for a
 * given issue, informed by the user's therapeutic memory and the current DRM
 * phase. Returns a prioritised recommendation with reasoning, so the companion
 * can explain its approach internally and adapt its technique choice.
 */

import { DRMPhase, TherapeuticModality } from '../types.js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ModalitySelectionParams {
  /** Short description of the issue or topic the user is currently exploring. */
  currentIssue: string;
  /** Raw therapeutic memory block (string extracted from the memory layer). */
  therapeuticBlock: string;
  /** Current DRM phase -- determines the default selection strategy. */
  phase: DRMPhase;
  /** The full list of modalities available to the companion. */
  availableModalities: TherapeuticModality[];
}

export interface ModalityRecommendation {
  /** The primary modality to lead with. */
  primary: TherapeuticModality;
  /** A complementary modality to weave in if the primary has been explored. */
  secondary: TherapeuticModality | null;
  /** Human-readable explanation for why this recommendation was made. */
  reasoning: string;
  /** Modalities that should be avoided for this issue/person right now. */
  avoidModalities: TherapeuticModality[];
}

// ── Internal representation of parsed effectiveness data ─────────────────────

interface ModalityScore {
  modality: TherapeuticModality;
  effectiveness: number;
}

// ── Parsing ──────────────────────────────────────────────────────────────────

/**
 * Scans the therapeutic memory block for lines like:
 *   cbt: effectiveness: 0.8
 *   motivational_interviewing effectiveness: 0.4
 *
 * Returns a map of modality to highest effectiveness score found.
 * The regex is intentionally liberal to handle varied serialisation formats.
 */
function parseEffectivenessFromBlock(block: string): Map<TherapeuticModality, number> {
  const scores = new Map<TherapeuticModality, number>();

  const effectivenessPattern = /effectiveness[:\s]+([0-9]+(?:\.[0-9]+)?)/gi;

  const modalityValues = Object.values(TherapeuticModality);

  const lines = block.split('\n');
  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    let matchedModality: TherapeuticModality | null = null;
    for (const value of modalityValues) {
      if (lowerLine.includes(value)) {
        matchedModality = value as TherapeuticModality;
        break;
      }
    }

    if (matchedModality === null) continue;

    effectivenessPattern.lastIndex = 0;
    const match = effectivenessPattern.exec(lowerLine);
    if (match === null) continue;

    const score = parseFloat(match[1]);
    if (!isNaN(score)) {
      const existing = scores.get(matchedModality);
      if (existing === undefined || score > existing) {
        scores.set(matchedModality, score);
      }
    }
  }

  return scores;
}

/**
 * Returns modalities explicitly marked as avoided or ineffective.
 * Looks for patterns like "avoid: cbt" or "ineffective: act" or scores <= 0.2.
 */
function parseAvoidedModalities(
  block: string,
  effectivenessMap: Map<TherapeuticModality, number>,
): TherapeuticModality[] {
  const avoided: TherapeuticModality[] = [];
  const modalityValues = Object.values(TherapeuticModality);
  const lowerBlock = block.toLowerCase();

  const avoidPattern = /(?:avoid|ineffective|resistant)[:\s]+([a-z_]+)/gi;
  let match = avoidPattern.exec(lowerBlock);
  while (match !== null) {
    const candidate = match[1] as TherapeuticModality;
    if (modalityValues.includes(candidate)) {
      avoided.push(candidate);
    }
    match = avoidPattern.exec(lowerBlock);
  }

  // Low effectiveness score (<= 0.2) also counts as implicit avoidance
  for (const [modality, score] of effectivenessMap) {
    if (score <= 0.2 && !avoided.includes(modality)) {
      avoided.push(modality);
    }
  }

  return avoided;
}

// ── Phase-default strategies ─────────────────────────────────────────────────

function phaseDefaultPrimary(
  phase: DRMPhase,
  available: TherapeuticModality[],
): TherapeuticModality {
  const preferred: TherapeuticModality[] =
    phase === DRMPhase.Initial
      ? [TherapeuticModality.MI]
      : phase === DRMPhase.Calibration
      ? [
          TherapeuticModality.CBT,
          TherapeuticModality.ACT,
          TherapeuticModality.CFT,
          TherapeuticModality.BehaviouralActivation,
          TherapeuticModality.Mindfulness,
          TherapeuticModality.DBT,
          TherapeuticModality.MI,
        ]
      : [TherapeuticModality.CBT];

  for (const modality of preferred) {
    if (available.includes(modality)) return modality;
  }

  return available[0] ?? TherapeuticModality.CBT;
}

/**
 * For the calibration phase: pick the modality that has not been tried yet.
 * If all have been tried, rotate to the highest-scored untried candidate.
 */
function calibrationRotation(
  available: TherapeuticModality[],
  effectivenessMap: Map<TherapeuticModality, number>,
  avoided: TherapeuticModality[],
): TherapeuticModality {
  const untried = available.filter(
    (m) => !effectivenessMap.has(m) && !avoided.includes(m),
  );
  if (untried.length > 0) return untried[0];

  return pickBestAvailable(available, effectivenessMap, avoided) ?? available[0] ?? TherapeuticModality.CBT;
}

function pickBestAvailable(
  available: TherapeuticModality[],
  effectivenessMap: Map<TherapeuticModality, number>,
  avoided: TherapeuticModality[],
): TherapeuticModality | null {
  const candidates: ModalityScore[] = available
    .filter((m) => !avoided.includes(m))
    .map((m) => ({ modality: m, effectiveness: effectivenessMap.get(m) ?? 0.5 }))
    .sort((a, b) => b.effectiveness - a.effectiveness);

  return candidates[0]?.modality ?? null;
}

function pickSecondary(
  primary: TherapeuticModality,
  available: TherapeuticModality[],
  effectivenessMap: Map<TherapeuticModality, number>,
  avoided: TherapeuticModality[],
): TherapeuticModality | null {
  const candidates = available.filter((m) => m !== primary && !avoided.includes(m));
  if (candidates.length === 0) return null;

  const scored: ModalityScore[] = candidates
    .map((m) => ({ modality: m, effectiveness: effectivenessMap.get(m) ?? 0.5 }))
    .sort((a, b) => b.effectiveness - a.effectiveness);

  return scored[0]?.modality ?? null;
}

// ── Reasoning builder ────────────────────────────────────────────────────────

function buildReasoning(
  primary: TherapeuticModality,
  secondary: TherapeuticModality | null,
  phase: DRMPhase,
  effectivenessMap: Map<TherapeuticModality, number>,
  currentIssue: string,
): string {
  const parts: string[] = [];

  switch (phase) {
    case DRMPhase.Initial:
      parts.push(
        `Phase is Initial: leading with Motivational Interviewing to build rapport and understand ${currentIssue} without pushing interventions.`,
      );
      break;

    case DRMPhase.Calibration:
      if (effectivenessMap.size === 0) {
        parts.push(
          `Phase is Calibration with no memory data yet: rotating through ${primary} to observe how the user engages.`,
        );
      } else {
        parts.push(
          `Phase is Calibration: selected ${primary} based on remaining untested or higher-scoring modalities for ${currentIssue}.`,
        );
      }
      break;

    case DRMPhase.Personalised:
    case DRMPhase.Deepening: {
      const score = effectivenessMap.get(primary);
      if (score !== undefined) {
        parts.push(
          `Therapeutic memory indicates ${primary} has effectiveness ${score.toFixed(2)} for issues related to "${currentIssue}".`,
        );
      } else {
        parts.push(
          `No specific memory data for "${currentIssue}"; defaulting to ${primary} as the most evidence-based modality.`,
        );
      }
      break;
    }
  }

  if (secondary !== null) {
    parts.push(
      `${secondary} recommended as secondary -- can complement ${primary} once the primary approach has been introduced.`,
    );
  }

  return parts.join(' ');
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Selects a therapeutic modality recommendation for the current issue.
 *
 * Decision logic by phase:
 * - `Initial`: Always defaults to MI to build rapport.
 * - `Calibration`: Rotates through untested modalities to gather signal.
 * - `Personalised` / `Deepening`: Uses therapeutic memory effectiveness scores;
 *   falls back to CBT if no memory exists for the current issue.
 */
export function selectModality(params: ModalitySelectionParams): ModalityRecommendation {
  const { currentIssue, therapeuticBlock, phase, availableModalities } = params;

  if (availableModalities.length === 0) {
    return {
      primary: TherapeuticModality.CBT,
      secondary: null,
      reasoning: 'No available modalities provided; defaulting to CBT as the most evidence-based option.',
      avoidModalities: [],
    };
  }

  const effectivenessMap = parseEffectivenessFromBlock(therapeuticBlock);
  const avoided = parseAvoidedModalities(therapeuticBlock, effectivenessMap);

  // Never leave the pool empty even if everything is in avoided
  const usable = availableModalities.filter((m) => !avoided.includes(m));
  const pool = usable.length > 0 ? usable : availableModalities;

  let primary: TherapeuticModality;

  switch (phase) {
    case DRMPhase.Initial:
      primary = pool.includes(TherapeuticModality.MI)
        ? TherapeuticModality.MI
        : phaseDefaultPrimary(phase, pool);
      break;

    case DRMPhase.Calibration:
      primary = calibrationRotation(pool, effectivenessMap, avoided);
      break;

    case DRMPhase.Personalised:
    case DRMPhase.Deepening: {
      if (effectivenessMap.size === 0) {
        primary = pool.includes(TherapeuticModality.CBT)
          ? TherapeuticModality.CBT
          : pool[0] ?? TherapeuticModality.CBT;
      } else {
        primary =
          pickBestAvailable(pool, effectivenessMap, avoided) ??
          (pool.includes(TherapeuticModality.CBT)
            ? TherapeuticModality.CBT
            : pool[0] ?? TherapeuticModality.CBT);
      }
      break;
    }
  }

  const secondary = pickSecondary(primary, pool, effectivenessMap, avoided);
  const reasoning = buildReasoning(primary, secondary, phase, effectivenessMap, currentIssue);

  return {
    primary,
    secondary,
    reasoning,
    avoidModalities: avoided,
  };
}
