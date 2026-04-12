/**
 * @module memory
 *
 * Deep Relational Model — Memory Layer public API.
 *
 * Re-exports all pure functions, types, and constants from the four memory
 * layers, the unified retrieval orchestrator, and the consolidation utilities.
 */

export {
  createEpisodicEntry,
  rankEpisodicMemories,
  formatEpisodicForPrompt,
  shouldConsolidate,
} from './episodic'
export type { RankedMemory, CreateEpisodicEntryParams } from './episodic'

export {
  createDefaultSemanticMemory,
  mergeSemanticUpdate,
  formatSemanticForPrompt,
  extractSemanticUpdatePrompt,
} from './semantic'

export {
  createDefaultRelationalMemory,
  updateRelationalMetrics,
  determinePhase,
  addMilestone,
  formatRelationalForPrompt,
} from './relational'

export {
  createDefaultTherapeuticMemory,
  recordInterventionOutcome,
  getEffectiveInterventions,
  formatTherapeuticForPrompt,
  updateTimingIntelligence,
} from './therapeutic'

export { retrieveAllMemoryLayers } from './retrieval'
export type { RetrievedContext, RetrieveAllMemoryLayersParams } from './retrieval'

export {
  CONSOLIDATION_PROMPT,
  PATTERN_EXTRACTION_PROMPT,
  identifyConsolidationTargets,
  buildConsolidationBatch,
} from './consolidation'
