/**
 * TrainingClient — main-thread proxy for the training Web Worker.
 *
 * Follows the same pattern as AILocalClient:
 *   - Lazy Worker initialisation
 *   - Pending request Map with id-based routing
 *   - Per-request timeouts
 */

import type {
  TrainerRequest,
  TrainerResponse,
} from '@/workers/training-worker';
import type {
  NormalisedMLFeatures,
  TrainingPair,
  ModelWeightsRecord,
  PredictionResult,
} from './types';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

// ---------------------------------------------------------------------------
// Timeouts
// ---------------------------------------------------------------------------

const TRAINING_TIMEOUT_MS = 30_000;
const PREDICT_TIMEOUT_MS = 5_000;

// ---------------------------------------------------------------------------
// TrainingClient
// ---------------------------------------------------------------------------

export class TrainingClient {
  private worker: Worker | null = null;
  private pending = new Map<string, PendingRequest>();
  private nextId = 0;

  // -----------------------------------------------------------------------
  // Worker lifecycle
  // -----------------------------------------------------------------------

  private ensureWorker(): Worker {
    if (typeof Worker === 'undefined') {
      throw new Error('TrainingClient requires a browser environment with Web Worker support');
    }

    if (!this.worker) {
      this.worker = new Worker(
        new URL('@/workers/training-worker.ts', import.meta.url),
        { type: 'module' },
      );
      this.worker.addEventListener('message', this.handleMessage);
      this.worker.addEventListener('error', this.handleError);
    }
    return this.worker;
  }

  // -----------------------------------------------------------------------
  // Message handlers
  // -----------------------------------------------------------------------

  private handleMessage = (event: MessageEvent<TrainerResponse>) => {
    const msg = event.data;
    const pending = this.pending.get(msg.id);
    if (!pending) return;

    clearTimeout(pending.timer);
    this.pending.delete(msg.id);

    if (msg.type === 'error') {
      pending.reject(new Error(msg.error));
    } else {
      pending.resolve(msg.data);
    }
  };

  private handleError = (event: ErrorEvent) => {
    // Reject all pending requests on unrecoverable Worker error
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error(event.message || 'Worker error'));
      this.pending.delete(id);
    }
  };

  // -----------------------------------------------------------------------
  // Request dispatch
  // -----------------------------------------------------------------------

  private request<T>(
    type: TrainerRequest['type'],
    payload: TrainerRequest['payload'],
    timeoutMs: number,
  ): Promise<T> {
    const worker = this.ensureWorker();
    const id = String(++this.nextId);

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new Error(
            `TrainingClient: ${type} timed out after ${timeoutMs}ms`,
          ),
        );
      }, timeoutMs);

      this.pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
        timer,
      });

      worker.postMessage({
        id,
        type,
        payload,
      } satisfies TrainerRequest);
    });
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Run a prediction using the current model tier.
   */
  async predict(features: NormalisedMLFeatures): Promise<PredictionResult> {
    return this.request<PredictionResult>(
      'predict',
      { features },
      PREDICT_TIMEOUT_MS,
    );
  }

  /**
   * Train the model on the given check-in history.
   * Automatically selects the appropriate tier based on sample size.
   */
  async train(pairs: TrainingPair[]): Promise<ModelWeightsRecord> {
    return this.request<ModelWeightsRecord>(
      'train',
      { pairs },
      TRAINING_TIMEOUT_MS,
    );
  }

  /**
   * Retrieve the current model metadata (tier, version, etc.).
   */
  async getModelInfo(): Promise<ModelWeightsRecord | null> {
    return this.request<ModelWeightsRecord | null>(
      'getModelInfo',
      {},
      PREDICT_TIMEOUT_MS,
    );
  }

  /**
   * Terminate the Worker and clean up resources.
   */
  dispose(): void {
    if (this.worker) {
      this.worker.removeEventListener('message', this.handleMessage);
      this.worker.removeEventListener('error', this.handleError);
      this.worker.terminate();
      this.worker = null;
    }
    // Reject remaining pending requests
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error('TrainingClient disposed'));
    }
    this.pending.clear();
  }
}
