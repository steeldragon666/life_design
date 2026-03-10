import { describe, it, expect } from 'vitest';
import {
  validateScore,
  validateMood,
  validateDate,
  validateCheckIn,
  validateDimensionScores,
} from '../validation';
import { Dimension, DurationType, ALL_DIMENSIONS } from '../enums';

describe('validateScore', () => {
  it('accepts scores 1 through 10', () => {
    for (let i = 1; i <= 10; i++) {
      expect(validateScore(i).valid).toBe(true);
    }
  });

  it('rejects score below 1', () => {
    const result = validateScore(0);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects score above 10', () => {
    const result = validateScore(11);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects non-integer scores', () => {
    const result = validateScore(5.5);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects NaN', () => {
    const result = validateScore(NaN);
    expect(result.valid).toBe(false);
  });
});

describe('validateMood', () => {
  it('accepts moods 1 through 10', () => {
    for (let i = 1; i <= 10; i++) {
      expect(validateMood(i).valid).toBe(true);
    }
  });

  it('rejects mood below 1', () => {
    const result = validateMood(0);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects mood above 10', () => {
    const result = validateMood(11);
    expect(result.valid).toBe(false);
  });

  it('rejects non-integer mood', () => {
    const result = validateMood(7.3);
    expect(result.valid).toBe(false);
  });
});

describe('validateDate', () => {
  it('accepts valid YYYY-MM-DD date', () => {
    expect(validateDate('2025-01-15').valid).toBe(true);
    expect(validateDate('2025-12-31').valid).toBe(true);
  });

  it('rejects empty string', () => {
    const result = validateDate('');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects invalid format', () => {
    expect(validateDate('01-15-2025').valid).toBe(false);
    expect(validateDate('2025/01/15').valid).toBe(false);
    expect(validateDate('not-a-date').valid).toBe(false);
  });

  it('rejects invalid calendar dates', () => {
    expect(validateDate('2025-13-01').valid).toBe(false);
    expect(validateDate('2025-02-30').valid).toBe(false);
  });
});

describe('validateCheckIn', () => {
  const validCheckIn = {
    user_id: 'uuid-123',
    date: '2025-01-15',
    mood: 7,
    duration_type: DurationType.Quick,
  };

  it('accepts a valid check-in', () => {
    expect(validateCheckIn(validCheckIn).valid).toBe(true);
  });

  it('rejects missing user_id', () => {
    const result = validateCheckIn({ ...validCheckIn, user_id: '' });
    expect(result.valid).toBe(false);
  });

  it('rejects invalid date', () => {
    const result = validateCheckIn({ ...validCheckIn, date: 'bad' });
    expect(result.valid).toBe(false);
  });

  it('rejects invalid mood', () => {
    const result = validateCheckIn({ ...validCheckIn, mood: 15 });
    expect(result.valid).toBe(false);
  });

  it('rejects invalid duration_type', () => {
    const result = validateCheckIn({ ...validCheckIn, duration_type: 'invalid' as DurationType });
    expect(result.valid).toBe(false);
  });
});

describe('validateDimensionScores', () => {
  it('accepts valid scores for all 8 dimensions', () => {
    const scores = ALL_DIMENSIONS.map((dim) => ({ dimension: dim, score: 5 }));
    expect(validateDimensionScores(scores).valid).toBe(true);
  });

  it('accepts a subset of dimensions (quick mode)', () => {
    const scores = [
      { dimension: Dimension.Health, score: 7 },
      { dimension: Dimension.Career, score: 6 },
    ];
    expect(validateDimensionScores(scores).valid).toBe(true);
  });

  it('rejects duplicate dimensions', () => {
    const scores = [
      { dimension: Dimension.Health, score: 7 },
      { dimension: Dimension.Health, score: 8 },
    ];
    const result = validateDimensionScores(scores);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('duplicate');
  });

  it('rejects invalid score in dimension scores', () => {
    const scores = [{ dimension: Dimension.Health, score: 11 }];
    const result = validateDimensionScores(scores);
    expect(result.valid).toBe(false);
  });

  it('rejects empty array', () => {
    const result = validateDimensionScores([]);
    expect(result.valid).toBe(false);
  });
});
