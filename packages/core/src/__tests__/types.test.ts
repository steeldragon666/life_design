import { describe, it, expect } from 'vitest';
import { Dimension, MentorType, DurationType, InsightType, IntegrationProvider, IntegrationStatus } from '../enums';
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
