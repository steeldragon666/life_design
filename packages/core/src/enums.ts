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
}

export enum IntegrationProvider {
  Strava = 'strava',
}

export enum IntegrationStatus {
  Connected = 'connected',
  Disconnected = 'disconnected',
  Error = 'error',
}
