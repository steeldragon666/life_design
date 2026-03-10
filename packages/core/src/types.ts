import {
  Dimension,
  DurationType,
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
