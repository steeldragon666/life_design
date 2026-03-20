import type { Dimension } from '@life-design/core';

export interface NormalisedMLFeatures {
  sleep_duration_score: number;
  sleep_quality_score: number;
  physical_strain: number;
  recovery_status: number;
  meeting_load: number;
  context_switching_penalty: number;
  deep_work_opportunity: number;
  after_hours_work: number;
  digital_fatigue: number;
  doomscroll_index: number;
  audio_valence: number;
  audio_energy: number;
  day_of_week_sin: number;
  day_of_week_cos: number;
  is_weekend: boolean;
  season_sprint: number;
  season_recharge: number;
  season_exploration: number;
}

export interface IFeatureExtractor {
  extract(date: Date, lookbackDays: number): Promise<NormalisedMLFeatures>;
  imputeMissing(raw: Partial<NormalisedMLFeatures>): NormalisedMLFeatures;
}

export interface TrainingPair {
  date: string;
  features: NormalisedMLFeatures;
  labels: Partial<Record<Dimension, number>>;
  mood: number;
  ai_accepted: boolean;
  completeDimensions: boolean;
}

export interface PredictionResult {
  scores: Record<Dimension, number>;
  mood: number;
  confidence: Record<Dimension, number>;
  topWeights: Record<Dimension, FeatureWeight[]>;
}

export interface FeatureWeight {
  feature: keyof NormalisedMLFeatures;
  weight: number;
  humanLabel: string;
}

export type ModelTier = 'cold' | 'warm' | 'personalized';

export interface ModelWeightsRecord {
  id: string;
  tier: ModelTier;
  version: number;
  updatedAt: number;
  sampleSize: number;
  coefficients: Record<string, number>;
  subjectivityGaps: Record<string, number>;
  validationLoss: number;
}

export interface FeatureLogRecord {
  date: string;
  features: NormalisedMLFeatures;
  imputedFields: string[];
  featureConfidence: number;
  extractedAt: number;
}

export interface GuardianLogEntry {
  id?: number;
  timestamp: number;
  triggerType: 'burnout' | 'isolation' | 'flow_state';
  escalationLevel: 1 | 2 | 3;
  actionSuggested: string;
  userAccepted: boolean;
  dimensionsAffected: Dimension[];
  deviationMagnitude: number;
}

export type SeasonName = 'Sprint' | 'Recharge' | 'Exploration' | 'Maintenance';

export interface SeasonRecord {
  id?: number;
  name: SeasonName;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  triggerSource: 'manual' | 'calendar_heuristic' | 'guardian_escalation';
  weights: Record<Dimension, number>;
}

export interface NormalisationStatsRecord {
  feature: string;
  mean30d: number;
  stddev30d: number;
  median: number;
  sampleCount: number;
  lastUpdated: number;
}

export interface SpotifyReflectionRecord {
  id?: number;
  date: string;
  artistName: string;
  trackNames: string[];
  listeningMinutes: number;
  audioValence: number;
  audioEnergy: number;
  userMoodResponse: 'energised' | 'calm' | 'melancholic' | 'nostalgic' | 'neutral';
  userFreeText?: string;
  createdAt: number;
}

export interface TrainerConfig {
  minSamplesWarm: number;
  minSamplesPersonalised: number;
  learningRate: number;
  maxIterations: number;
  maxDepth: number;
  lossFunction: 'mse';
  validationSplit: number;
}
