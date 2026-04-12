/**
 * @module pipeline
 *
 * Public API for the DRM request pipeline and background processing subsystem.
 */

export { processMessage } from './request-pipeline.js';

export type {
  ClaudeMessage as PipelineClaudeMessage,
  MemoryRetrievalResult,
  PipelineDependencies,
} from './request-pipeline.js';

export { processBackgroundTask, SUMMARISATION_PROMPT, PROFILE_UPDATE_PROMPT } from './background-processor.js';

export type {
  BackgroundDependencies,
  ClaudeMessage as BackgroundClaudeMessage,
  OutcomeUpdate,
} from './background-processor.js';

export {
  createDRMQueue,
  createDRMWorker,
  DRM_QUEUE_NAME,
  DEFAULT_JOB_OPTIONS,
} from './queue.js';
