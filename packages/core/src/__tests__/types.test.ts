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
} from '../enums';
import type {
  User,
  CheckIn,
  DimensionScore,
  Mentor,
  UserMentor,
  MentorMessage,
  Insight,
  Integration,
  IntegrationMetric,
  UserProfile,
  Goal,
  GoalMilestone,
  GoalProgress,
  Pathway,
  PathwayStep,
  DimensionImpact,
} from '../types';

describe('Type contracts', () => {
  it('User has required fields', () => {
    const user: User = {
      id: 'uuid-123',
      email: 'test@example.com',
      display_name: 'Test User',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };
    expect(user.id).toBe('uuid-123');
    expect(user.email).toBe('test@example.com');
    expect(user.display_name).toBe('Test User');
  });

  it('CheckIn has required fields', () => {
    const checkin: CheckIn = {
      id: 'checkin-1',
      user_id: 'uuid-123',
      date: '2025-01-15',
      mood: 7,
      duration_type: DurationType.Quick,
      journal_entry: null,
      created_at: '2025-01-15T08:00:00Z',
      updated_at: '2025-01-15T08:00:00Z',
    };
    expect(checkin.mood).toBe(7);
    expect(checkin.duration_type).toBe(DurationType.Quick);
    expect(checkin.journal_entry).toBeNull();
  });

  it('DimensionScore has required fields', () => {
    const score: DimensionScore = {
      id: 'score-1',
      checkin_id: 'checkin-1',
      dimension: Dimension.Health,
      score: 8,
      note: 'Feeling great after workout',
    };
    expect(score.dimension).toBe(Dimension.Health);
    expect(score.score).toBe(8);
    expect(score.note).toBe('Feeling great after workout');
  });

  it('DimensionScore note is optional', () => {
    const score: DimensionScore = {
      id: 'score-2',
      checkin_id: 'checkin-1',
      dimension: Dimension.Finance,
      score: 5,
    };
    expect(score.note).toBeUndefined();
  });

  it('Mentor has required fields', () => {
    const mentor: Mentor = {
      id: 'mentor-1',
      name: 'The Stoic',
      type: MentorType.Stoic,
      description: 'Ancient wisdom for modern life',
      system_prompt: 'You are a Stoic philosopher...',
      avatar_url: null,
      created_at: '2025-01-01T00:00:00Z',
    };
    expect(mentor.type).toBe(MentorType.Stoic);
  });

  it('UserMentor tracks the user-mentor relationship', () => {
    const userMentor: UserMentor = {
      id: 'um-1',
      user_id: 'uuid-123',
      mentor_id: 'mentor-1',
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
    };
    expect(userMentor.is_active).toBe(true);
  });

  it('MentorMessage has role and content', () => {
    const msg: MentorMessage = {
      id: 'msg-1',
      user_mentor_id: 'um-1',
      role: 'user',
      content: 'How do I handle stress?',
      created_at: '2025-01-15T09:00:00Z',
    };
    expect(msg.role).toBe('user');
    expect(msg.content).toBe('How do I handle stress?');
  });

  it('Insight has required fields', () => {
    const insight: Insight = {
      id: 'insight-1',
      user_id: 'uuid-123',
      type: InsightType.Trend,
      title: 'Health improving',
      body: 'Your health scores have been trending upward.',
      dimension: Dimension.Health,
      generated_at: '2025-01-15T00:00:00Z',
      dismissed: false,
    };
    expect(insight.type).toBe(InsightType.Trend);
    expect(insight.dismissed).toBe(false);
  });

  it('Integration tracks external service connections', () => {
    const integration: Integration = {
      id: 'int-1',
      user_id: 'uuid-123',
      provider: IntegrationProvider.Strava,
      status: IntegrationStatus.Connected,
      access_token_encrypted: 'encrypted-token',
      refresh_token_encrypted: 'encrypted-refresh',
      token_expires_at: '2025-02-01T00:00:00Z',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };
    expect(integration.provider).toBe(IntegrationProvider.Strava);
    expect(integration.status).toBe(IntegrationStatus.Connected);
  });

  it('IntegrationMetric stores synced data', () => {
    const metric: IntegrationMetric = {
      id: 'im-1',
      integration_id: 'int-1',
      dimension: Dimension.Fitness,
      metric_name: 'weekly_distance_km',
      metric_value: 42.5,
      recorded_at: '2025-01-15T00:00:00Z',
    };
    expect(metric.dimension).toBe(Dimension.Fitness);
    expect(metric.metric_value).toBe(42.5);
  });
});

