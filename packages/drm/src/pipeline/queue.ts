/**
 * @module pipeline/queue
 *
 * BullMQ queue and worker factory for the DRM background processing pipeline.
 *
 * Usage:
 *   const connection = new IORedis(config.redisUrl);
 *   const queue = createDRMQueue(connection);
 *   const worker = createDRMWorker(connection, (task) => processBackgroundTask(task, deps));
 *
 * Both the Queue and Worker share the same IORedis connection instance. BullMQ
 * internally manages separate connection handles for pub/sub, so a single
 * IORedis instance is the recommended pattern.
 */

import { Queue, Worker } from 'bullmq';
import type IORedis from 'ioredis';
import type { BackgroundTask } from '../types.js';

// ── Constants ─────────────────────────────────────────────────────────────────

export const DRM_QUEUE_NAME = 'drm-background';

/** Worker concurrency: process up to 3 background tasks simultaneously. */
const WORKER_CONCURRENCY = 3;

/**
 * Default job options applied to every task enqueued via the DRM queue.
 *
 * - attempts: 3 — retry up to 3 times before marking failed.
 * - backoff: exponential starting at 5 s (5 s, 10 s, 20 s).
 * - removeOnComplete: keep the 100 most recent completed jobs for observability.
 * - removeOnFail: keep the 500 most recent failed jobs for post-mortem debugging.
 */
export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 5000,
  },
  removeOnComplete: 100,
  removeOnFail: 500,
} as const;

// ── Factory Functions ─────────────────────────────────────────────────────────

/**
 * Create the DRM background processing queue.
 *
 * The returned Queue instance is used to enqueue BackgroundTask jobs. The
 * `defaultJobOptions` ensure consistent retry behaviour across all task types.
 *
 * @param connection - A connected IORedis instance.
 */
export function createDRMQueue(connection: IORedis): Queue<BackgroundTask> {
  return new Queue<BackgroundTask>(DRM_QUEUE_NAME, {
    connection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
}

/**
 * Create the DRM background processing worker.
 *
 * The worker pulls jobs from the `drm-background` queue and calls the supplied
 * `processor` function for each job. The processor receives the deserialized
 * `BackgroundTask` payload — BullMQ handles serialisation/deserialisation.
 *
 * @param connection - A connected IORedis instance.
 * @param processor  - Async function that processes a single BackgroundTask.
 *                     Throwing from the processor marks the job as failed and
 *                     triggers the configured retry policy.
 */
export function createDRMWorker(
  connection: IORedis,
  processor: (task: BackgroundTask) => Promise<void>,
): Worker<BackgroundTask> {
  return new Worker<BackgroundTask>(
    DRM_QUEUE_NAME,
    async (job: { data: BackgroundTask }) => {
      await processor(job.data);
    },
    {
      connection,
      concurrency: WORKER_CONCURRENCY,
    },
  );
}
