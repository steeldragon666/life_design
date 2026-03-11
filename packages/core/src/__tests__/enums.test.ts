import { describe, it, expect } from 'vitest';
import {
  Dimension,
  MentorType,
  DurationType,
  InsightType,
  IntegrationProvider,
  IntegrationStatus,
  GoalHorizon,
  GoalStatus,
  GoalTrackingType,
  ALL_DIMENSIONS,
  DIMENSION_LABELS,
  GOAL_HORIZON_LABELS,
} from '../enums';

describe('Dimension', () => {
  it('has exactly 8 dimensions', () => {
    const values = Object.values(Dimension);
    expect(values).toHaveLength(8);
  });

  it('contains all expected dimensions', () => {
    expect(Dimension.Career).toBe('career');
    expect(Dimension.Finance).toBe('finance');
    expect(Dimension.Health).toBe('health');
    expect(Dimension.Fitness).toBe('fitness');
    expect(Dimension.Family).toBe('family');
    expect(Dimension.Social).toBe('social');
    expect(Dimension.Romance).toBe('romance');
    expect(Dimension.Growth).toBe('growth');
  });
});

describe('ALL_DIMENSIONS', () => {
  it('is an array of all 8 dimension values', () => {
    expect(ALL_DIMENSIONS).toHaveLength(8);
    expect(ALL_DIMENSIONS).toContain(Dimension.Career);
    expect(ALL_DIMENSIONS).toContain(Dimension.Finance);
    expect(ALL_DIMENSIONS).toContain(Dimension.Health);
    expect(ALL_DIMENSIONS).toContain(Dimension.Fitness);
    expect(ALL_DIMENSIONS).toContain(Dimension.Family);
    expect(ALL_DIMENSIONS).toContain(Dimension.Social);
    expect(ALL_DIMENSIONS).toContain(Dimension.Romance);
    expect(ALL_DIMENSIONS).toContain(Dimension.Growth);
  });
});

describe('DIMENSION_LABELS', () => {
  it('has a human-readable label for each dimension', () => {
    for (const dim of ALL_DIMENSIONS) {
      expect(DIMENSION_LABELS[dim]).toBeDefined();
      expect(typeof DIMENSION_LABELS[dim]).toBe('string');
      expect(DIMENSION_LABELS[dim].length).toBeGreaterThan(0);
    }
  });
});

describe('MentorType', () => {
  it('has Stoic, Coach, and Scientist types', () => {
    expect(MentorType.Stoic).toBe('stoic');
    expect(MentorType.Coach).toBe('coach');
    expect(MentorType.Scientist).toBe('scientist');
  });
});

describe('DurationType', () => {
  it('has Quick and Deep types', () => {
    expect(DurationType.Quick).toBe('quick');
    expect(DurationType.Deep).toBe('deep');
  });
});

describe('InsightType', () => {
  it('has Trend, Correlation, and Suggestion types', () => {
    expect(InsightType.Trend).toBe('trend');
    expect(InsightType.Correlation).toBe('correlation');
    expect(InsightType.Suggestion).toBe('suggestion');
  });
});

describe('GoalHorizon', () => {
  it('has Short, Medium, and Long horizons', () => {
    expect(GoalHorizon.Short).toBe('short');
    expect(GoalHorizon.Medium).toBe('medium');
    expect(GoalHorizon.Long).toBe('long');
  });

  it('has exactly 3 values', () => {
    expect(Object.values(GoalHorizon)).toHaveLength(3);
  });
});

describe('GOAL_HORIZON_LABELS', () => {
  it('has a label for each horizon', () => {
    for (const horizon of Object.values(GoalHorizon)) {
      expect(GOAL_HORIZON_LABELS[horizon]).toBeDefined();
      expect(typeof GOAL_HORIZON_LABELS[horizon]).toBe('string');
    }
  });
});

describe('GoalStatus', () => {
  it('has Active, Completed, Paused, and Abandoned statuses', () => {
    expect(GoalStatus.Active).toBe('active');
    expect(GoalStatus.Completed).toBe('completed');
    expect(GoalStatus.Paused).toBe('paused');
    expect(GoalStatus.Abandoned).toBe('abandoned');
  });

  it('has exactly 4 values', () => {
    expect(Object.values(GoalStatus)).toHaveLength(4);
  });
});

describe('GoalTrackingType', () => {
  it('has Milestone and Metric types', () => {
    expect(GoalTrackingType.Milestone).toBe('milestone');
    expect(GoalTrackingType.Metric).toBe('metric');
  });

  it('has exactly 2 values', () => {
    expect(Object.values(GoalTrackingType)).toHaveLength(2);
  });
});

describe('IntegrationProvider', () => {
  it('has all expected providers', () => {
    expect(IntegrationProvider.Strava).toBe('strava');
    expect(IntegrationProvider.GoogleCalendar).toBe('google_calendar');
    expect(IntegrationProvider.Gmail).toBe('gmail');
    expect(IntegrationProvider.Slack).toBe('slack');
    expect(IntegrationProvider.Instagram).toBe('instagram');
    expect(IntegrationProvider.Weather).toBe('weather');
  });
});

describe('IntegrationStatus', () => {
  it('has Connected, Disconnected, and Error statuses', () => {
    expect(IntegrationStatus.Connected).toBe('connected');
    expect(IntegrationStatus.Disconnected).toBe('disconnected');
    expect(IntegrationStatus.Error).toBe('error');
  });
});
