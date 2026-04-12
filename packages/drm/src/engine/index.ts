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
} from './context-assembly.js';

export type { ContextAssemblyParams } from './context-assembly.js';

export {
  createDefaultCommunicationDNA,
  adaptCommunicationDNA,
  formatCommunicationDNA,
} from './communication-dna.js';

export type { CommunicationFeedback } from './communication-dna.js';

export { selectModality } from './modality-selector.js';

export type {
  ModalitySelectionParams,
  ModalityRecommendation,
} from './modality-selector.js';
