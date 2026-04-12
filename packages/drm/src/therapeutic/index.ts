/**
 * @module therapeutic
 *
 * Public surface of the therapeutic sub-package.
 * Re-exports the modality library, intervention tracker, and assessment embedding.
 */

export type { TherapeuticTechnique } from './modalities';
export {
  THERAPEUTIC_TECHNIQUES,
  getTechniquesForModality,
  getTechniqueById,
  matchTechniquesToState,
} from './modalities';

export type { InterventionTrackingResult } from './intervention-tracker';
export {
  OUTCOME_TRACKING_PROMPT,
  parseOutcomeTrackingResponse,
  computeRunningEffectiveness,
} from './intervention-tracker';

export {
  PHQ9_NATURAL_ITEMS,
  GAD7_NATURAL_ITEMS,
  ASSESSMENT_EMBEDDING_PROMPT,
  createAssessmentSession,
  getNextAssessmentItem,
  recordAssessmentResponse,
  isAssessmentComplete,
  scoreCompletedAssessment,
} from './assessment-embedding';
