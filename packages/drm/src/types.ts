/**
 * @module types
 *
 * Canonical type definitions for the Deep Relational Model (DRM).
 * All memory layers, pipeline stages, and domain objects are defined here.
 */

// ── Enums & Constants ───────────────────────────────────────────────────────

export enum DRMPhase {
  Initial = 'initial',           // Weeks 1-2: assessment + rapport building
  Calibration = 'calibration',   // Weeks 3-6: testing modalities
  Personalised = 'personalised', // Weeks 7+: personalised interventions
  Deepening = 'deepening',       // Months 3+: pattern references, growth arcs
}

export enum SafetyTier {
  Tier1_Immediate = 1,
  Tier2_Elevated = 2,
  Tier3_NoRisk = 3,
}

export enum TherapeuticModality {
  CBT = 'cbt',
  DBT = 'dbt',
  ACT = 'act',
  MI = 'motivational_interviewing',
  CFT = 'compassion_focused',
  BehaviouralActivation = 'behavioural_activation',
  Mindfulness = 'mindfulness',
}

export enum EmotionalRegister {
  Warm = 'warm',
  Gentle = 'gentle',
  Direct = 'direct',
  Challenging = 'challenging',
  Playful = 'playful',
  Grounding = 'grounding',
}

export enum ModelTier {
  Sonnet = 'sonnet',
  Opus = 'opus',
}

export enum MemoryDetailLevel {
  Full = 'full',
  Summary = 'summary',
  Abstracted = 'abstracted',
}

export enum InterventionResponse {
  Engaged = 'engaged',
  Neutral = 'neutral',
  Resistant = 'resistant',
  Breakthrough = 'breakthrough',
}

// ── Memory Layer Types ──────────────────────────────────────────────────────

/** Layer 1: Episodic Memory — what happened */
export interface EpisodicMemory {
  id: string;
  userId: string;
  sessionId: string;
  timestamp: Date;
  summary: string;
  emotionalValence: number;        // -1.0 to +1.0
  topics: string[];
  interventionsUsed: string[];
  outcomeRating: number | null;    // 0.0 to 1.0, user-rated or inferred
  notableQuotes: string[];
  followUp: string | null;
  embedding: number[];             // 1536-dim from embedding model
  detailLevel: MemoryDetailLevel;
  createdAt: Date;
}

/** Layer 2: Semantic Memory — who you are */
export interface SemanticMemory {
  userId: string;
  lifeContext: LifeContext;
  psychologicalProfile: PsychologicalProfile;
  therapeuticPreferences: TherapeuticPreferences;
  lastUpdated: Date;
}

export interface LifeContext {
  relationships: string[];
  work: string | null;
  healthConditions: string[];
  medications: string[];
  goals: string[];
  values: string[];
  interests: string[];
  culturalBackground: string | null;
  spiritualOrientation: string | null;
}

export interface PsychologicalProfile {
  attachmentStyle: string | null;
  commonDistortions: string[];
  copingStrengths: string[];
  copingGaps: string[];
  personalityTraits: Record<string, number>;  // Big Five from TIPI
  gritScore: number | null;
  selfCompassionLevel: string | null;
  locusOfControl: string | null;
}

export interface TherapeuticPreferences {
  preferredModalities: TherapeuticModality[];
  communicationStyle: string | null;
  depthPreference: 'shallow' | 'medium' | 'deep';
  metaphorPreference: 'loves_analogies' | 'prefers_direct' | 'mixed';
  pacingPreference: 'brief_focused' | 'exploratory' | 'mixed';
  culturalContext: string | null;
}

/** Layer 3: Relational Memory — our history together */
export interface RelationalMemory {
  userId: string;
  relationshipStarted: Date;
  totalSessions: number;
  totalMessages: number;
  trustTrajectory: string;
  currentPhase: DRMPhase;
  interactionPatterns: InteractionPatterns;
  milestones: RelationalMilestone[];
  rapportNotes: string;
  lastUpdated: Date;
}

