/**
 * @module pipeline
 *
 * Public API for the DRM request pipeline and background processing subsystem.
 */

export { processMessage } from './request-pipeline';

export type {
  ClaudeMessage as PipelineClaudeMessage,
  MemoryRetrievalResult,
  PipelineDependencies,
} from './request-pipeline';

export { processBackgroundTask, SUMMARISATION_PROMPT, PROFILE_UPDATE_PROMPT } from './background-processor';

export type {
  BackgroundDependencies,
  ClaudeMessage as BackgroundClaudeMessage,
  OutcomeUpdate,
} from './background-processor';

export {
  createDRMQueue,
  createDRMWorker,
  DRM_QUEUE_NAME,
  DEFAULT_JOB_OPTIONS,
} from './queue';
