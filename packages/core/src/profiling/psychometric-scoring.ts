// packages/core/src/profiling/psychometric-scoring.ts

import type {
  PERMAScores,
  TIPIScores,
  GritScores,
  SWLSScore,
  BPNSScores,
  PsychometricProfile,
} from './psychometric-types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns the average of a set of numeric values, ignoring undefined entries.
 * Returns 0 when no valid values are present.
 */
function avg(values: (number | undefined)[]): number {
  const valid = values.filter((v): v is number => v !== undefined && !isNaN(v));
  if (valid.length === 0) return 0;
  return valid.reduce((sum, v) => sum + v, 0) / valid.length;
}

/**
 * Reverses a value within a [min, max] scale using the formula: (max + min) - value.
 */
function reverse(value: number, scaleMin: number, scaleMax: number): number {
  return scaleMax + scaleMin - value;
}

// ---------------------------------------------------------------------------
// PERMA Profiler (Butler & Kern, 2016)
// Items: perma_1..perma_15, 0-10 scale, no reversed items
// Subscales: positiveEmotion (1-3), engagement (4-6), relationships (7-9),
//            meaning (10-12), accomplishment (13-15)
// ---------------------------------------------------------------------------

export function scorePERMA(responses: Record<string, number>): PERMAScores {
  const positiveEmotion = avg([responses['perma_1'], responses['perma_2'], responses['perma_3']]);
  const engagement      = avg([responses['perma_4'], responses['perma_5'], responses['perma_6']]);
  const relationships   = avg([responses['perma_7'], responses['perma_8'], responses['perma_9']]);
  const meaning         = avg([responses['perma_10'], responses['perma_11'], responses['perma_12']]);
  const accomplishment  = avg([responses['perma_13'], responses['perma_14'], responses['perma_15']]);

  // Overall is the mean of the five subscale scores (not the raw item mean)
  const overall = avg([positiveEmotion, engagement, relationships, meaning, accomplishment]);

  return { positiveEmotion, engagement, relationships, meaning, accomplishment, overall };
}

// ---------------------------------------------------------------------------
// TIPI (Gosling et al., 2003)
// Items: tipi_1..tipi_10, 1-7 scale
// Reversed items: 2,4,6,8,10  →  reverse = 8 - value
// Subscale pairs: extraversion (1,6), agreeableness (2r,7),
//                 conscientiousness (3,8r), emotionalStability (4r,9), openness (5,10r)
// ---------------------------------------------------------------------------

export function scoreTIPI(responses: Record<string, number>): TIPIScores {
  const r = (key: string) => {
    const v = responses[key];
    return v !== undefined ? reverse(v, 1, 7) : undefined;
  };

  const extraversion      = avg([responses['tipi_1'], r('tipi_6')]);
  const agreeableness     = avg([r('tipi_2'), responses['tipi_7']]);
  const conscientiousness = avg([responses['tipi_3'], r('tipi_8')]);
  const emotionalStability = avg([r('tipi_4'), responses['tipi_9']]);
  const openness          = avg([responses['tipi_5'], r('tipi_10')]);

  return { extraversion, agreeableness, conscientiousness, emotionalStability, openness };
}

// ---------------------------------------------------------------------------
// Short Grit Scale (Duckworth & Quinn, 2009)
// Items: grit_1..grit_8, 1-5 scale
// Reversed items: 1,3,5,7  →  reverse = 6 - value
// Consistency subscale:  items 1r,3r,5r,7r
// Perseverance subscale: items 2,4,6,8
// ---------------------------------------------------------------------------

export function scoreGrit(responses: Record<string, number>): GritScores {
  const r = (key: string) => {
    const v = responses[key];
    return v !== undefined ? reverse(v, 1, 5) : undefined;
  };

  const consistency  = avg([r('grit_1'), r('grit_3'), r('grit_5'), r('grit_7')]);
  const perseverance = avg([responses['grit_2'], responses['grit_4'], responses['grit_6'], responses['grit_8']]);

  // Overall: average of all 8 items (each already in correct direction after reversal)
  const overall = avg([
    r('grit_1'), responses['grit_2'],
    r('grit_3'), responses['grit_4'],
    r('grit_5'), responses['grit_6'],
    r('grit_7'), responses['grit_8'],
  ]);

  return { perseverance, consistency, overall };
}

