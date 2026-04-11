import { describe, it, expect } from 'vitest';
import {
  scorePERMA,
  scoreTIPI,
  scoreGrit,
  scoreSWLS,
  scoreBPNS,
  computePsychometricProfile,
  scoreChronotype,
  scoreSleepQuality,
  scoreStress,
  scoreSelfCompassion,
  scoreLocusOfControl,
} from '../psychometric-scoring';
import { PSYCHOMETRIC_ITEMS, PSYCHOMETRIC_SECTIONS } from '../instruments';
import type { PsychometricItem, SWLSScore } from '../psychometric-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a responses map where every item for a given instrument gets a fixed value */
function uniformResponses(instrument: string, value: number): Record<string, number> {
  return Object.fromEntries(
    PSYCHOMETRIC_ITEMS
      .filter((item: PsychometricItem) => item.instrument === instrument)
      .map((item: PsychometricItem) => [item.id, value]),
  );
}

/** Build a full response set (all 50 items) with a single fixed value per instrument */
function fullUniformResponses(value: number): Record<string, number> {
  return Object.fromEntries(
    PSYCHOMETRIC_ITEMS.map((item: PsychometricItem) => [item.id, value]),
  );
}

// ---------------------------------------------------------------------------
// PSYCHOMETRIC_ITEMS catalogue
// ---------------------------------------------------------------------------

describe('PSYCHOMETRIC_ITEMS', () => {
  it('contains exactly 86 items (50 original + 20 baseline + 9 PHQ-9 + 7 GAD-7)', () => {
    expect(PSYCHOMETRIC_ITEMS).toHaveLength(86);
  });

  it('contains 15 PERMA items', () => {
    expect(PSYCHOMETRIC_ITEMS.filter((i) => i.instrument === 'perma')).toHaveLength(15);
  });

  it('contains 10 TIPI items', () => {
    expect(PSYCHOMETRIC_ITEMS.filter((i) => i.instrument === 'tipi')).toHaveLength(10);
  });

  it('contains 8 Grit items', () => {
    expect(PSYCHOMETRIC_ITEMS.filter((i) => i.instrument === 'grit')).toHaveLength(8);
  });

  it('contains 5 SWLS items', () => {
    expect(PSYCHOMETRIC_ITEMS.filter((i) => i.instrument === 'swls')).toHaveLength(5);
  });

  it('contains 12 BPNS items', () => {
    expect(PSYCHOMETRIC_ITEMS.filter((i) => i.instrument === 'bpns')).toHaveLength(12);
  });

  it('all item IDs are unique', () => {
    const ids = PSYCHOMETRIC_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all item IDs are prefixed with their instrument-specific prefix', () => {
    const prefixMap: Record<string, string> = {
      perma: 'perma', tipi: 'tipi', grit: 'grit', swls: 'swls', bpns: 'bpns',
      chronotype: 'chrono', sleep: 'sleep', stress: 'stress',
      selfCompassion: 'sc', locusOfControl: 'loc', phq9: 'phq9', gad7: 'gad7',
    };
    PSYCHOMETRIC_ITEMS.forEach((item) => {
      const prefix = prefixMap[item.instrument] ?? item.instrument;
      expect(item.id).toMatch(new RegExp(`^${prefix}_\\d+$`));
    });
  });

  it('TIPI reversed items are 2,4,6,8,10', () => {
    const reversedIds = PSYCHOMETRIC_ITEMS
      .filter((i) => i.instrument === 'tipi' && i.reversed)
      .map((i) => i.id);
    expect(reversedIds.sort()).toEqual(['tipi_10', 'tipi_2', 'tipi_4', 'tipi_6', 'tipi_8']);
  });

  it('Grit reversed items are 1,3,5,7', () => {
    const reversedIds = PSYCHOMETRIC_ITEMS
      .filter((i) => i.instrument === 'grit' && i.reversed)
      .map((i) => i.id);
    expect(reversedIds.sort()).toEqual(['grit_1', 'grit_3', 'grit_5', 'grit_7']);
  });

  it('BPNS reversed item is 4 only', () => {
    const reversedIds = PSYCHOMETRIC_ITEMS
      .filter((i) => i.instrument === 'bpns' && i.reversed)
      .map((i) => i.id);
    expect(reversedIds).toEqual(['bpns_4']);
  });
});

