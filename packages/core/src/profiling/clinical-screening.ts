// packages/core/src/profiling/clinical-screening.ts
//
// Clinical screening scoring functions for validated instruments.
// These provide a ScreeningResult-based API on top of the underlying
// psychometric scoring (PHQ-9, GAD-7) and add PHQ-2, GAD-2, and WHO-5.

import { PHQ9_ITEMS, GAD7_ITEMS } from './instruments';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SeverityLevel = 'minimal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe';

export interface ScreeningResult {
  instrument: 'phq9' | 'gad7' | 'phq2' | 'gad2' | 'who5';
  answers: number[];
  total: number;
  severity: SeverityLevel;
  percentageScore?: number;        // WHO-5 only
  suggestsFullScreening?: boolean;  // PHQ-2/GAD-2 only
}

export interface ScreeningQuestion {
  id: string;
  text: string;
  instrument: string;
  options: { value: number; label: string }[];
}

// ---------------------------------------------------------------------------
// Disclaimer
// ---------------------------------------------------------------------------

export const CLINICAL_DISCLAIMER =
  'This is a screening tool, not a clinical diagnosis. Please consult a healthcare professional for proper evaluation.';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ---------------------------------------------------------------------------
// Response option sets
// ---------------------------------------------------------------------------

const PHQ_GAD_OPTIONS: ScreeningQuestion['options'] = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' },
];

const WHO5_OPTIONS: ScreeningQuestion['options'] = [
  { value: 0, label: 'At no time' },
  { value: 1, label: 'Some of the time' },
  { value: 2, label: 'Less than half of the time' },
  { value: 3, label: 'More than half of the time' },
  { value: 4, label: 'Most of the time' },
  { value: 5, label: 'All of the time' },
];

// ---------------------------------------------------------------------------
// PHQ-9 severity classification
// ---------------------------------------------------------------------------

function phq9Severity(total: number): SeverityLevel {
  if (total <= 4) return 'minimal';
  if (total <= 9) return 'mild';
  if (total <= 14) return 'moderate';
  if (total <= 19) return 'moderately_severe';
  return 'severe';
}

// ---------------------------------------------------------------------------
// GAD-7 severity classification
// ---------------------------------------------------------------------------

function gad7Severity(total: number): SeverityLevel {
  if (total <= 4) return 'minimal';
  if (total <= 9) return 'mild';
  if (total <= 14) return 'moderate';
  return 'severe';
}

// ---------------------------------------------------------------------------
// WHO-5 severity classification
// Percentage thresholds:
//   > 50  → minimal (good wellbeing)
//   29-50 → mild (poor wellbeing)
//   13-28 → moderate (suggests depression screening)
//   0-12  → severe (very low wellbeing)
// ---------------------------------------------------------------------------

function who5Severity(percentage: number): SeverityLevel {
  if (percentage > 50) return 'minimal';
  if (percentage > 28) return 'mild';
  if (percentage > 12) return 'moderate';
  return 'severe';
}

// ---------------------------------------------------------------------------
// PHQ-9 Screening (array-based API)
// ---------------------------------------------------------------------------

export function scorePHQ9Screening(answers: number[]): ScreeningResult {
  if (answers.length !== 9) {
    throw new Error(`PHQ-9 requires exactly 9 answers, got ${answers.length}`);
  }
  const clamped = answers.map((v) => clamp(v, 0, 3));
  const total = clamped.reduce((sum, v) => sum + v, 0);

  return {
    instrument: 'phq9',
    answers: clamped,
    total,
    severity: phq9Severity(total),
  };
}

// ---------------------------------------------------------------------------
// GAD-7 Screening (array-based API)
// ---------------------------------------------------------------------------

export function scoreGAD7Screening(answers: number[]): ScreeningResult {
  if (answers.length !== 7) {
    throw new Error(`GAD-7 requires exactly 7 answers, got ${answers.length}`);
  }
  const clamped = answers.map((v) => clamp(v, 0, 3));
  const total = clamped.reduce((sum, v) => sum + v, 0);

  return {
    instrument: 'gad7',
    answers: clamped,
    total,
    severity: gad7Severity(total),
  };
}

// ---------------------------------------------------------------------------
// PHQ-2 (short form: first 2 items of PHQ-9)
// Score >= 3 suggests need for full PHQ-9 screening
// ---------------------------------------------------------------------------

