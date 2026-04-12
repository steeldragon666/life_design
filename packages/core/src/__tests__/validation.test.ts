import { describe, it, expect } from 'vitest';
import {
  validateScore,
  validateMood,
  validateDate,
  validateCheckIn,
  validateDimensionScores,
  validateGoal,
  validateMilestone,
  validateProgress,
  validateUserProfile,
} from '../validation';
import { Dimension, DurationType, GoalHorizon, GoalTrackingType, ALL_DIMENSIONS } from '../enums';

describe('validateScore', () => {
  it('accepts scores 1 through 5', () => {
    for (let i = 1; i <= 5; i++) {
      expect(validateScore(i).valid).toBe(true);
    }
  });

  it('rejects score below 1', () => {
    const result = validateScore(0);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects score above 5', () => {
    const result = validateScore(6);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('between 1 and 5');
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
  it('accepts moods 1 through 5', () => {
    for (let i = 1; i <= 5; i++) {
      expect(validateMood(i).valid).toBe(true);
    }
  });

  it('rejects mood below 1', () => {
    const result = validateMood(0);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects mood above 5', () => {
    const result = validateMood(6);
    expect(result.valid).toBe(false);
  });

  it('rejects non-integer mood', () => {
    const result = validateMood(4.3);
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
    mood: 4,
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
      { dimension: Dimension.Health, score: 4 },
      { dimension: Dimension.Career, score: 3 },
    ];
    expect(validateDimensionScores(scores).valid).toBe(true);
  });

  it('rejects duplicate dimensions', () => {
    const scores = [
      { dimension: Dimension.Health, score: 4 },
      { dimension: Dimension.Health, score: 5 },
    ];
    const result = validateDimensionScores(scores);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('duplicate');
  });

  it('rejects invalid score in dimension scores', () => {
    const scores = [{ dimension: Dimension.Health, score: 6 }];
    const result = validateDimensionScores(scores);
    expect(result.valid).toBe(false);
  });

  it('rejects empty array', () => {
    const result = validateDimensionScores([]);
    expect(result.valid).toBe(false);
  });
});

describe('validateGoal', () => {
  const validGoal = {
    title: 'Learn Spanish',
    horizon: GoalHorizon.Medium,
    trackingType: GoalTrackingType.Milestone,
    targetDate: '2027-06-01',
    dimensions: ['growth', 'social'],
  };

  it('accepts a valid goal', () => {
    expect(validateGoal(validGoal).valid).toBe(true);
  });

  it('rejects empty title', () => {
    expect(validateGoal({ ...validGoal, title: '' }).valid).toBe(false);
  });

  it('rejects title over 200 chars', () => {
    expect(validateGoal({ ...validGoal, title: 'x'.repeat(201) }).valid).toBe(false);
  });

  it('rejects invalid horizon', () => {
    expect(validateGoal({ ...validGoal, horizon: 'forever' as GoalHorizon }).valid).toBe(false);
  });

  it('rejects invalid tracking type', () => {
    expect(validateGoal({ ...validGoal, trackingType: 'magic' as GoalTrackingType }).valid).toBe(false);
  });

  it('rejects invalid target date', () => {
    expect(validateGoal({ ...validGoal, targetDate: 'not-a-date' }).valid).toBe(false);
  });

  it('rejects empty dimensions', () => {
    expect(validateGoal({ ...validGoal, dimensions: [] }).valid).toBe(false);
  });

  it('rejects more than 3 dimensions', () => {
    expect(validateGoal({ ...validGoal, dimensions: ['a', 'b', 'c', 'd'] }).valid).toBe(false);
  });

  it('accepts 1-3 dimensions', () => {
    expect(validateGoal({ ...validGoal, dimensions: ['career'] }).valid).toBe(true);
    expect(validateGoal({ ...validGoal, dimensions: ['career', 'finance', 'growth'] }).valid).toBe(true);
  });
});

describe('validateMilestone', () => {
  it('accepts a valid milestone', () => {
    expect(validateMilestone({ title: 'Complete A1 level' }).valid).toBe(true);
  });

  it('rejects empty title', () => {
    expect(validateMilestone({ title: '' }).valid).toBe(false);
  });

  it('rejects title over 200 chars', () => {
    expect(validateMilestone({ title: 'x'.repeat(201) }).valid).toBe(false);
  });
});

describe('validateProgress', () => {
  it('accepts valid metric value', () => {
    expect(validateProgress({ metricValue: 100 }).valid).toBe(true);
  });

  it('accepts zero', () => {
    expect(validateProgress({ metricValue: 0 }).valid).toBe(true);
  });

  it('accepts null/undefined', () => {
    expect(validateProgress({ metricValue: null }).valid).toBe(true);
    expect(validateProgress({}).valid).toBe(true);
  });

  it('rejects negative metric value', () => {
    expect(validateProgress({ metricValue: -1 }).valid).toBe(false);
  });
});

describe('validateUserProfile', () => {
  it('accepts valid profile', () => {
    expect(validateUserProfile({
      profession: 'Engineer',
      interests: ['AI'],
      projects: ['App'],
      hobbies: ['Guitar'],
      skills: ['TypeScript'],
    }).valid).toBe(true);
  });

  it('accepts empty/null fields', () => {
    expect(validateUserProfile({}).valid).toBe(true);
    expect(validateUserProfile({ profession: null }).valid).toBe(true);
  });

  it('rejects profession over 200 chars', () => {
    expect(validateUserProfile({ profession: 'x'.repeat(201) }).valid).toBe(false);
  });

  it('rejects more than 20 items in any array', () => {
    const tooMany = Array.from({ length: 21 }, (_, i) => `item-${i}`);
    expect(validateUserProfile({ interests: tooMany }).valid).toBe(false);
    expect(validateUserProfile({ projects: tooMany }).valid).toBe(false);
    expect(validateUserProfile({ hobbies: tooMany }).valid).toBe(false);
    expect(validateUserProfile({ skills: tooMany }).valid).toBe(false);
  });
});
