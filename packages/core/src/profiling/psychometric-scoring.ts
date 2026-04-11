// packages/core/src/profiling/psychometric-scoring.ts

import type {
  PERMAScores,
  TIPIScores,
  GritScores,
  SWLSScore,
  BPNSScores,
  PsychometricProfile,
  ChronotypeScore,
  SleepQualityScore,
  StressScore,
  SelfCompassionScore,
  LocusOfControlScore,
  ExtendedPsychometricProfile,
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
// MEQ-SA Chronotype (Horne & Ostberg)
// Items: chrono_1..chrono_3
// Sum range: 3-14, thresholds: >=12 definite_morning, >=10 moderate_morning,
//            >=7 intermediate, >=5 moderate_evening, <5 definite_evening
// ---------------------------------------------------------------------------

export function scoreChronotype(responses: Record<string, number>): ChronotypeScore {
  const raw = (responses['chrono_1'] ?? 0) + (responses['chrono_2'] ?? 0) + (responses['chrono_3'] ?? 0);
  let type: ChronotypeScore['type'];
  if (raw >= 12) type = 'definite_morning';
  else if (raw >= 10) type = 'moderate_morning';
  else if (raw >= 7) type = 'intermediate';
  else if (raw >= 5) type = 'moderate_evening';
  else type = 'definite_evening';
  return { type, raw };
}

// ---------------------------------------------------------------------------
// PSQI Short Form — Sleep Quality
// Items: sleep_1..sleep_4, 0-3 scale
// Sum range: 0-12, thresholds: <=4 good, <=8 fair, >8 poor
// ---------------------------------------------------------------------------

export function scoreSleepQuality(responses: Record<string, number>): SleepQualityScore {
  const score = (responses['sleep_1'] ?? 0) + (responses['sleep_2'] ?? 0)
    + (responses['sleep_3'] ?? 0) + (responses['sleep_4'] ?? 0);
  let quality: SleepQualityScore['quality'];
  if (score <= 4) quality = 'good';
  else if (score <= 8) quality = 'fair';
  else quality = 'poor';
  return { score, quality };
}

// ---------------------------------------------------------------------------
// PSS-4 Perceived Stress (Cohen)
// Items: stress_1..stress_4, 0-4 scale
// Reversed items: stress_2, stress_3
// Sum range: 0-16, thresholds: <=5 low, <=10 moderate, >10 high
// ---------------------------------------------------------------------------

export function scoreStress(responses: Record<string, number>): StressScore {
  const s1 = responses['stress_1'] ?? 0;
  const s2 = reverse(responses['stress_2'] ?? 0, 0, 4);
  const s3 = reverse(responses['stress_3'] ?? 0, 0, 4);
  const s4 = responses['stress_4'] ?? 0;
  const score = s1 + s2 + s3 + s4;
  let level: StressScore['level'];
  if (score <= 5) level = 'low';
  else if (score <= 10) level = 'moderate';
  else level = 'high';
  return { score, level };
}

// ---------------------------------------------------------------------------
// SCS-SF Self-Compassion (Neff)
// Items: sc_1..sc_6, 1-5 scale
// Reversed items: sc_2, sc_4, sc_6
// Score: mean of 6 items (after reversal), thresholds: >=3.5 high, >=2.5 moderate, <2.5 low
// ---------------------------------------------------------------------------

export function scoreSelfCompassion(responses: Record<string, number>): SelfCompassionScore {
  const items = [
    responses['sc_1'] ?? 0,
    reverse(responses['sc_2'] ?? 0, 1, 5),
    responses['sc_3'] ?? 0,
    reverse(responses['sc_4'] ?? 0, 1, 5),
    responses['sc_5'] ?? 0,
    reverse(responses['sc_6'] ?? 0, 1, 5),
  ];
  const score = Math.round((items.reduce((a, b) => a + b, 0) / items.length) * 100) / 100;
  let level: SelfCompassionScore['level'];
  if (score >= 3.5) level = 'high';
  else if (score >= 2.5) level = 'moderate';
  else level = 'low';
  return { score, level };
}

// ---------------------------------------------------------------------------
// Brief IPC Locus of Control (Levenson)
// Items: loc_1..loc_3, 1-6 scale
// No reversals; dominant = highest subscale
// ---------------------------------------------------------------------------

export function scoreLocusOfControl(responses: Record<string, number>): LocusOfControlScore {
  const internal = responses['loc_1'] ?? 0;
  const powerfulOthers = responses['loc_2'] ?? 0;
  const chance = responses['loc_3'] ?? 0;
  let dominant: LocusOfControlScore['dominant'];
  if (internal >= powerfulOthers && internal >= chance) dominant = 'internal';
  else if (powerfulOthers >= chance) dominant = 'powerful_others';
  else dominant = 'chance';
  return { internal, powerfulOthers, chance, dominant };
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

/**
 * Computes the extended psychometric profile including baseline instruments.
 *
 * TODO: Wire into onboarding completion flow (Phase 2) — currently exported
 * but not called from any code path. The /api/onboarding/complete route and
 * guest-mode completion in profiling-wizard.tsx should call this instead of
 * computePsychometricProfile once the baseline questions are live.
 */
export function computeExtendedPsychometricProfile(responses: Record<string, number>): ExtendedPsychometricProfile {
  return {
    ...computePsychometricProfile(responses),
    chronotype: scoreChronotype(responses),
    sleepQuality: scoreSleepQuality(responses),
    stress: scoreStress(responses),
    selfCompassion: scoreSelfCompassion(responses),
    locusOfControl: scoreLocusOfControl(responses),
  };
}
