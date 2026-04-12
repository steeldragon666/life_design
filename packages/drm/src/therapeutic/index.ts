/**
 * @module therapeutic
 *
 * Public surface of the therapeutic sub-package.
 * Re-exports the modality library, intervention tracker, and assessment embedding.
 */

export type { TherapeuticTechnique } from './modalities.js';
export {
  THERAPEUTIC_TECHNIQUES,
  getTechniquesForModality,
  getTechniqueById,
  matchTechniquesToState,
} from './modalities.js';

export type { InterventionTrackingResult } from './intervention-tracker.js';
export {
  OUTCOME_TRACKING_PROMPT,
  parseOutcomeTrackingResponse,
  computeRunningEffectiveness,
} from './intervention-tracker.js';

export {
  PHQ9_NATURAL_ITEMS,
  GAD7_NATURAL_ITEMS,
  ASSESSMENT_EMBEDDING_PROMPT,
  createAssessmentSession,
  getNextAssessmentItem,
  recordAssessmentResponse,
  isAssessmentComplete,
  scoreCompletedAssessment,
} from './assessment-embedding.js';