export interface InteractionPatterns {
  typicalFrequency: string;
  typicalDuration: string;
  preferredTimes: string[];
  topicsApproached: string[];
  topicsAvoided: string[];
  engagementTrend: 'increasing' | 'stable' | 'decreasing';
}

export interface RelationalMilestone {
  date: Date;
  event: string;
  significance: 'minor' | 'moderate' | 'major';
}

/** Layer 4: Therapeutic Memory — what works for you */
export interface TherapeuticMemory {
  userId: string;
  issueInterventionMap: IssueInterventionRecord[];
  timingIntelligence: TimingIntelligence;
  resistancePatterns: ResistancePattern[];
  lastUpdated: Date;
}

export interface IssueInterventionRecord {
  issueId: string;
  issueName: string;
  interventions: InterventionOutcome[];
}

export interface InterventionOutcome {
  modality: TherapeuticModality;
  technique: string;
  effectiveness: number;          // 0.0 to 1.0
  sessionsExposed: number;
  lastUsed: Date;
  userResponse: InterventionResponse;
  notes: string | null;
}

export interface TimingIntelligence {
  pushTopics: string[];            // topics where user is receptive to challenge
  holdSpaceTopics: string[];       // topics where user needs to feel heard first
  dayPatterns: Record<string, string>;  // e.g., "Monday": "typically higher distress"
  bestInterventionTiming: string | null;
}

export interface ResistancePattern {
  trigger: string;
  response: string;
  navigationStrategy: string;
}

// ── Safety Types ────────────────────────────────────────────────────────────

export interface SafetyClassification {
  tier: SafetyTier;
  signal: string | null;
  confidence: number;
  timestamp: Date;
}

export interface LongitudinalRiskAssessment {
  userId: string;
  tier2Flags: string[];
  recommendProfessional: boolean;
  phq9Trend: TrendData | null;
  sessionFrequencyDelta: number | null;
  emotionalValenceTrend: TrendData | null;
  assessedAt: Date;
}

export interface TrendData {
  slope: number;
  currentValue: number;
  baselineValue: number;
  dataPoints: number;
}

export interface EscalationRecord {
  id: string;
  userId: string;
  triggerTier: SafetyTier;
  triggerSignal: string;
  escalationType: 'crisis_resources' | 'professional_referral' | 'human_handoff';
  crisisResourcesShown: string[];
  acknowledged: boolean;
  acknowledgedAt: Date | null;
  createdAt: Date;
}

// ── Adaptive Engine Types ───────────────────────────────────────────────────

export interface AdaptiveEngineState {
  userId: string;
  currentPhase: DRMPhase;
  phaseStartedAt: Date;
  sessionCount: number;
  modulatedModalities: ModalityWeight[];
  communicationDNA: CommunicationDNA;
  activeIssues: string[];
}

export interface ModalityWeight {
  modality: TherapeuticModality;
  weight: number;                  // 0.0 to 1.0, how much to favour this
  issueSpecific: boolean;
  forIssue: string | null;
}

export interface CommunicationDNA {
  emotionalRegister: EmotionalRegister;
  metaphorUsage: 'high' | 'moderate' | 'low';
  directnessLevel: number;         // 0.0 (very indirect) to 1.0 (very direct)
  humourLevel: number;             // 0.0 to 1.0
  challengeLevel: number;          // 0.0 (pure validation) to 1.0 (strong challenging)
  pacing: 'brief' | 'moderate' | 'expansive';
  languageComplexity: 'simple' | 'moderate' | 'sophisticated';
}

// ── Context Assembly Types ──────────────────────────────────────────────────

export interface AssembledContext {
  systemPrompt: string;
  totalTokenEstimate: number;
  memoryBudget: TokenBudget;
  safetyOverlay: string | null;
  modelTier: ModelTier;
}

export interface TokenBudget {
  basePrompt: number;
  semanticMemory: number;
  relationalMemory: number;
  episodicRecent: number;
  episodicRelevant: number;
  therapeuticMemory: number;
  assessmentData: number;
  conversation: number;
  safetyOverlay: number;
  total: number;
}

