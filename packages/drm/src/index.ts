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
export * from './types.js';

// ── Client ─────────────────────────────────────────────────────────────────
export {
  createClaudeClient,
  sendMessage,
  streamMessage,
  sendBatchMessage,
} from './client/index.js';

export {
  ModelTask,
  routeToModel,
} from './client/model-router.js';

export {
  generateEmbedding,
  cosineSimilarity,
  EMBEDDING_DIMENSIONS,
} from './client/embeddings.js';

// ── Safety ─────────────────────────────────────────────────────────────────
export {
  classifySafety,
  SAFETY_CLASSIFIER_PROMPT,
} from './safety/classifier.js';

export {
  assessLongitudinalRisk,
} from './safety/longitudinal.js';

export {
  buildCrisisProtocol,
  CRISIS_SYSTEM_PROMPT_OVERRIDE,
} from './safety/escalation.js';

// ── Memory ─────────────────────────────────────────────────────────────────
export {
  createEpisodicEntry,
  rankEpisodicMemories,
  formatEpisodicForPrompt,
  shouldConsolidate,
} from './memory/episodic.js';

export {
  createDefaultSemanticMemory,
  mergeSemanticUpdate,
  formatSemanticForPrompt,
  extractSemanticUpdatePrompt,
} from './memory/semantic.js';

export {
  createDefaultRelationalMemory,
  updateRelationalMetrics,
  determinePhase,
  addMilestone,
  formatRelationalForPrompt,
} from './memory/relational.js';

export {
  createDefaultTherapeuticMemory,
  recordInterventionOutcome,
  getEffectiveInterventions,
  formatTherapeuticForPrompt,
  updateTimingIntelligence,
} from './memory/therapeutic.js';

export {
  retrieveAllMemoryLayers,
} from './memory/retrieval.js';

export {
  identifyConsolidationTargets,
  buildConsolidationBatch,
  CONSOLIDATION_PROMPT,
  PATTERN_EXTRACTION_PROMPT,
} from './memory/consolidation.js';

// ── Engine ─────────────────────────────────────────────────────────────────
export {
  assembleContext,
  estimateTokenCount,
  DEFAULT_TOKEN_BUDGETS,
} from './engine/context-assembly.js';

export {
  createDefaultCommunicationDNA,
  adaptCommunicationDNA,
  formatCommunicationDNA,
} from './engine/communication-dna.js';

export {
  selectModality,
} from './engine/modality-selector.js';

// ── Therapeutic ────────────────────────────────────────────────────────────
export {
  THERAPEUTIC_TECHNIQUES,
  getTechniquesForModality,
  getTechniqueById,
  matchTechniquesToState,
} from './therapeutic/modalities.js';

export {
  OUTCOME_TRACKING_PROMPT,
  parseOutcomeTrackingResponse,
  computeRunningEffectiveness,
} from './therapeutic/intervention-tracker.js';

export {
  PHQ9_NATURAL_ITEMS,
  GAD7_NATURAL_ITEMS,
  ASSESSMENT_EMBEDDING_PROMPT,
  createAssessmentSession,
  getNextAssessmentItem,
  recordAssessmentResponse,
  scoreCompletedAssessment,
} from './therapeutic/assessment-embedding.js';

// ── Features ───────────────────────────────────────────────────────────────
export {
  buildLifeStoryContext,
  parseLifeStoryResponse,
  createDefaultLifeStory,
  LIFE_STORY_PROMPT,
} from './features/life-story.js';

export {
  buildGrowthNarrativeContext,
  parseGrowthNarrativeResponse,
  shouldGenerateNarrative,
  GROWTH_NARRATIVE_PROMPT,
} from './features/growth-narrative.js';

export {
  detectCyclicalPatterns,
  detectAvoidancePatterns,
  formatPatternInsight,
  PATTERN_ANALYSIS_PROMPT,
} from './features/pattern-intelligence.js';

export {
  determineMicroMoment,
  buildMicroMomentMessage,
  MICRO_MOMENT_PROMPT,
} from './features/micro-moments.js';

// ── Pipeline ───────────────────────────────────────────────────────────────
export {
  processMessage,
} from './pipeline/request-pipeline.js';

export {
  processBackgroundTask,
} from './pipeline/background-processor.js';

export {
  createDRMQueue,
  createDRMWorker,
} from './pipeline/queue.js';