export function scorePHQ2(answers: number[]): ScreeningResult {
  if (answers.length !== 2) {
    throw new Error(`PHQ-2 requires exactly 2 answers, got ${answers.length}`);
  }
  const clamped = answers.map((v) => clamp(v, 0, 3));
  const total = clamped.reduce((sum, v) => sum + v, 0);

  return {
    instrument: 'phq2',
    answers: clamped,
    total,
    severity: phq9Severity(total),
    suggestsFullScreening: total >= 3,
  };
}

// ---------------------------------------------------------------------------
// GAD-2 (short form: first 2 items of GAD-7)
// Score >= 3 suggests need for full GAD-7 screening
// ---------------------------------------------------------------------------

export function scoreGAD2(answers: number[]): ScreeningResult {
  if (answers.length !== 2) {
    throw new Error(`GAD-2 requires exactly 2 answers, got ${answers.length}`);
  }
  const clamped = answers.map((v) => clamp(v, 0, 3));
  const total = clamped.reduce((sum, v) => sum + v, 0);

  return {
    instrument: 'gad2',
    answers: clamped,
    total,
    severity: gad7Severity(total),
    suggestsFullScreening: total >= 3,
  };
}

// ---------------------------------------------------------------------------
// WHO-5 Wellbeing Index (WHO, 1998)
// 5 questions, 0-5 scale. Raw score 0-25, percentage = raw * 4 (0-100).
// ---------------------------------------------------------------------------

export function scoreWHO5(answers: number[]): ScreeningResult {
  if (answers.length !== 5) {
    throw new Error(`WHO-5 requires exactly 5 answers, got ${answers.length}`);
  }
  const clamped = answers.map((v) => clamp(v, 0, 5));
  const total = clamped.reduce((sum, v) => sum + v, 0);
  const percentageScore = total * 4;

  return {
    instrument: 'who5',
    answers: clamped,
    total,
    severity: who5Severity(percentageScore),
    percentageScore,
  };
}

// ---------------------------------------------------------------------------
// Question Banks
// ---------------------------------------------------------------------------

export const PHQ9_QUESTIONS: ScreeningQuestion[] = PHQ9_ITEMS.map((item) => ({
  id: item.id,
  text: item.text,
  instrument: 'phq9',
  options: [...PHQ_GAD_OPTIONS],
}));

export const GAD7_QUESTIONS: ScreeningQuestion[] = GAD7_ITEMS.map((item) => ({
  id: item.id,
  text: item.text,
  instrument: 'gad7',
  options: [...PHQ_GAD_OPTIONS],
}));

export const PHQ2_QUESTIONS: ScreeningQuestion[] = PHQ9_ITEMS.slice(0, 2).map((item) => ({
  id: item.id.replace('phq9', 'phq2'),
  text: item.text,
  instrument: 'phq2',
  options: [...PHQ_GAD_OPTIONS],
}));

export const GAD2_QUESTIONS: ScreeningQuestion[] = GAD7_ITEMS.slice(0, 2).map((item) => ({
  id: item.id.replace('gad7', 'gad2'),
  text: item.text,
  instrument: 'gad2',
  options: [...PHQ_GAD_OPTIONS],
}));

// WHO-5 validated question texts (WHO, 1998 — English version)
export const WHO5_QUESTIONS: ScreeningQuestion[] = [
  {
    id: 'who5_1',
    text: 'I have felt cheerful and in good spirits',
    instrument: 'who5',
    options: [...WHO5_OPTIONS],
  },
  {
    id: 'who5_2',
    text: 'I have felt calm and relaxed',
    instrument: 'who5',
    options: [...WHO5_OPTIONS],
  },
  {
    id: 'who5_3',
    text: 'I have felt active and vigorous',
    instrument: 'who5',
    options: [...WHO5_OPTIONS],
  },
  {
    id: 'who5_4',
    text: 'I woke up feeling fresh and rested',
    instrument: 'who5',
    options: [...WHO5_OPTIONS],
  },
  {
    id: 'who5_5',
    text: 'My daily life has been filled with things that interest me',
    instrument: 'who5',
    options: [...WHO5_OPTIONS],
  },
];