// ── Pipeline Types ──────────────────────────────────────────────────────────

export interface CompanionRequest {
  userId: string;
  sessionId: string;
  message: string;
  conversationHistory: ConversationMessage[];
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface CompanionResponse {
  text: string;
  sessionId: string;
  safetyClassification: SafetyClassification;
  modelUsed: ModelTier;
  tokensUsed: { input: number; output: number };
}

export interface BackgroundTask {
  type: 'episodic_summarisation' | 'profile_update' | 'outcome_tracking' | 'memory_consolidation';
  userId: string;
  sessionId: string;
  payload: Record<string, unknown>;
  scheduledAt: Date;
}

// ── Feature Types ───────────────────────────────────────────────────────────

export interface GrowthNarrative {
  id: string;
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  narrative: string;
  milestones: RelationalMilestone[];
  assessmentTrends: AssessmentTrend[];
  patternsShifted: string[];
  areasInProgress: string[];
  generatedAt: Date;
}

export interface AssessmentTrend {
  instrument: string;              // 'PHQ-9', 'GAD-7', etc.
  startScore: number;
  endScore: number;
  startSeverity: string;
  endSeverity: string;
  direction: 'improving' | 'stable' | 'worsening';
}

export interface LifeStory {
  userId: string;
  chapters: LifeChapter[];
  themes: string[];
  growthArcs: GrowthArc[];
  lastUpdated: Date;
}

export interface LifeChapter {
  title: string;
  period: string;
  summary: string;
  keyEvents: string[];
  emotionalTheme: string;
}

export interface GrowthArc {
  name: string;
  startDate: Date;
  description: string;
  status: 'emerging' | 'active' | 'resolved' | 'recurring';
}

export interface PatternIntelligence {
  userId: string;
  cyclicalPatterns: CyclicalPattern[];
  triggerResponseChains: TriggerChain[];
  avoidancePatterns: AvoidancePattern[];
  growthTrajectories: GrowthTrajectory[];
  detectedAt: Date;
}

export interface CyclicalPattern {
  description: string;
  periodicity: string;             // 'weekly', 'monthly', 'seasonal', etc.
  confidence: number;
  lastOccurrence: Date | null;
}

export interface TriggerChain {
  trigger: string;
  response: string;
  frequency: number;
  confidence: number;
}

export interface AvoidancePattern {
  topic: string;
  mentionCount: number;
  exploredCount: number;
  lastMentioned: Date | null;
}

export interface GrowthTrajectory {
  description: string;
  startDate: Date;
  evidence: string;
}

export interface MicroMoment {
  id: string;
  userId: string;
  type: 'morning_checkin' | 'pre_event' | 'evening_reflection' | 'post_crisis_followup' | 'pattern_based';
  message: string;
  context: string;
  scheduledFor: Date;
  deliveredAt: Date | null;
  respondedAt: Date | null;
}

// ── Assessment Embedding Types ──────────────────────────────────────────────

export interface NaturalAssessmentItem {
  instrument: string;              // 'PHQ-9', 'GAD-7'
  itemIndex: number;
  originalText: string;
  naturalPhrasings: string[];
  lastAdministered: Date | null;
  score: number | null;
}

export interface AssessmentSession {
  userId: string;
  instrument: string;
  items: NaturalAssessmentItem[];
  completedItems: number;
  totalItems: number;
  startedAt: Date;
  completedAt: Date | null;
  totalScore: number | null;
  severity: string | null;
}

// ── Configuration ───────────────────────────────────────────────────────────

export interface DRMConfig {
  anthropicApiKey: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  neo4jUri: string;
  neo4jUser: string;
  neo4jPassword: string;
  redisUrl: string;
  models: {
    primary: string;               // e.g., 'claude-sonnet-4-20250514'
    reasoning: string;             // e.g., 'claude-opus-4-20250514'
    safety: string;                // e.g., 'claude-sonnet-4-20250514'
  };
  tokenBudgets: TokenBudget;
  companionName: string;
}
