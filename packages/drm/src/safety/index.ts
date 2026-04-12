/**
 * @module safety
 *
 * Three-tier safety system for the Deep Relational Model.
 *
 * Tier 1 — Real-Time Risk Detection (classifier.ts)
 *   Synchronous regex + Claude-powered classification on every message.
 *
 * Tier 2 — Longitudinal Pattern Monitoring (longitudinal.ts)
 *   PHQ-9 trends, session withdrawal, and sustained negative affect over weeks.
 *
 * Tier 3 — Human Escalation Pathway (escalation.ts)
 *   Crisis protocols, resource libraries, and system-prompt overrides.
 */

export { classifySafety } from './classifier';
export type { SafetySendFn } from './classifier';

export {
  assessLongitudinalRisk,
  longitudinalAssessmentToTier,
} from './longitudinal';
export type {
  LongitudinalParams,
  PHQ9DataPoint,
  EmotionalValencePoint,
} from './longitudinal';

export {
  buildCrisisProtocol,
  ALL_CRISIS_RESOURCES,
  CRISIS_SYSTEM_PROMPT_OVERRIDE,
} from './escalation';
export type { CrisisResource, CrisisProtocol } from './escalation';
