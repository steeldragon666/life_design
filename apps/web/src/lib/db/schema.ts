import Dexie, { type EntityTable } from 'dexie';
import {
  Dimension,
  GoalHorizon,
  GoalStatus,
  InsightType,
  IntegrationProvider,
} from '@life-design/core';
import type {
  FeatureLogRecord,
  ModelWeightsRecord,
  GuardianLogEntry,
  SeasonRecord,
  NormalisationStatsRecord,
  SpotifyReflectionRecord,
} from '../ml/types';

// ---------------------------------------------------------------------------
// Helper types
// ---------------------------------------------------------------------------

export interface PathwayStep {
  id: string;
  title: string;
  description: string;
  position: number;
  completed: boolean;
  estimatedDuration?: string;
  resources?: string[];
  completedAt?: Date;
}

export interface RiskAlert {
  dimension: Dimension;
  severity: 'low' | 'medium' | 'high';
  message: string;
  detectedAt: Date;
}

// ---------------------------------------------------------------------------
// Table interfaces
// ---------------------------------------------------------------------------

export interface DBCheckIn {
  id?: number;
  date: string; // YYYY-MM-DD
  mood: number; // 1-5
  energy?: number; // 1-5
  sleep?: number; // hours
  journal?: string;
  dimensionScores: Partial<Record<Dimension, number>>;
  tags: string[];
  embedding?: number[]; // Float32Array serialized for Dexie storage (384 dims from MiniLM)
  ai_accepted?: boolean;
  createdAt: Date;
}

export interface DBGoal {
  id?: number;
  title: string;
  description: string;
  horizon: GoalHorizon;
  status: GoalStatus;
  dimensions: Dimension[];
  targetDate?: Date;
  milestones: PathwayStep[];
  dimensionImpacts: { dimension: Dimension; impact: number; explanation?: string }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DBInsight {
  id?: number;
  type: InsightType;
  title: string;
  body: string;
  dimension?: Dimension;
  confidence?: number; // 0-1
  sourceCheckInIds: number[];
  riskAlerts?: RiskAlert[];
  generatedAt: Date;
  dismissed: boolean;
}

export interface DBCorrelation {
  id?: number;
  dimension1: Dimension;
  dimension2: Dimension;
  strength: number; // -1 to 1
  description: string;
  sampleSize: number;
  calculatedAt: Date;
}

export interface DBConnectedAppData {
  id?: number;
  provider: IntegrationProvider;
  rawData: unknown;
  processedMetrics: Record<string, number>;
  syncedAt: Date;
}

export interface DBMentorMemory {
  id?: number;
  category: string;
  content: string;
  importance: number; // 1-10
  sourceInsightIds: number[];
  createdAt: Date;
  lastReferencedAt: Date;
}

export interface DBNudge {
  id?: number;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  scheduledFor: Date;
  dismissed: boolean;
  createdAt: Date;
}

export interface DBActiveChallenge {
  id?: number;
  challengeId: string;
  startDate: string; // YYYY-MM-DD
  status: 'active' | 'completed' | 'abandoned';
  taskCompletion: Record<string, boolean>; // key: task.id (e.g., 'balance-reset-d1-check_in-0')
  completedAt?: Date;
  createdAt: Date;
}

export interface DBBadge {
  id?: number;
  badgeId: string;
  earnedAt: Date;
  context?: string; // e.g. "health" for dimension badge
}

export interface DBScheduleBlock {
  id?: number;
  date: string;          // YYYY-MM-DD
  startTime: string;     // HH:mm
  endTime: string;       // HH:mm
  title: string;
  dimension: Dimension;
  source: 'google' | 'apple' | 'manual' | 'ai-suggested';
  calendarEventId?: string;
  confirmed: boolean;
  createdAt: Date;
}

export interface DBJournalEntry {
  id?: number;
  content: string;
  source: 'standalone' | 'checkin';
  checkinId?: number;
  sentiment?: number;
  themes?: string[];
  dimensions?: string[];
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

export class LifeDesignDB extends Dexie {
  checkIns!: EntityTable<DBCheckIn, 'id'>;
  goals!: EntityTable<DBGoal, 'id'>;
  insights!: EntityTable<DBInsight, 'id'>;
  correlations!: EntityTable<DBCorrelation, 'id'>;
  connectedAppData!: EntityTable<DBConnectedAppData, 'id'>;
  mentorMemory!: EntityTable<DBMentorMemory, 'id'>;
  nudges!: EntityTable<DBNudge, 'id'>;
  activeChallenges!: EntityTable<DBActiveChallenge, 'id'>;
  badges!: EntityTable<DBBadge, 'id'>;
  scheduleBlocks!: EntityTable<DBScheduleBlock, 'id'>;
  journalEntries!: EntityTable<DBJournalEntry, 'id'>;
  featureLogs!: EntityTable<FeatureLogRecord, 'date'>;
  mlModelWeights!: EntityTable<ModelWeightsRecord, 'id'>;
  guardianLogs!: EntityTable<GuardianLogEntry, 'id'>;
  seasons!: EntityTable<SeasonRecord, 'id'>;
  normalisationStats!: EntityTable<NormalisationStatsRecord, 'feature'>;
  spotifyReflections!: EntityTable<SpotifyReflectionRecord, 'id'>;

  constructor() {
    super('LifeDesignDB');

    this.version(1).stores({
      checkIns: '++id, date, mood, [date+mood]',
      goals: '++id, status, horizon, *dimensions',
      insights: '++id, type, dimension, generatedAt, dismissed',
      correlations: '++id, dimension1, dimension2, strength',
      connectedAppData: '++id, provider, syncedAt',
      mentorMemory: '++id, category, importance',
      nudges: '++id, type, scheduledFor, dismissed',
    });

    this.version(2).stores({
      checkIns: '++id, date, mood, [date+mood]',
      goals: '++id, status, horizon, *dimensions',
      insights: '++id, type, dimension, generatedAt, dismissed',
      correlations: '++id, dimension1, dimension2, strength',
      connectedAppData: '++id, provider, syncedAt',
      mentorMemory: '++id, category, importance',
      nudges: '++id, type, scheduledFor, dismissed',
      activeChallenges: '++id, challengeId, status, startDate',
      badges: '++id, badgeId, earnedAt',
    });

    // Version 3: Add embedding field to checkIns (no index change needed — stored inline)
    this.version(3).stores({});

    this.version(4).stores({
      scheduleBlocks: '++id, date, dimension, source, calendarEventId',
    });

    this.version(5).stores({
      featureLogs: 'date, extractedAt',
      mlModelWeights: 'id, tier, version',
      guardianLogs: '++id, timestamp, triggerType',
      seasons: '++id, name, isActive',
      normalisationStats: 'feature',
      spotifyReflections: '++id, date',
    });

    this.version(6).stores({
      journalEntries: '++id, source, createdAt, *dimensions',
    });
  }
}

// Singleton instance — also re-exported from ./index for convenience
export const db = new LifeDesignDB();
