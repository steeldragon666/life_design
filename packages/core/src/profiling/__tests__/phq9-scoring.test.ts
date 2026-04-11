import { describe, it, expect } from 'vitest';
import { scorePHQ9 } from '../psychometric-scoring';
import { PSYCHOMETRIC_ITEMS } from '../instruments';

// ---------------------------------------------------------------------------
// Helper: builds a full PHQ-9 response map where every item has the same value
// ---------------------------------------------------------------------------
function uniformResponses(value: number): Record<string, number> {
  const r: Record<string, number> = {};
  for (let i = 1; i <= 9; i++) {
    r[`phq9_${i}`] = value;
  }
  return r;
}

// ---------------------------------------------------------------------------
// PHQ-9 Scoring Tests
// ---------------------------------------------------------------------------

describe('scorePHQ9', () => {
  // -------------------------------------------------------------------------
  // Severity bands
  // -------------------------------------------------------------------------

  it('scores 0 as minimal severity', () => {
    const result = scorePHQ9(uniformResponses(0));
    expect(result.score).toBe(0);
    expect(result.severity).toBe('minimal');
    expect(result.criticalItem9).toBe(false);
    expect(result.item9Answered).toBe(true);
    expect(result.itemsAnswered).toBe(9);
  });

  it('scores 4 (upper bound of minimal) correctly', () => {
    const responses: Record<string, number> = {
      phq9_1: 1, phq9_2: 1, phq9_3: 1, phq9_4: 1,
      phq9_5: 0, phq9_6: 0, phq9_7: 0, phq9_8: 0, phq9_9: 0,
    };
    const result = scorePHQ9(responses);
    expect(result.score).toBe(4);
    expect(result.severity).toBe('minimal');
  });

  it('scores 5 as mild severity', () => {
    const responses: Record<string, number> = {
      phq9_1: 1, phq9_2: 1, phq9_3: 1, phq9_4: 1,
      phq9_5: 1, phq9_6: 0, phq9_7: 0, phq9_8: 0, phq9_9: 0,
    };
    const result = scorePHQ9(responses);
    expect(result.score).toBe(5);
    expect(result.severity).toBe('mild');
  });

  it('scores 9 (upper bound of mild) correctly', () => {
    const result = scorePHQ9(uniformResponses(1));
    expect(result.score).toBe(9);
    expect(result.severity).toBe('mild');
  });

  it('scores 10 as moderate severity', () => {
    const responses: Record<string, number> = {
      phq9_1: 2, phq9_2: 2, phq9_3: 2, phq9_4: 2,
      phq9_5: 2, phq9_6: 0, phq9_7: 0, phq9_8: 0, phq9_9: 0,
    };
    const result = scorePHQ9(responses);
    expect(result.score).toBe(10);
    expect(result.severity).toBe('moderate');
  });

  it('scores 14 (upper bound of moderate) correctly', () => {
    const responses: Record<string, number> = {
      phq9_1: 2, phq9_2: 2, phq9_3: 2, phq9_4: 2,
      phq9_5: 2, phq9_6: 2, phq9_7: 2, phq9_8: 0, phq9_9: 0,
    };
    const result = scorePHQ9(responses);
    expect(result.score).toBe(14);
    expect(result.severity).toBe('moderate');
  });

  it('scores 15 as moderately_severe', () => {
    const responses: Record<string, number> = {
      phq9_1: 2, phq9_2: 2, phq9_3: 2, phq9_4: 2,
      phq9_5: 2, phq9_6: 2, phq9_7: 2, phq9_8: 1, phq9_9: 0,
    };
    const result = scorePHQ9(responses);
    expect(result.score).toBe(15);
    expect(result.severity).toBe('moderately_severe');
  });

  it('scores 19 (upper bound of moderately_severe) correctly', () => {
    const responses: Record<string, number> = {
      phq9_1: 3, phq9_2: 3, phq9_3: 3, phq9_4: 3,
      phq9_5: 3, phq9_6: 2, phq9_7: 2, phq9_8: 0, phq9_9: 0,
    };
    const result = scorePHQ9(responses);
    expect(result.score).toBe(19);
    expect(result.severity).toBe('moderately_severe');
  });

  it('scores 20 as severe', () => {
    const responses: Record<string, number> = {
      phq9_1: 3, phq9_2: 3, phq9_3: 3, phq9_4: 3,
      phq9_5: 3, phq9_6: 2, phq9_7: 2, phq9_8: 1, phq9_9: 0,
    };
    const result = scorePHQ9(responses);
    expect(result.score).toBe(20);
    expect(result.severity).toBe('severe');
  });

  it('scores 27 (maximum) as severe', () => {
    const result = scorePHQ9(uniformResponses(3));
    expect(result.score).toBe(27);
    expect(result.severity).toBe('severe');
  });

  // -------------------------------------------------------------------------
  // Critical item 9 (suicidal ideation flag)
  // -------------------------------------------------------------------------

  it('flags criticalItem9 when item 9 = 1', () => {
    const responses = { ...uniformResponses(0), phq9_9: 1 };
    const result = scorePHQ9(responses);
    expect(result.criticalItem9).toBe(true);
  });

  it('flags criticalItem9 when item 9 = 2', () => {
    const responses = { ...uniformResponses(0), phq9_9: 2 };
    const result = scorePHQ9(responses);
    expect(result.criticalItem9).toBe(true);
  });

  it('flags criticalItem9 when item 9 = 3', () => {
    const responses = { ...uniformResponses(0), phq9_9: 3 };
    const result = scorePHQ9(responses);
    expect(result.criticalItem9).toBe(true);
  });

  it('does not flag criticalItem9 when item 9 = 0', () => {
    const responses = { ...uniformResponses(1), phq9_9: 0 };
    const result = scorePHQ9(responses);
    expect(result.criticalItem9).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Missing / empty responses (graceful degradation)
  // -------------------------------------------------------------------------

  it('handles empty responses gracefully', () => {
    const result = scorePHQ9({});
    expect(result.score).toBe(0);
    expect(result.severity).toBe('minimal');
    expect(result.criticalItem9).toBe(false);
    expect(result.item9Answered).toBe(false);
    expect(result.itemsAnswered).toBe(0);
  });

  it('handles partial responses (only some items answered)', () => {
    const responses: Record<string, number> = {
      phq9_1: 2,
      phq9_3: 3,
    };
    const result = scorePHQ9(responses);
    expect(result.score).toBe(5);
    expect(result.severity).toBe('mild');
    expect(result.criticalItem9).toBe(false);
    expect(result.item9Answered).toBe(false);
    expect(result.itemsAnswered).toBe(2);
  });

  it('treats missing item 9 as non-flagged', () => {
    const responses: Record<string, number> = {
      phq9_1: 3, phq9_2: 3, phq9_3: 3,
    };
    const result = scorePHQ9(responses);
    expect(result.criticalItem9).toBe(false);
    expect(result.item9Answered).toBe(false);
  });

  // -------------------------------------------------------------------------
  // item9Answered distinction (CRITICAL 2)
  // -------------------------------------------------------------------------

  it('distinguishes item9 answered as 0 from item9 missing', () => {
    const answeredZero = scorePHQ9({ ...uniformResponses(0), phq9_9: 0 });
    expect(answeredZero.item9Answered).toBe(true);
    expect(answeredZero.criticalItem9).toBe(false);

    const missing = scorePHQ9({ phq9_1: 0 });
    expect(missing.item9Answered).toBe(false);
    expect(missing.criticalItem9).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Input clamping (CRITICAL 1)
  // -------------------------------------------------------------------------

  it('clamps values above 3 to 3', () => {
    const responses: Record<string, number> = {
      phq9_1: 5, phq9_2: 0, phq9_3: 0, phq9_4: 0,
      phq9_5: 0, phq9_6: 0, phq9_7: 0, phq9_8: 0, phq9_9: 0,
    };
    const result = scorePHQ9(responses);
    expect(result.score).toBe(3); // clamped from 5 to 3
  });

  it('clamps negative values to 0', () => {
    const responses: Record<string, number> = {
      phq9_1: -2, phq9_2: 0, phq9_3: 0, phq9_4: 0,
      phq9_5: 0, phq9_6: 0, phq9_7: 0, phq9_8: 0, phq9_9: 0,
    };
    const result = scorePHQ9(responses);
    expect(result.score).toBe(0); // clamped from -2 to 0
  });

  it('clamps all out-of-range values so max score is 27', () => {
    const result = scorePHQ9(uniformResponses(10)); // all 10s → clamped to 3 each
    expect(result.score).toBe(27);
    expect(result.severity).toBe('severe');
  });

  it('clamps item 9 for criticalItem9 flag', () => {
    const responses = { ...uniformResponses(0), phq9_9: 5 };
    const result = scorePHQ9(responses);
    expect(result.criticalItem9).toBe(true);
    expect(result.score).toBe(3); // clamped
  });
});

// ---------------------------------------------------------------------------
// PHQ-9 Items in PSYCHOMETRIC_ITEMS
// ---------------------------------------------------------------------------

describe('PHQ-9 items in PSYCHOMETRIC_ITEMS', () => {
  const phq9Items = PSYCHOMETRIC_ITEMS.filter((item) => item.instrument === 'phq9');

  it('includes exactly 9 PHQ-9 items', () => {
    expect(phq9Items).toHaveLength(9);
  });

  it('all items use 0-3 scale', () => {
    for (const item of phq9Items) {
      expect(item.scaleMin).toBe(0);
      expect(item.scaleMax).toBe(3);
    }
  });

  it('no items are reversed', () => {
    for (const item of phq9Items) {
      expect(item.reversed).toBe(false);
    }
  });

  it('all items have subscale "depression"', () => {
    for (const item of phq9Items) {
      expect(item.subscale).toBe('depression');
    }
  });

  it('item IDs are phq9_1 through phq9_9', () => {
    const ids = phq9Items.map((item) => item.id).sort();
    expect(ids).toEqual([
      'phq9_1', 'phq9_2', 'phq9_3', 'phq9_4', 'phq9_5',
      'phq9_6', 'phq9_7', 'phq9_8', 'phq9_9',
    ]);
  });
});