// ---------------------------------------------------------------------------
// PSYCHOMETRIC_SECTIONS catalogue
// ---------------------------------------------------------------------------

describe('PSYCHOMETRIC_SECTIONS', () => {
  it('contains 8 sections (5 original + 1 baseline + 2 clinical)', () => {
    expect(PSYCHOMETRIC_SECTIONS).toHaveLength(8);
  });

  it('section questionCounts match item catalogue', () => {
    PSYCHOMETRIC_SECTIONS.forEach((section) => {
      const instruments = 'instruments' in section
        ? new Set(section.instruments)
        : new Set([section.instrument]);
      const count = PSYCHOMETRIC_ITEMS.filter((i) => instruments.has(i.instrument)).length;
      expect(count).toBe(section.questionCount);
    });
  });
});

// ---------------------------------------------------------------------------
// scorePERMA
// ---------------------------------------------------------------------------

describe('scorePERMA', () => {
  it('scores all subscales at midpoint (5) when all items answered as 5', () => {
    const scores = scorePERMA(uniformResponses('perma', 5));
    expect(scores.positiveEmotion).toBeCloseTo(5);
    expect(scores.engagement).toBeCloseTo(5);
    expect(scores.relationships).toBeCloseTo(5);
    expect(scores.meaning).toBeCloseTo(5);
    expect(scores.accomplishment).toBeCloseTo(5);
    expect(scores.overall).toBeCloseTo(5);
  });

  it('scores all subscales at 10 when all items answered as 10', () => {
    const scores = scorePERMA(uniformResponses('perma', 10));
    expect(scores.overall).toBeCloseTo(10);
  });

  it('scores all subscales at 0 when all items answered as 0', () => {
    const scores = scorePERMA(uniformResponses('perma', 0));
    expect(scores.overall).toBeCloseTo(0);
  });

  it('overall is mean of the five subscale scores', () => {
    const responses: Record<string, number> = {
      perma_1: 8, perma_2: 8, perma_3: 8,   // positiveEmotion = 8
      perma_4: 6, perma_5: 6, perma_6: 6,   // engagement = 6
      perma_7: 4, perma_8: 4, perma_9: 4,   // relationships = 4
      perma_10: 2, perma_11: 2, perma_12: 2, // meaning = 2
      perma_13: 0, perma_14: 0, perma_15: 0, // accomplishment = 0
    };
    const scores = scorePERMA(responses);
    expect(scores.overall).toBeCloseTo((8 + 6 + 4 + 2 + 0) / 5);
  });

  it('handles missing items by averaging only answered items', () => {
    // Only positive emotion items answered
    const scores = scorePERMA({ perma_1: 8, perma_2: 6, perma_3: 4 });
    expect(scores.positiveEmotion).toBeCloseTo(6);
    // Unanswered subscales default to 0
    expect(scores.engagement).toBeCloseTo(0);
  });
});

// ---------------------------------------------------------------------------
// scoreTIPI
// ---------------------------------------------------------------------------

describe('scoreTIPI', () => {
  it('returns values in 1-7 range for valid input', () => {
    const scores = scoreTIPI(uniformResponses('tipi', 4));
    Object.values(scores).forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(7);
    });
  });

  it('correctly reverses items 2,4,6,8,10 using formula 8 - value', () => {
    // Set all items to 3. Reversed items become 8-3=5. Each trait pair averages (3+5)/2=4.
    const scores = scoreTIPI(uniformResponses('tipi', 3));
    expect(scores.extraversion).toBeCloseTo(4);       // tipi_1=3, tipi_6r=5 → avg=4
    expect(scores.agreeableness).toBeCloseTo(4);      // tipi_2r=5, tipi_7=3 → avg=4
    expect(scores.conscientiousness).toBeCloseTo(4);  // tipi_3=3, tipi_8r=5 → avg=4
    expect(scores.emotionalStability).toBeCloseTo(4); // tipi_4r=5, tipi_9=3 → avg=4
    expect(scores.openness).toBeCloseTo(4);           // tipi_5=3, tipi_10r=5 → avg=4
  });

  it('produces differentiated trait scores from distinct item values', () => {
    const responses: Record<string, number> = {
      // High extraversion: tipi_1=7, tipi_6(reversed, low)=1 → 8-1=7 → avg=7
      tipi_1: 7, tipi_6: 1,
      // Moderate agreeableness
      tipi_2: 4, tipi_7: 4,
      // Default all others to midpoint
      tipi_3: 4, tipi_8: 4,
      tipi_4: 4, tipi_9: 4,
      tipi_5: 4, tipi_10: 4,
    };
    const scores = scoreTIPI(responses);
    expect(scores.extraversion).toBeCloseTo(7);
    expect(scores.agreeableness).toBeCloseTo(4);
  });
});

