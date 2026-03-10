import { Dimension, DurationType } from './enums';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateScore(score: number): ValidationResult {
  if (!Number.isFinite(score)) {
    return { valid: false, error: 'Score must be a finite number' };
  }
  if (!Number.isInteger(score)) {
    return { valid: false, error: 'Score must be an integer' };
  }
  if (score < 1 || score > 10) {
    return { valid: false, error: 'Score must be between 1 and 10' };
  }
  return { valid: true };
}

export function validateMood(mood: number): ValidationResult {
  return validateScore(mood);
}

export function validateDate(date: string): ValidationResult {
  if (!date) {
    return { valid: false, error: 'Date is required' };
  }
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return { valid: false, error: 'Date must be in YYYY-MM-DD format' };
  }
  const [, yearStr, monthStr, dayStr] = match;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return { valid: false, error: 'Invalid calendar date' };
  }
  return { valid: true };
}

export function validateCheckIn(input: {
  user_id: string;
  date: string;
  mood: number;
  duration_type: DurationType;
}): ValidationResult {
  if (!input.user_id) {
    return { valid: false, error: 'user_id is required' };
  }
  const dateResult = validateDate(input.date);
  if (!dateResult.valid) return dateResult;

  const moodResult = validateMood(input.mood);
  if (!moodResult.valid) return moodResult;

  if (!Object.values(DurationType).includes(input.duration_type)) {
    return { valid: false, error: 'Invalid duration_type' };
  }

  return { valid: true };
}

export function validateDimensionScores(
  scores: { dimension: Dimension; score: number }[],
): ValidationResult {
  if (scores.length === 0) {
    return { valid: false, error: 'At least one dimension score is required' };
  }

  const seen = new Set<Dimension>();
  for (const entry of scores) {
    if (seen.has(entry.dimension)) {
      return { valid: false, error: `Found duplicate dimension: ${entry.dimension}` };
    }
    seen.add(entry.dimension);

    const scoreResult = validateScore(entry.score);
    if (!scoreResult.valid) return scoreResult;
  }

  return { valid: true };
}
