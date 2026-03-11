export enum Dimension {
  Career = 'career',
  Finance = 'finance',
  Health = 'health',
  Fitness = 'fitness',
  Family = 'family',
  Social = 'social',
  Romance = 'romance',
  Growth = 'growth',
}

export const ALL_DIMENSIONS: Dimension[] = Object.values(Dimension);

export const DIMENSION_LABELS: Record<Dimension, string> = {
  [Dimension.Career]: 'Career',
  [Dimension.Finance]: 'Finance',
  [Dimension.Health]: 'Health',
  [Dimension.Fitness]: 'Fitness',
  [Dimension.Family]: 'Family',
  [Dimension.Social]: 'Social',
  [Dimension.Romance]: 'Romance',
  [Dimension.Growth]: 'Personal Growth',
};

export enum MentorType {
  Stoic = 'stoic',
  Coach = 'coach',
  Scientist = 'scientist',
}

export enum DurationType {
  Quick = 'quick',
  Deep = 'deep',
}

export enum InsightType {
  Trend = 'trend',
  Correlation = 'correlation',
  Suggestion = 'suggestion',
  GoalProgress = 'goal_progress',
  GoalRisk = 'goal_risk',
}

export enum GoalHorizon {
  Short = 'short',    // 1-6 months
  Medium = 'medium',  // 6 months - 1.5 years
  Long = 'long',      // 1.5 - 5 years
}

export const GOAL_HORIZON_LABELS: Record<GoalHorizon, string> = {
  [GoalHorizon.Short]: 'Short-term (1-6 months)',
  [GoalHorizon.Medium]: 'Medium-term (6 months - 1.5 years)',
  [GoalHorizon.Long]: 'Long-term (1.5 - 5 years)',
};

export enum GoalStatus {
  Active = 'active',
  Completed = 'completed',
  Paused = 'paused',
  Abandoned = 'abandoned',
}

export enum GoalTrackingType {
  Milestone = 'milestone',
  Metric = 'metric',
}

export enum IntegrationProvider {
  Strava = 'strava',
  GoogleCalendar = 'google_calendar',
  Gmail = 'gmail',
  Slack = 'slack',
  Instagram = 'instagram',
  Weather = 'weather',
}

export enum IntegrationStatus {
  Connected = 'connected',
  Disconnected = 'disconnected',
  Error = 'error',
}