// ---------------------------------------------------------------------------
// scoreGrit
// ---------------------------------------------------------------------------

describe('scoreGrit', () => {
  it('returns values in 1-5 range for valid input', () => {
    const scores = scoreGrit(uniformResponses('grit', 3));
    expect(scores.perseverance).toBeGreaterThanOrEqual(1);
    expect(scores.perseverance).toBeLessThanOrEqual(5);
    expect(scores.consistency).toBeGreaterThanOrEqual(1);
    expect(scores.consistency).toBeLessThanOrEqual(5);
    expect(scores.overall).toBeGreaterThanOrEqual(1);
    expect(scores.overall).toBeLessThanOrEqual(5);
  });

  it('correctly reverses consistency items 1,3,5,7 using formula 6 - value', () => {
    // Set all items to 2. Consistency items reversed: 6-2=4. Perseverance items stay 2.
    const scores = scoreGrit(uniformResponses('grit', 2));
    expect(scores.consistency).toBeCloseTo(4);   // all reversed: 6-2=4
    expect(scores.perseverance).toBeCloseTo(2);  // no reversal
  });

  it('overall equals mean of all 8 items after reversal', () => {
    // All items answered as 2 → consistency items become 4, perseverance stay 2 → overall = (4+2+4+2+4+2+4+2)/8 = 3
    const scores = scoreGrit(uniformResponses('grit', 2));
    expect(scores.overall).toBeCloseTo(3);
  });

  it('high grit: mostly 5s on perseverance and 1s on consistency items', () => {
    const responses: Record<string, number> = {
      grit_1: 1, grit_3: 1, grit_5: 1, grit_7: 1, // consistency (reversed: 6-1=5)
      grit_2: 5, grit_4: 5, grit_6: 5, grit_8: 5, // perseverance
    };
    const scores = scoreGrit(responses);
    expect(scores.consistency).toBeCloseTo(5);
    expect(scores.perseverance).toBeCloseTo(5);
    expect(scores.overall).toBeCloseTo(5);
  });
});

// ---------------------------------------------------------------------------
// scoreSWLS
// ---------------------------------------------------------------------------

describe('scoreSWLS', () => {
  it('returns extremely_satisfied for all 7s (raw sum = 35)', () => {
    const result = scoreSWLS(uniformResponses('swls', 7));
    expect(result.band).toBe('extremely_satisfied');
    expect(result.score).toBeCloseTo(7);
  });

  it('returns extremely_dissatisfied for all 1s (raw sum = 5)', () => {
    const result = scoreSWLS(uniformResponses('swls', 1));
    expect(result.band).toBe('extremely_dissatisfied');
    expect(result.score).toBeCloseTo(1);
  });

  it('returns neutral for raw sum of 20 (all items answered as 4)', () => {
    const result = scoreSWLS(uniformResponses('swls', 4));
    expect(result.band).toBe('neutral');
    expect(result.score).toBeCloseTo(4);
  });

  it('band thresholds are correct across the full range', () => {
    const cases: [number[], SWLSScore['band']][] = [
      [[1, 1, 1, 1, 1], 'extremely_dissatisfied'],  // sum=5
      [[2, 2, 2, 2, 2], 'dissatisfied'],             // sum=10
      [[3, 3, 3, 3, 3], 'slightly_dissatisfied'],    // sum=15
      [[4, 4, 4, 4, 4], 'neutral'],                  // sum=20
      [[5, 5, 5, 5, 5], 'slightly_satisfied'],       // sum=25 — wait actually 5*5=25, in range 21-25
      [[6, 6, 6, 6, 5], 'satisfied'],                // sum=29 → 26-30
      [[7, 7, 7, 7, 7], 'extremely_satisfied'],      // sum=35
    ];
    cases.forEach(([values, expectedBand]) => {
      const responses: Record<string, number> = {};
      values.forEach((v, i) => { responses[`swls_${i + 1}`] = v; });
      expect(scoreSWLS(responses).band).toBe(expectedBand);
    });
  });

  it('normalised score is in 1-7 range for all valid raw inputs', () => {
    for (let v = 1; v <= 7; v++) {
      const result = scoreSWLS(uniformResponses('swls', v));
      expect(result.score).toBeGreaterThanOrEqual(1);
      expect(result.score).toBeLessThanOrEqual(7);
    }
  });
});

