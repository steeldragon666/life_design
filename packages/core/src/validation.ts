import { Dimension, DurationType, GoalHorizon, GoalTrackingType } from './enums';

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
  if (score < 1 || score > 5) {
    return { valid: false, error: 'Score must be between 1 and 5' };
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

// ── Goal & Profile Validation ──

export function validateGoal(input: {
  title: string;
  horizon: GoalHorizon;
  trackingType: GoalTrackingType;
  targetDate: string;
  dimensions: string[];
}): ValidationResult {
  if (!input.title || input.title.trim().length === 0) {
    return { valid: false, error: 'Title is required' };
  }
  if (input.title.length > 200) {
    return { valid: false, error: 'Title must be 200 characters or fewer' };
  }
  if (!Object.values(GoalHorizon).includes(input.horizon)) {
    return { valid: false, error: 'Invalid goal horizon' };
  }
  if (!Object.values(GoalTrackingType).includes(input.trackingType)) {
    return { valid: false, error: 'Invalid tracking type' };
  }
  const dateResult = validateDate(input.targetDate);
  if (!dateResult.valid) return dateResult;

  if (!input.dimensions || input.dimensions.length === 0) {
    return { valid: false, error: 'At least one dimension is required' };
  }
  if (input.dimensions.length > 3) {
    return { valid: false, error: 'A goal can map to at most 3 dimensions' };
  }
  return { valid: true };
}

export function validateMilestone(input: { title: string }): ValidationResult {
  if (!input.title || input.title.trim().length === 0) {
    return { valid: false, error: 'Milestone title is required' };
  }
  if (input.title.length > 200) {
    return { valid: false, error: 'Milestone title must be 200 characters or fewer' };
  }
  return { valid: true };
}

export function validateProgress(input: { metricValue?: number | null }): ValidationResult {
  if (input.metricValue != null && input.metricValue < 0) {
    return { valid: false, error: 'Metric value must be >= 0' };
  }
  return { valid: true };
}

export function validateUserProfile(input: {
  profession?: string | null;
  interests?: string[];
  projects?: string[];
  hobbies?: string[];
  skills?: string[];
}): ValidationResult {
  if (input.profession && input.profession.length > 200) {
    return { valid: false, error: 'Profession must be 200 characters or fewer' };
  }
  if (input.interests && input.interests.length > 20) {
    return { valid: false, error: 'Maximum 20 interests allowed' };
  }
  if (input.projects && input.projects.length > 20) {
    return { valid: false, error: 'Maximum 20 projects allowed' };
  }
  if (input.hobbies && input.hobbies.length > 20) {
    return { valid: false, error: 'Maximum 20 hobbies allowed' };
  }
  if (input.skills && input.skills.length > 20) {
    return { valid: false, error: 'Maximum 20 skills allowed' };
  }
  return { valid: true };
}
