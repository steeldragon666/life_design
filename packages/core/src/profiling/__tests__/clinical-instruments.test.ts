import { describe, it, expect } from 'vitest';
import {
  scorePHQ9Screening,
  scoreGAD7Screening,
  scorePHQ2,
  scoreGAD2,
  scoreWHO5,
  PHQ9_QUESTIONS,
  GAD7_QUESTIONS,
  PHQ2_QUESTIONS,
  GAD2_QUESTIONS,
  WHO5_QUESTIONS,
  CLINICAL_DISCLAIMER,
} from '../clinical-screening';
import type { ScreeningResult, ScreeningQuestion } from '../clinical-screening';

// ---------------------------------------------------------------------------
// PHQ-9 Screening (ScreeningResult API)
// ---------------------------------------------------------------------------

describe('scorePHQ9Screening', () => {
  it('returns minimal severity for all zeros', () => {
    const result = scorePHQ9Screening([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(result.instrument).toBe('phq9');
    expect(result.total).toBe(0);
    expect(result.severity).toBe('minimal');
    expect(result.answers).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('scores edge case: total = 4 (upper minimal)', () => {
    const result = scorePHQ9Screening([1, 1, 1, 1, 0, 0, 0, 0, 0]);
    expect(result.total).toBe(4);
    expect(result.severity).toBe('minimal');
  });

  it('scores edge case: total = 5 (lower mild)', () => {
    const result = scorePHQ9Screening([1, 1, 1, 1, 1, 0, 0, 0, 0]);
    expect(result.total).toBe(5);
    expect(result.severity).toBe('mild');
  });

  it('scores edge case: total = 9 (upper mild)', () => {
    const result = scorePHQ9Screening([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(result.total).toBe(9);
    expect(result.severity).toBe('mild');
  });

  it('scores edge case: total = 10 (lower moderate)', () => {
    const result = scorePHQ9Screening([2, 2, 2, 2, 2, 0, 0, 0, 0]);
    expect(result.total).toBe(10);
    expect(result.severity).toBe('moderate');
  });

  it('scores edge case: total = 14 (upper moderate)', () => {
    const result = scorePHQ9Screening([2, 2, 2, 2, 2, 2, 2, 0, 0]);
    expect(result.total).toBe(14);
    expect(result.severity).toBe('moderate');
  });

  it('scores edge case: total = 15 (lower moderately_severe)', () => {
    const result = scorePHQ9Screening([2, 2, 2, 2, 2, 2, 2, 1, 0]);
    expect(result.total).toBe(15);
    expect(result.severity).toBe('moderately_severe');
  });

  it('scores edge case: total = 19 (upper moderately_severe)', () => {
    const result = scorePHQ9Screening([3, 3, 3, 3, 3, 2, 2, 0, 0]);
    expect(result.total).toBe(19);
    expect(result.severity).toBe('moderately_severe');
  });

  it('scores edge case: total = 20 (lower severe)', () => {
    const result = scorePHQ9Screening([3, 3, 3, 3, 3, 2, 2, 1, 0]);
    expect(result.total).toBe(20);
    expect(result.severity).toBe('severe');
  });

  it('scores edge case: total = 27 (maximum)', () => {
    const result = scorePHQ9Screening([3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect(result.total).toBe(27);
    expect(result.severity).toBe('severe');
  });

  it('throws on wrong number of answers', () => {
    expect(() => scorePHQ9Screening([0, 0, 0])).toThrow();
    expect(() => scorePHQ9Screening([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])).toThrow();
  });

  it('clamps out-of-range values', () => {
    const result = scorePHQ9Screening([5, -1, 0, 0, 0, 0, 0, 0, 0]);
    expect(result.total).toBe(3); // 5→3, -1→0
  });

  it('does not include percentageScore or suggestsFullScreening', () => {
    const result = scorePHQ9Screening([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(result.percentageScore).toBeUndefined();
    expect(result.suggestsFullScreening).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// GAD-7 Screening (ScreeningResult API)
// ---------------------------------------------------------------------------

describe('scoreGAD7Screening', () => {
  it('returns minimal severity for all zeros', () => {
    const result = scoreGAD7Screening([0, 0, 0, 0, 0, 0, 0]);
    expect(result.instrument).toBe('gad7');
    expect(result.total).toBe(0);
    expect(result.severity).toBe('minimal');
    expect(result.answers).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it('scores edge case: total = 4 (upper minimal)', () => {
    const result = scoreGAD7Screening([1, 1, 1, 1, 0, 0, 0]);
    expect(result.total).toBe(4);
    expect(result.severity).toBe('minimal');
  });

  it('scores edge case: total = 5 (lower mild)', () => {
    const result = scoreGAD7Screening([1, 1, 1, 1, 1, 0, 0]);
    expect(result.total).toBe(5);
    expect(result.severity).toBe('mild');
  });

  it('scores edge case: total = 9 (upper mild)', () => {
    const result = scoreGAD7Screening([2, 2, 2, 1, 1, 1, 0]);
    expect(result.total).toBe(9);
    expect(result.severity).toBe('mild');
  });

  it('scores edge case: total = 10 (lower moderate)', () => {
    const result = scoreGAD7Screening([2, 2, 2, 2, 2, 0, 0]);
    expect(result.total).toBe(10);
    expect(result.severity).toBe('moderate');
  });

  it('scores edge case: total = 14 (upper moderate)', () => {
    const result = scoreGAD7Screening([2, 2, 2, 2, 2, 2, 2]);
    expect(result.total).toBe(14);
    expect(result.severity).toBe('moderate');
  });

  it('scores edge case: total = 15 (lower severe)', () => {
    const result = scoreGAD7Screening([3, 3, 3, 3, 3, 0, 0]);
    expect(result.total).toBe(15);
    expect(result.severity).toBe('severe');
  });

  it('scores edge case: total = 21 (maximum)', () => {
    const result = scoreGAD7Screening([3, 3, 3, 3, 3, 3, 3]);
    expect(result.total).toBe(21);
    expect(result.severity).toBe('severe');
  });

  it('throws on wrong number of answers', () => {
    expect(() => scoreGAD7Screening([0, 0, 0])).toThrow();
    expect(() => scoreGAD7Screening([0, 0, 0, 0, 0, 0, 0, 0])).toThrow();
  });

  it('clamps out-of-range values', () => {
    const result = scoreGAD7Screening([5, -1, 0, 0, 0, 0, 0]);
    expect(result.total).toBe(3); // 5→3, -1→0
  });

  it('does not include percentageScore or suggestsFullScreening', () => {
    const result = scoreGAD7Screening([0, 0, 0, 0, 0, 0, 0]);
    expect(result.percentageScore).toBeUndefined();
    expect(result.suggestsFullScreening).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// PHQ-2 (short form)
// ---------------------------------------------------------------------------

describe('scorePHQ2', () => {
  it('returns instrument phq2', () => {
    const result = scorePHQ2([0, 0]);
    expect(result.instrument).toBe('phq2');
  });

  it('scores total correctly', () => {
    expect(scorePHQ2([0, 0]).total).toBe(0);
    expect(scorePHQ2([1, 1]).total).toBe(2);
    expect(scorePHQ2([3, 3]).total).toBe(6);
  });

  it('does not suggest full screening when score < 3', () => {
    expect(scorePHQ2([0, 0]).suggestsFullScreening).toBe(false);
    expect(scorePHQ2([1, 0]).suggestsFullScreening).toBe(false);
    expect(scorePHQ2([1, 1]).suggestsFullScreening).toBe(false);
  });

  it('suggests full screening when score >= 3', () => {
    expect(scorePHQ2([2, 1]).suggestsFullScreening).toBe(true);
    expect(scorePHQ2([3, 0]).suggestsFullScreening).toBe(true);
    expect(scorePHQ2([3, 3]).suggestsFullScreening).toBe(true);
  });

  it('edge case: score = 3 suggests full screening', () => {
    expect(scorePHQ2([2, 1]).suggestsFullScreening).toBe(true);
    expect(scorePHQ2([1, 2]).suggestsFullScreening).toBe(true);
  });

  it('assigns severity band based on total (same as PHQ-9 bands)', () => {
    expect(scorePHQ2([0, 0]).severity).toBe('minimal');
    expect(scorePHQ2([1, 1]).severity).toBe('minimal');
    expect(scorePHQ2([3, 2]).severity).toBe('mild');
    expect(scorePHQ2([3, 3]).severity).toBe('mild');
  });

  it('throws on wrong number of answers', () => {
    expect(() => scorePHQ2([0])).toThrow();
    expect(() => scorePHQ2([0, 0, 0])).toThrow();
  });

  it('clamps out-of-range values', () => {
    const result = scorePHQ2([5, -1]);
    expect(result.total).toBe(3); // 5→3, -1→0
  });

  it('does not include percentageScore', () => {
    const result = scorePHQ2([0, 0]);
    expect(result.percentageScore).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// GAD-2 (short form)
// ---------------------------------------------------------------------------

describe('scoreGAD2', () => {
  it('returns instrument gad2', () => {
    const result = scoreGAD2([0, 0]);
    expect(result.instrument).toBe('gad2');
  });

  it('scores total correctly', () => {
    expect(scoreGAD2([0, 0]).total).toBe(0);
    expect(scoreGAD2([1, 1]).total).toBe(2);
    expect(scoreGAD2([3, 3]).total).toBe(6);
  });

  it('does not suggest full screening when score < 3', () => {
    expect(scoreGAD2([0, 0]).suggestsFullScreening).toBe(false);
    expect(scoreGAD2([1, 0]).suggestsFullScreening).toBe(false);
    expect(scoreGAD2([1, 1]).suggestsFullScreening).toBe(false);
  });

  it('suggests full screening when score >= 3', () => {
    expect(scoreGAD2([2, 1]).suggestsFullScreening).toBe(true);
    expect(scoreGAD2([3, 0]).suggestsFullScreening).toBe(true);
    expect(scoreGAD2([3, 3]).suggestsFullScreening).toBe(true);
  });

  it('edge case: score = 3 suggests full screening', () => {
    expect(scoreGAD2([2, 1]).suggestsFullScreening).toBe(true);
    expect(scoreGAD2([1, 2]).suggestsFullScreening).toBe(true);
  });

  it('assigns severity band based on total (same as GAD-7 bands)', () => {
    expect(scoreGAD2([0, 0]).severity).toBe('minimal');
    expect(scoreGAD2([1, 1]).severity).toBe('minimal');
    expect(scoreGAD2([3, 2]).severity).toBe('mild');
    expect(scoreGAD2([3, 3]).severity).toBe('mild');
  });

  it('throws on wrong number of answers', () => {
    expect(() => scoreGAD2([0])).toThrow();
    expect(() => scoreGAD2([0, 0, 0])).toThrow();
  });

  it('clamps out-of-range values', () => {
    const result = scoreGAD2([5, -1]);
    expect(result.total).toBe(3); // 5→3, -1→0
  });

  it('does not include percentageScore', () => {
    const result = scoreGAD2([0, 0]);
    expect(result.percentageScore).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// WHO-5 Wellbeing Index
// ---------------------------------------------------------------------------

describe('scoreWHO5', () => {
  it('returns instrument who5', () => {
    const result = scoreWHO5([0, 0, 0, 0, 0]);
    expect(result.instrument).toBe('who5');
  });

  it('scores all zeros correctly', () => {
    const result = scoreWHO5([0, 0, 0, 0, 0]);
    expect(result.total).toBe(0);
    expect(result.percentageScore).toBe(0);
  });

  it('scores maximum (all 5s) correctly', () => {
    const result = scoreWHO5([5, 5, 5, 5, 5]);
    expect(result.total).toBe(25);
    expect(result.percentageScore).toBe(100);
  });

  it('converts raw score to percentage (multiply by 4)', () => {
    const result = scoreWHO5([1, 1, 1, 1, 1]);
    expect(result.total).toBe(5);
    expect(result.percentageScore).toBe(20);

    const result2 = scoreWHO5([3, 3, 3, 3, 3]);
    expect(result2.total).toBe(15);
    expect(result2.percentageScore).toBe(60);
  });

  it('poor wellbeing when percentage <= 50', () => {
    // raw 12 = 48%
    const result = scoreWHO5([3, 3, 3, 2, 1]);
    expect(result.total).toBe(12);
    expect(result.percentageScore).toBe(48);
    expect(result.severity).toBe('mild'); // poor wellbeing maps to mild
  });

  it('edge case: percentage = 50 is poor wellbeing', () => {
    // raw 12.5 not possible, so test raw 12 (48%) and raw 13 (52%)
    // With integers, closest is raw sum = 12 → 48%, raw sum = 13 → 52%
    const below = scoreWHO5([3, 3, 2, 2, 2]);
    expect(below.total).toBe(12);
    expect(below.percentageScore).toBe(48);
    expect(below.severity).toBe('mild');

    const above = scoreWHO5([3, 3, 3, 2, 2]);
    expect(above.total).toBe(13);
    expect(above.percentageScore).toBe(52);
    expect(above.severity).toBe('minimal');
  });

  it('depression screening suggested when percentage <= 28', () => {
    // raw 7 = 28%
    const result = scoreWHO5([2, 2, 2, 1, 0]);
    expect(result.total).toBe(7);
    expect(result.percentageScore).toBe(28);
    expect(result.severity).toBe('moderate');
  });

  it('severe when percentage is very low', () => {
    // raw 0-3 → 0-12%
    const result = scoreWHO5([0, 0, 0, 0, 0]);
    expect(result.severity).toBe('severe');
  });

  it('assigns correct severity bands', () => {
    // severe: percentage 0-12 (raw 0-3)
    expect(scoreWHO5([0, 0, 0, 0, 0]).severity).toBe('severe');
    expect(scoreWHO5([1, 1, 1, 0, 0]).severity).toBe('severe');

    // moderate: percentage 13-28 (raw 4-7) — depression screening suggested
    expect(scoreWHO5([1, 1, 1, 1, 0]).severity).toBe('moderate');
    expect(scoreWHO5([2, 2, 2, 1, 0]).severity).toBe('moderate');

    // mild: percentage 29-50 (raw 8-12) — poor wellbeing
    expect(scoreWHO5([2, 2, 2, 1, 1]).severity).toBe('mild');
    expect(scoreWHO5([3, 3, 2, 2, 2]).severity).toBe('mild');

    // minimal: percentage > 50 (raw >= 13)
    expect(scoreWHO5([3, 3, 3, 2, 2]).severity).toBe('minimal');
    expect(scoreWHO5([5, 5, 5, 5, 5]).severity).toBe('minimal');
  });

  it('throws on wrong number of answers', () => {
    expect(() => scoreWHO5([0, 0, 0, 0])).toThrow();
    expect(() => scoreWHO5([0, 0, 0, 0, 0, 0])).toThrow();
  });

  it('clamps out-of-range values', () => {
    const result = scoreWHO5([7, -1, 0, 0, 0]);
    expect(result.total).toBe(5); // 7→5, -1→0
    expect(result.percentageScore).toBe(20);
  });

  it('does not include suggestsFullScreening', () => {
    const result = scoreWHO5([0, 0, 0, 0, 0]);
    expect(result.suggestsFullScreening).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Question banks
// ---------------------------------------------------------------------------

describe('PHQ9_QUESTIONS', () => {
  it('has exactly 9 questions', () => {
    expect(PHQ9_QUESTIONS).toHaveLength(9);
  });

  it('all questions have correct structure', () => {
    for (const q of PHQ9_QUESTIONS) {
      expect(q.instrument).toBe('phq9');
      expect(q.id).toMatch(/^phq9_\d+$/);
      expect(q.text).toBeTruthy();
      expect(q.options).toHaveLength(4);
      expect(q.options.map((o: { value: number }) => o.value)).toEqual([0, 1, 2, 3]);
    }
  });

  it('uses validated PHQ-9 option labels', () => {
    const labels = PHQ9_QUESTIONS[0].options.map((o: { label: string }) => o.label);
    expect(labels).toEqual([
      'Not at all',
      'Several days',
      'More than half the days',
      'Nearly every day',
    ]);
  });
});

describe('GAD7_QUESTIONS', () => {
  it('has exactly 7 questions', () => {
    expect(GAD7_QUESTIONS).toHaveLength(7);
  });

  it('all questions have correct structure', () => {
    for (const q of GAD7_QUESTIONS) {
      expect(q.instrument).toBe('gad7');
      expect(q.id).toMatch(/^gad7_\d+$/);
      expect(q.text).toBeTruthy();
      expect(q.options).toHaveLength(4);
      expect(q.options.map((o: { value: number }) => o.value)).toEqual([0, 1, 2, 3]);
    }
  });
});

describe('PHQ2_QUESTIONS', () => {
  it('has exactly 2 questions', () => {
    expect(PHQ2_QUESTIONS).toHaveLength(2);
  });

  it('questions match first 2 PHQ-9 questions', () => {
    expect(PHQ2_QUESTIONS[0].text).toBe(PHQ9_QUESTIONS[0].text);
    expect(PHQ2_QUESTIONS[1].text).toBe(PHQ9_QUESTIONS[1].text);
  });

  it('uses instrument phq2', () => {
    for (const q of PHQ2_QUESTIONS) {
      expect(q.instrument).toBe('phq2');
    }
  });
});

describe('GAD2_QUESTIONS', () => {
  it('has exactly 2 questions', () => {
    expect(GAD2_QUESTIONS).toHaveLength(2);
  });

  it('questions match first 2 GAD-7 questions', () => {
    expect(GAD2_QUESTIONS[0].text).toBe(GAD7_QUESTIONS[0].text);
    expect(GAD2_QUESTIONS[1].text).toBe(GAD7_QUESTIONS[1].text);
  });

  it('uses instrument gad2', () => {
    for (const q of GAD2_QUESTIONS) {
      expect(q.instrument).toBe('gad2');
    }
  });
});

describe('WHO5_QUESTIONS', () => {
  it('has exactly 5 questions', () => {
    expect(WHO5_QUESTIONS).toHaveLength(5);
  });

  it('all questions have correct structure', () => {
    for (const q of WHO5_QUESTIONS) {
      expect(q.instrument).toBe('who5');
      expect(q.id).toMatch(/^who5_\d+$/);
      expect(q.text).toBeTruthy();
      expect(q.options).toHaveLength(6);
      expect(q.options.map((o: { value: number }) => o.value)).toEqual([0, 1, 2, 3, 4, 5]);
    }
  });

  it('uses validated WHO-5 option labels', () => {
    const labels = WHO5_QUESTIONS[0].options.map((o: { label: string }) => o.label);
    expect(labels).toEqual([
      'At no time',
      'Some of the time',
      'Less than half of the time',
      'More than half of the time',
      'Most of the time',
      'All of the time',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Clinical disclaimer
// ---------------------------------------------------------------------------

describe('CLINICAL_DISCLAIMER', () => {
  it('is a non-empty string', () => {
    expect(typeof CLINICAL_DISCLAIMER).toBe('string');
    expect(CLINICAL_DISCLAIMER.length).toBeGreaterThan(0);
  });

  it('contains key disclaimer language', () => {
    expect(CLINICAL_DISCLAIMER).toContain('screening tool');
    expect(CLINICAL_DISCLAIMER).toContain('not a clinical diagnosis');
    expect(CLINICAL_DISCLAIMER).toContain('healthcare professional');
  });
});
