/**
 * @module engine
 *
 * Public API for the DRM context assembly engine.
 * Exports all types, functions, and constants needed to build
 * and adapt the companion's system prompt at runtime.
 */

export {
  assembleContext,
  estimateTokenCount,
  DEFAULT_TOKEN_BUDGETS,
} from './context-assembly';

export type { ContextAssemblyParams } from './context-assembly';

export {
  createDefaultCommunicationDNA,
  adaptCommunicationDNA,
  formatCommunicationDNA,
} from './communication-dna';

export type { CommunicationFeedback } from './communication-dna';

export { selectModality } from './modality-selector';

export type {
  ModalitySelectionParams,
  ModalityRecommendation,
} from './modality-selector';