// ---------------------------------------------------------------------------
// scoreBPNS
// ---------------------------------------------------------------------------

describe('scoreBPNS', () => {
  it('returns values in 1-7 range for valid input', () => {
    const scores = scoreBPNS(uniformResponses('bpns', 4));
    expect(scores.autonomy).toBeGreaterThanOrEqual(1);
    expect(scores.autonomy).toBeLessThanOrEqual(7);
    expect(scores.competence).toBeGreaterThanOrEqual(1);
    expect(scores.competence).toBeLessThanOrEqual(7);
    expect(scores.relatedness).toBeGreaterThanOrEqual(1);
    expect(scores.relatedness).toBeLessThanOrEqual(7);
  });

  it('correctly reverses bpns_4 using formula 8 - value', () => {
    // Set autonomy items: bpns_1=7, bpns_2=7, bpns_3=7, bpns_4=1 (reversed → 8-1=7) → avg=7
    const responses: Record<string, number> = {
      bpns_1: 7, bpns_2: 7, bpns_3: 7, bpns_4: 1,
      bpns_5: 4, bpns_6: 4, bpns_7: 4, bpns_8: 4,
      bpns_9: 4, bpns_10: 4, bpns_11: 4, bpns_12: 4,
    };
    const scores = scoreBPNS(responses);
    expect(scores.autonomy).toBeCloseTo(7);
  });

  it('all subscales at midpoint when all items answered as 4', () => {
    const scores = scoreBPNS(uniformResponses('bpns', 4));
    // bpns_4 reversed: 8-4=4, so autonomy avg = (4+4+4+4)/4 = 4
    expect(scores.autonomy).toBeCloseTo(4);
    expect(scores.competence).toBeCloseTo(4);
    expect(scores.relatedness).toBeCloseTo(4);
  });

  it('handles missing items by averaging only answered items', () => {
    const scores = scoreBPNS({ bpns_9: 6, bpns_10: 6 });
    expect(scores.relatedness).toBeCloseTo(6);
    expect(scores.autonomy).toBeCloseTo(0); // no answers → avg returns 0
  });
});

// ---------------------------------------------------------------------------
// computePsychometricProfile
// ---------------------------------------------------------------------------

describe('computePsychometricProfile', () => {
  it('returns all five instrument results', () => {
    const profile = computePsychometricProfile(fullUniformResponses(5));
    expect(profile).toHaveProperty('perma');
    expect(profile).toHaveProperty('tipi');
    expect(profile).toHaveProperty('grit');
    expect(profile).toHaveProperty('swls');
    expect(profile).toHaveProperty('bpns');
  });

  it('PERMA profile has all 6 keys', () => {
    const { perma } = computePsychometricProfile(fullUniformResponses(5));
    expect(perma).toHaveProperty('positiveEmotion');
    expect(perma).toHaveProperty('engagement');
    expect(perma).toHaveProperty('relationships');
    expect(perma).toHaveProperty('meaning');
    expect(perma).toHaveProperty('accomplishment');
    expect(perma).toHaveProperty('overall');
  });

  it('TIPI profile has all 5 Big Five traits', () => {
    const { tipi } = computePsychometricProfile(fullUniformResponses(4));
    expect(tipi).toHaveProperty('extraversion');
    expect(tipi).toHaveProperty('agreeableness');
    expect(tipi).toHaveProperty('conscientiousness');
    expect(tipi).toHaveProperty('emotionalStability');
    expect(tipi).toHaveProperty('openness');
  });

  it('Grit profile has perseverance, consistency and overall', () => {
    const { grit } = computePsychometricProfile(fullUniformResponses(3));
    expect(grit).toHaveProperty('perseverance');
    expect(grit).toHaveProperty('consistency');
    expect(grit).toHaveProperty('overall');
  });

  it('SWLS profile has score and band', () => {
    const { swls } = computePsychometricProfile(fullUniformResponses(6));
    expect(swls).toHaveProperty('score');
    expect(swls).toHaveProperty('band');
  });

  it('BPNS profile has autonomy, competence and relatedness', () => {
    const { bpns } = computePsychometricProfile(fullUniformResponses(5));
    expect(bpns).toHaveProperty('autonomy');
    expect(bpns).toHaveProperty('competence');
    expect(bpns).toHaveProperty('relatedness');
  });

  it('returns a consistent result for an empty response set', () => {
    const profile = computePsychometricProfile({});
    expect(profile.perma.overall).toBe(0);
    expect(profile.swls.score).toBe(1);
    expect(profile.swls.band).toBe('extremely_dissatisfied');
  });
});