// ---------------------------------------------------------------------------
// SWLS — Satisfaction with Life Scale (Diener et al., 1985)
// Items: swls_1..swls_5, 1-7 scale, no reversed items
// Raw sum range: 5-35
// Band thresholds (Pavot & Diener, 1993):
//   31-35 extremely_satisfied  26-30 satisfied  21-25 slightly_satisfied
//   20    neutral
//   15-19 slightly_dissatisfied  10-14 dissatisfied  5-9 extremely_dissatisfied
// Normalised score: maps raw 5-35 → 1-7
// ---------------------------------------------------------------------------

function swlsBand(rawSum: number): SWLSScore['band'] {
  if (rawSum >= 31) return 'extremely_satisfied';
  if (rawSum >= 26) return 'satisfied';
  if (rawSum >= 21) return 'slightly_satisfied';
  if (rawSum === 20) return 'neutral';
  if (rawSum >= 15) return 'slightly_dissatisfied';
  if (rawSum >= 10) return 'dissatisfied';
  return 'extremely_dissatisfied';
}

export function scoreSWLS(responses: Record<string, number>): SWLSScore {
  const items = [
    responses['swls_1'],
    responses['swls_2'],
    responses['swls_3'],
    responses['swls_4'],
    responses['swls_5'],
  ].filter((v): v is number => v !== undefined && !isNaN(v));

  // Sum answered items; scale bands assume all 5 answered (5-35 range)
  const rawSum = items.reduce((sum, v) => sum + v, 0);

  // Normalise raw sum (5-35) onto 1-7 scale: score = 1 + (rawSum - 5) * (6 / 30)
  const normalised = items.length > 0
    ? 1 + ((rawSum - 5) * 6) / 30
    : 1;

  // Clamp to valid range in case of partial responses
  const score = Math.min(7, Math.max(1, normalised));

  return { score, band: swlsBand(rawSum) };
}

// ---------------------------------------------------------------------------
// BPNS — Basic Psychological Needs Scale (Deci & Ryan)
// Items: bpns_1..bpns_12, 1-7 scale
// Reversed item: 4  →  reverse = 8 - value
// Autonomy:    items 1,2,3,4r
// Competence:  items 5,6,7,8
// Relatedness: items 9,10,11,12
// ---------------------------------------------------------------------------

export function scoreBPNS(responses: Record<string, number>): BPNSScores {
  const r4 = responses['bpns_4'] !== undefined
    ? reverse(responses['bpns_4'], 1, 7)
    : undefined;

  const autonomy    = avg([responses['bpns_1'], responses['bpns_2'], responses['bpns_3'], r4]);
  const competence  = avg([responses['bpns_5'], responses['bpns_6'], responses['bpns_7'], responses['bpns_8']]);
  const relatedness = avg([responses['bpns_9'], responses['bpns_10'], responses['bpns_11'], responses['bpns_12']]);

  return { autonomy, competence, relatedness };
}

// ---------------------------------------------------------------------------
// Composite profile
// ---------------------------------------------------------------------------

/**
 * Computes the full psychometric profile from a flat map of item responses.
 * Keys must match the instrument-prefixed item IDs (e.g. "perma_1", "tipi_3").
 * Missing items are skipped; averages are computed over answered items only.
 */
export function computePsychometricProfile(responses: Record<string, number>): PsychometricProfile {
  return {
    perma: scorePERMA(responses),
    tipi:  scoreTIPI(responses),
    grit:  scoreGrit(responses),
    swls:  scoreSWLS(responses),
    bpns:  scoreBPNS(responses),
  };
}