describe('Goal Setting type contracts', () => {
  it('UserProfile has required fields', () => {
    const profile: UserProfile = {
      userId: 'uuid-123',
      profession: 'Software Engineer',
      interests: ['AI', 'music'],
      projects: ['Life Design App'],
      hobbies: ['guitar', 'hiking'],
      skills: ['TypeScript', 'React'],
      postcode: 'SW1A 1AA',
    };
    expect(profile.userId).toBe('uuid-123');
    expect(profile.profession).toBe('Software Engineer');
    expect(profile.interests).toHaveLength(2);
    expect(profile.postcode).toBe('SW1A 1AA');
  });

  it('UserProfile allows null profession and postcode', () => {
    const profile: UserProfile = {
      userId: 'uuid-123',
      profession: null,
      interests: [],
      projects: [],
      hobbies: [],
      skills: [],
      postcode: null,
    };
    expect(profile.profession).toBeNull();
    expect(profile.postcode).toBeNull();
  });

  it('Goal has required fields', () => {
    const goal: Goal = {
      id: 'goal-1',
      userId: 'uuid-123',
      title: 'Learn Spanish',
      description: 'Become conversational in Spanish',
      horizon: GoalHorizon.Medium,
      status: GoalStatus.Active,
      trackingType: GoalTrackingType.Milestone,
      targetDate: '2027-06-01',
      metricTarget: null,
      metricCurrent: null,
      metricUnit: null,
      dimensions: ['growth', 'social'],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    expect(goal.horizon).toBe(GoalHorizon.Medium);
    expect(goal.status).toBe(GoalStatus.Active);
    expect(goal.trackingType).toBe(GoalTrackingType.Milestone);
    expect(goal.dimensions).toHaveLength(2);
  });

  it('Goal supports metric tracking', () => {
    const goal: Goal = {
      id: 'goal-2',
      userId: 'uuid-123',
      title: 'Save £10,000',
      description: 'Emergency fund',
      horizon: GoalHorizon.Short,
      status: GoalStatus.Active,
      trackingType: GoalTrackingType.Metric,
      targetDate: '2026-12-31',
      metricTarget: 10000,
      metricCurrent: 2500,
      metricUnit: 'GBP',
      dimensions: ['finance'],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-03-01T00:00:00Z',
    };
    expect(goal.metricTarget).toBe(10000);
    expect(goal.metricCurrent).toBe(2500);
    expect(goal.metricUnit).toBe('GBP');
  });

  it('GoalMilestone has required fields', () => {
    const milestone: GoalMilestone = {
      id: 'ms-1',
      goalId: 'goal-1',
      title: 'Complete A1 level',
      position: 0,
      completed: false,
      completedAt: null,
    };
    expect(milestone.goalId).toBe('goal-1');
    expect(milestone.completed).toBe(false);
    expect(milestone.completedAt).toBeNull();
  });

  it('GoalProgress tracks metric over time', () => {
    const progress: GoalProgress = {
      id: 'prog-1',
      goalId: 'goal-2',
      metricValue: 3000,
      note: 'Tax refund deposited',
      recordedAt: '2026-03-15T00:00:00Z',
    };
    expect(progress.metricValue).toBe(3000);
    expect(progress.note).toBe('Tax refund deposited');
  });

  it('Pathway has steps and dimension impacts', () => {
    const step: PathwayStep = {
      id: 'step-1',
      pathwayId: 'pw-1',
      title: 'Enroll in online course',
      description: 'Find a structured Spanish course',
      position: 0,
      completed: false,
    };

    const impact: DimensionImpact = {
      dimension: 'growth',
      impact: 4,
      explanation: 'Learning a new language directly boosts personal growth',
    };

    const pathway: Pathway = {
      id: 'pw-1',
      goalId: 'goal-1',
      title: 'Structured Learning Path',
      description: 'A step-by-step approach to learning Spanish',
      steps: [step],
      dimensionImpacts: [impact],
      aiGenerated: true,
      createdAt: '2026-01-01T00:00:00Z',
    };
    expect(pathway.steps).toHaveLength(1);
    expect(pathway.dimensionImpacts).toHaveLength(1);
    expect(pathway.aiGenerated).toBe(true);
  });

  it('DimensionImpact supports negative impacts', () => {
    const impact: DimensionImpact = {
      dimension: 'social',
      impact: -2,
      explanation: 'Study time may reduce social activities',
    };
    expect(impact.impact).toBe(-2);
  });
});
