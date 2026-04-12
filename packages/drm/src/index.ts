/**
 * @module @life-design/drm
 *
 * Deep Relational Model — an adaptive AI companion system built on
 * four-layer memory architecture, three-tier safety, and integrative
 * therapeutic techniques.
 *
 * Subpath imports are available for tree-shaking:
 *   import { sendMessage }      from '@life-design/drm/client'
 *   import { classifySafety }   from '@life-design/drm/safety'
 *   import { retrieveAllMemoryLayers } from '@life-design/drm/memory'
 *   import { assembleContext }  from '@life-design/drm/engine'
 *   import { TECHNIQUES }       from '@life-design/drm/therapeutic'
 *   import { processMessage }   from '@life-design/drm/pipeline'
 *   import { buildLifeStoryContext } from '@life-design/drm/features'
 */

// ── Types (always re-exported) ─────────────────────────────────────────────
export * from './types';

// ── Client ─────────────────────────────────────────────────────────────────
export {
  createClaudeClient,
  sendMessage,
  streamMessage,
  sendBatchMessage,
} from './client/index';

export {
  ModelTask,
  routeToModel,
} from './client/model-router';

export {
  generateEmbedding,
  cosineSimilarity,
  EMBEDDING_DIMENSIONS,
} from './client/embeddings';

// ── Safety ─────────────────────────────────────────────────────────────────
export {
  classifySafety,
  SAFETY_CLASSIFIER_PROMPT,
} from './safety/classifier';

export {
  assessLongitudinalRisk,
} from './safety/longitudinal';

export {
  buildCrisisProtocol,
  CRISIS_SYSTEM_PROMPT_OVERRIDE,
} from './safety/escalation';

// ── Memory ─────────────────────────────────────────────────────────────────
export {
  createEpisodicEntry,
  rankEpisodicMemories,
  formatEpisodicForPrompt,
  shouldConsolidate,
} from './memory/episodic';

export {
  createDefaultSemanticMemory,
  mergeSemanticUpdate,
  formatSemanticForPrompt,
  extractSemanticUpdatePrompt,
} from './memory/semantic';

export {
  createDefaultRelationalMemory,
  updateRelationalMetrics,
  determinePhase,
  addMilestone,
  formatRelationalForPrompt,
} from './memory/relational';

export {
  createDefaultTherapeuticMemory,
  recordInterventionOutcome,
  getEffectiveInterventions,
  formatTherapeuticForPrompt,
  updateTimingIntelligence,
} from './memory/therapeutic';

export {
  retrieveAllMemoryLayers,
} from './memory/retrieval';

export {
  identifyConsolidationTargets,
  buildConsolidationBatch,
  CONSOLIDATION_PROMPT,
  PATTERN_EXTRACTION_PROMPT,
} from './memory/consolidation';

// ── Engine ─────────────────────────────────────────────────────────────────
export {
  assembleContext,
  estimateTokenCount,
  DEFAULT_TOKEN_BUDGETS,
} from './engine/context-assembly';

export {
  createDefaultCommunicationDNA,
  adaptCommunicationDNA,
  formatCommunicationDNA,
} from './engine/communication-dna';

export {
  selectModality,
} from './engine/modality-selector';

// ── Therapeutic ────────────────────────────────────────────────────────────
export {
  THERAPEUTIC_TECHNIQUES,
  getTechniquesForModality,
  getTechniqueById,
  matchTechniquesToState,
} from './therapeutic/modalities';

export {
  OUTCOME_TRACKING_PROMPT,
  parseOutcomeTrackingResponse,
  computeRunningEffectiveness,
} from './therapeutic/intervention-tracker';

export {
  PHQ9_NATURAL_ITEMS,
  GAD7_NATURAL_ITEMS,
  ASSESSMENT_EMBEDDING_PROMPT,
  createAssessmentSession,
  getNextAssessmentItem,
  recordAssessmentResponse,
  scoreCompletedAssessment,
} from './therapeutic/assessment-embedding';

// ── Features ───────────────────────────────────────────────────────────────
export {
  buildLifeStoryContext,
  parseLifeStoryResponse,
  createDefaultLifeStory,
  LIFE_STORY_PROMPT,
} from './features/life-story';

export {
  buildGrowthNarrativeContext,
  parseGrowthNarrativeResponse,
  shouldGenerateNarrative,
  GROWTH_NARRATIVE_PROMPT,
} from './features/growth-narrative';

export {
  detectCyclicalPatterns,
  detectAvoidancePatterns,
  formatPatternInsight,
  PATTERN_ANALYSIS_PROMPT,
} from './features/pattern-intelligence';

export {
  determineMicroMoment,
  buildMicroMomentMessage,
  MICRO_MOMENT_PROMPT,
} from './features/micro-moments';

// ── Pipeline ───────────────────────────────────────────────────────────────
export {
  processMessage,
} from './pipeline/request-pipeline';

export {
  processBackgroundTask,
} from './pipeline/background-processor';

export {
  createDRMQueue,
  createDRMWorker,
} from './pipeline/queue';