// ---------------------------------------------------------------------------
// scoreChronotype
// ---------------------------------------------------------------------------

describe('scoreChronotype', () => {
  it('classifies high scores as definite morning', () => {
    const responses = { chrono_1: 5, chrono_2: 4, chrono_3: 5 };
    const result = scoreChronotype(responses);
    expect(result.type).toBe('definite_morning');
    expect(result.raw).toBe(14);
  });

  it('classifies low scores as definite evening', () => {
    const responses = { chrono_1: 1, chrono_2: 1, chrono_3: 1 };
    const result = scoreChronotype(responses);
    expect(result.type).toBe('definite_evening');
    expect(result.raw).toBe(3);
  });

  it('classifies mid-range as intermediate', () => {
    const responses = { chrono_1: 3, chrono_2: 2, chrono_3: 3 };
    const result = scoreChronotype(responses);
    expect(result.type).toBe('intermediate');
    expect(result.raw).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// scoreSleepQuality
// ---------------------------------------------------------------------------

describe('scoreSleepQuality', () => {
  it('scores good sleep quality', () => {
    const responses = { sleep_1: 0, sleep_2: 0, sleep_3: 0, sleep_4: 1 };
    const result = scoreSleepQuality(responses);
    expect(result.score).toBe(1);
    expect(result.quality).toBe('good');
  });

  it('scores poor sleep quality', () => {
    const responses = { sleep_1: 3, sleep_2: 3, sleep_3: 3, sleep_4: 3 };
    const result = scoreSleepQuality(responses);
    expect(result.score).toBe(12);
    expect(result.quality).toBe('poor');
  });
});

// ---------------------------------------------------------------------------
// scoreStress
// ---------------------------------------------------------------------------

describe('scoreStress', () => {
  it('reverses items 2 and 3 and sums', () => {
    const responses = { stress_1: 4, stress_2: 0, stress_3: 0, stress_4: 4 };
    const result = scoreStress(responses);
    expect(result.score).toBe(16);
    expect(result.level).toBe('high');
  });

  it('scores low stress', () => {
    const responses = { stress_1: 0, stress_2: 4, stress_3: 4, stress_4: 0 };
    const result = scoreStress(responses);
    expect(result.score).toBe(0);
    expect(result.level).toBe('low');
  });
});

// ---------------------------------------------------------------------------
// scoreSelfCompassion
// ---------------------------------------------------------------------------

describe('scoreSelfCompassion', () => {
  it('reverses negative items and averages high', () => {
    const responses = { sc_1: 5, sc_2: 1, sc_3: 5, sc_4: 1, sc_5: 5, sc_6: 1 };
    const result = scoreSelfCompassion(responses);
    expect(result.score).toBe(5);
    expect(result.level).toBe('high');
  });

  it('scores low self-compassion', () => {
    const responses = { sc_1: 1, sc_2: 5, sc_3: 1, sc_4: 5, sc_5: 1, sc_6: 5 };
    const result = scoreSelfCompassion(responses);
    expect(result.score).toBe(1);
    expect(result.level).toBe('low');
  });
});

// ---------------------------------------------------------------------------
// scoreLocusOfControl
// ---------------------------------------------------------------------------

describe('scoreLocusOfControl', () => {
  it('identifies dominant locus as internal', () => {
    const responses = { loc_1: 6, loc_2: 2, loc_3: 1 };
    const result = scoreLocusOfControl(responses);
    expect(result.internal).toBe(6);
    expect(result.dominant).toBe('internal');
  });

  it('identifies dominant locus as chance', () => {
    const responses = { loc_1: 1, loc_2: 2, loc_3: 5 };
    const result = scoreLocusOfControl(responses);
    expect(result.dominant).toBe('chance');
  });
});
