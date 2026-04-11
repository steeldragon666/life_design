import { describe, it, expect } from 'vitest';
import { scoreGAD7 } from '../psychometric-scoring';
import { PSYCHOMETRIC_ITEMS } from '../instruments';

// ---------------------------------------------------------------------------
// Helper: builds a full GAD-7 response map where every item has the same value
// ---------------------------------------------------------------------------
function uniformResponses(value: number): Record<string, number> {
  const r: Record<string, number> = {};
  for (let i = 1; i <= 7; i++) {
    r[`gad7_${i}`] = value;
  }
  return r;
}

// ---------------------------------------------------------------------------
// GAD-7 Scoring Tests
// ---------------------------------------------------------------------------

describe('scoreGAD7', () => {
  // -------------------------------------------------------------------------
  // Severity bands
  // -------------------------------------------------------------------------

  it('scores 0 as minimal severity', () => {
    const result = scoreGAD7(uniformResponses(0));
    expect(result.score).toBe(0);
    expect(result.severity).toBe('minimal');
    expect(result.itemsAnswered).toBe(7);
  });

  it('scores 4 (upper bound of minimal) correctly', () => {
    const responses: Record<string, number> = {
      gad7_1: 1, gad7_2: 1, gad7_3: 1, gad7_4: 1,
      gad7_5: 0, gad7_6: 0, gad7_7: 0,
    };
    const result = scoreGAD7(responses);
    expect(result.score).toBe(4);
    expect(result.severity).toBe('minimal');
  });

  it('scores 5 as mild severity', () => {
    const responses: Record<string, number> = {
      gad7_1: 1, gad7_2: 1, gad7_3: 1, gad7_4: 1,
      gad7_5: 1, gad7_6: 0, gad7_7: 0,
    };
    const result = scoreGAD7(responses);
    expect(result.score).toBe(5);
    expect(result.severity).toBe('mild');
  });

  it('scores 9 (upper bound of mild) correctly', () => {
    const responses: Record<string, number> = {
      gad7_1: 2, gad7_2: 2, gad7_3: 2, gad7_4: 1,
      gad7_5: 1, gad7_6: 1, gad7_7: 0,
    };
    const result = scoreGAD7(responses);
    expect(result.score).toBe(9);
    expect(result.severity).toBe('mild');
  });

  it('scores 10 as moderate severity', () => {
    const responses: Record<string, number> = {
      gad7_1: 2, gad7_2: 2, gad7_3: 2, gad7_4: 2,
      gad7_5: 2, gad7_6: 0, gad7_7: 0,
    };
    const result = scoreGAD7(responses);
    expect(result.score).toBe(10);
    expect(result.severity).toBe('moderate');
  });

  it('scores 14 (upper bound of moderate) correctly', () => {
    const responses: Record<string, number> = {
      gad7_1: 2, gad7_2: 2, gad7_3: 2, gad7_4: 2,
      gad7_5: 2, gad7_6: 2, gad7_7: 2,
    };
    const result = scoreGAD7(responses);
    expect(result.score).toBe(14);
    expect(result.severity).toBe('moderate');
  });

  it('scores 15 as severe', () => {
    const responses: Record<string, number> = {
      gad7_1: 3, gad7_2: 3, gad7_3: 3, gad7_4: 3,
      gad7_5: 3, gad7_6: 0, gad7_7: 0,
    };
    const result = scoreGAD7(responses);
    expect(result.score).toBe(15);
    expect(result.severity).toBe('severe');
  });

  it('scores 21 (maximum) as severe', () => {
    const result = scoreGAD7(uniformResponses(3));
    expect(result.score).toBe(21);
    expect(result.severity).toBe('severe');
  });

  // -------------------------------------------------------------------------
  // Input clamping
  // -------------------------------------------------------------------------

  it('clamps values above 3 to 3', () => {
    const responses: Record<string, number> = {
      gad7_1: 5, gad7_2: 0, gad7_3: 0, gad7_4: 0,
      gad7_5: 0, gad7_6: 0, gad7_7: 0,
    };
    const result = scoreGAD7(responses);
    expect(result.score).toBe(3); // clamped from 5 to 3
  });

  it('clamps negative values to 0', () => {
    const responses: Record<string, number> = {
      gad7_1: -2, gad7_2: 0, gad7_3: 0, gad7_4: 0,
      gad7_5: 0, gad7_6: 0, gad7_7: 0,
    };
    const result = scoreGAD7(responses);
    expect(result.score).toBe(0); // clamped from -2 to 0
  });

  it('clamps all out-of-range values so max score is 21', () => {
    const result = scoreGAD7(uniformResponses(10)); // all 10s → clamped to 3 each
    expect(result.score).toBe(21);
    expect(result.severity).toBe('severe');
  });

  // -------------------------------------------------------------------------
  // Missing / empty responses (graceful degradation)
  // -------------------------------------------------------------------------

  it('handles empty responses gracefully', () => {
    const result = scoreGAD7({});
    expect(result.score).toBe(0);
    expect(result.severity).toBe('minimal');
    expect(result.itemsAnswered).toBe(0);
  });

  it('handles partial responses (only some items answered)', () => {
    const responses: Record<string, number> = {
      gad7_1: 2,
      gad7_3: 3,
    };
    const result = scoreGAD7(responses);
    expect(result.score).toBe(5);
    expect(result.severity).toBe('mild');
    expect(result.itemsAnswered).toBe(2);
  });

  // -------------------------------------------------------------------------
  // itemsAnswered tracking
  // -------------------------------------------------------------------------

  it('tracks itemsAnswered for full responses', () => {
    const result = scoreGAD7(uniformResponses(1));
    expect(result.itemsAnswered).toBe(7);
  });

  it('tracks itemsAnswered for empty responses', () => {
    const result = scoreGAD7({});
    expect(result.itemsAnswered).toBe(0);
  });

  it('tracks itemsAnswered for partial responses', () => {
    const result = scoreGAD7({ gad7_1: 1, gad7_4: 2, gad7_7: 0 });
    expect(result.itemsAnswered).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// GAD-7 Items in PSYCHOMETRIC_ITEMS
// ---------------------------------------------------------------------------

describe('GAD-7 items in PSYCHOMETRIC_ITEMS', () => {
  const gad7Items = PSYCHOMETRIC_ITEMS.filter((item) => item.instrument === 'gad7');

  it('includes exactly 7 GAD-7 items', () => {
    expect(gad7Items).toHaveLength(7);
  });

  it('all items use 0-3 scale', () => {
    for (const item of gad7Items) {
      expect(item.scaleMin).toBe(0);
      expect(item.scaleMax).toBe(3);
    }
  });

  it('no items are reversed', () => {
    for (const item of gad7Items) {
      expect(item.reversed).toBe(false);
    }
  });

  it('all items have subscale "anxiety"', () => {
    for (const item of gad7Items) {
      expect(item.subscale).toBe('anxiety');
    }
  });

  it('item IDs are gad7_1 through gad7_7', () => {
    const ids = gad7Items.map((item) => item.id).sort();
    expect(ids).toEqual([
      'gad7_1', 'gad7_2', 'gad7_3', 'gad7_4', 'gad7_5',
      'gad7_6', 'gad7_7',
    ]);
  });
});
