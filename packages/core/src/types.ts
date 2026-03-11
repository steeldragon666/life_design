import {
  Dimension,
  DurationType,
  GoalHorizon,
  GoalStatus,
  GoalTrackingType,
  InsightType,
  IntegrationProvider,
  IntegrationStatus,
  MentorType,
} from './enums';

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CheckIn {
  id: string;
  user_id: string;
  date: string;
  mood: number;
  duration_type: DurationType;
  journal_entry: string | null;
  created_at: string;
  updated_at: string;
}

export interface DimensionScore {
  id: string;
  checkin_id: string;
  dimension: Dimension;
  score: number;
  note?: string;
}

export interface Mentor {
  id: string;
  name: string;
  type: MentorType;
  description: string;
  system_prompt: string;
  avatar_url: string | null;
  created_at: string;
}

export interface UserMentor {
  id: string;
  user_id: string;
  mentor_id: string;
  is_active: boolean;
  created_at: string;
}

export interface MentorMessage {
  id: string;
  user_mentor_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Insight {
  id: string;
  user_id: string;
  type: InsightType;
  title: string;
  body: string;
  dimension: Dimension | null;
  generated_at: string;
  dismissed: boolean;
}

export interface Integration {
  id: string;
  user_id: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationMetric {
  id: string;
  integration_id: string;
  dimension: Dimension;
  metric_name: string;
  metric_value: number;
  recorded_at: string;
}

// ── Goal Setting & Life Strategy Types ──

export interface UserProfile {
  userId: string;
  profession: string | null;
  interests: string[];
  projects: string[];
  hobbies: string[];
  skills: string[];
  postcode: string | null;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  horizon: GoalHorizon;
  status: GoalStatus;
  trackingType: GoalTrackingType;
  targetDate: string;
  metricTarget: number | null;
  metricCurrent: number | null;
  metricUnit: string | null;
  dimensions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GoalMilestone {
  id: string;
  goalId: string;
  title: string;
  position: number;
  completed: boolean;
  completedAt: string | null;
}

export interface GoalProgress {
  id: string;
  goalId: string;
  metricValue: number | null;
  note: string | null;
  recordedAt: string;
}

export interface Pathway {
  id: string;
  goalId: string;
  title: string;
  description: string;
  steps: PathwayStep[];
  dimensionImpacts: DimensionImpact[];
  aiGenerated: boolean;
  createdAt: string;
}

export interface PathwayStep {
  id: string;
  pathwayId: string;
  title: string;
  description: string;
  position: number;
  completed: boolean;
}

export interface DimensionImpact {
  dimension: string;
  impact: number;       // -5 to +5 projected impact
  explanation: string;
}
