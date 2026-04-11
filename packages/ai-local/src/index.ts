/**
 * @life-design/ai-local — Client-side ML via Transformers.js
 *
 * Public API: instantiate AILocalClient, then call embed(), classify(), summarize().
 * All inference runs in a Web Worker to keep the main thread responsive.
 */

import type { WorkerRequest, WorkerResponse } from './worker';
import type { DimensionLabel } from './models';

// Lightweight re-exports — no Transformers.js dependency.
// Heavy modules (classify, summarize, embed, similarity, voice-processor)
// run inside the Web Worker and must NOT be re-exported here to avoid
// pulling onnxruntime-node into client bundles.
export type { DimensionLabel, ModelTask } from './models';
export { EMBEDDING_DIM, DIMENSION_LABELS, MODEL_REGISTRY } from './models';
export type { GoalClassification, JournalClassification, MoodEstimate } from './classify';
export type { ScoredCheckIn, Cluster } from './similarity';
export type { VoiceSession, VoiceCheckInResult } from './voice-processor';
export type { LocalJITAIInput } from './jitai-inference';
export { runLocalJITAI, getTimeOfDay } from './jitai-inference';
export { PersonalModel } from './personal-model';

export interface AILocalProgress {
  task: string;
  status: string;
  progress?: number;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/** Default request timeout: 60 seconds */
const REQUEST_TIMEOUT_MS = 60_000;

export class AILocalClient {
  private worker: Worker | null = null;
  private pending = new Map<string, PendingRequest>();
  private nextId = 0;
  private onProgress?: (progress: AILocalProgress) => void;

  constructor(options?: { onProgress?: (progress: AILocalProgress) => void }) {
    this.onProgress = options?.onProgress;
  }

  private ensureWorker(): Worker {
    // SSR guard — Worker is a browser-only API
    if (typeof Worker === 'undefined') {
      throw new Error('AILocalClient requires a browser environment with Web Worker support');
    }

    if (!this.worker) {
      this.worker = new Worker(
        new URL('./worker.ts', import.meta.url),
        { type: 'module' },
      );
      this.worker.addEventListener('message', this.handleMessage);
      this.worker.addEventListener('error', this.handleError);
    }
    return this.worker;
  }

  private handleMessage = (event: MessageEvent<WorkerResponse>) => {
    const msg = event.data;

    if (msg.type === 'progress') {
      this.onProgress?.({
        task: msg.task,
        status: msg.progress.status,
        progress: msg.progress.progress,
      });
      return;
    }

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

  private request<T>(type: WorkerRequest['type'], payload: WorkerRequest['payload']): Promise<T> {
    const worker = this.ensureWorker();
    const id = String(++this.nextId);
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`AILocalClient: ${type} request timed out after ${REQUEST_TIMEOUT_MS}ms`));
      }, REQUEST_TIMEOUT_MS);

      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      });
      worker.postMessage({ id, type, payload } satisfies WorkerRequest);
    });
  }

  /**
   * Compute a normalized 384-dim embedding vector for the given text.
   */
  async embed(text: string): Promise<Float32Array> {
    return this.request<Float32Array>('embed', { text });
  }

  /**
   * Compute normalized embeddings for a batch of texts.
   */
  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    return this.request<Float32Array[]>('embedBatch', { texts });
  }

  /**
   * Classify text against the 8 life dimensions via zero-shot NLI.
   * Returns probability scores for each dimension.
   */
  async classify(text: string): Promise<Record<DimensionLabel, number>> {
    return this.request<Record<DimensionLabel, number>>('classify', { text });
  }

  /**
   * Produce an abstractive summary of the given text.
   */
  async summarize(text: string, maxLength?: number): Promise<string> {
    return this.request<string>('summarize', { text, maxLength });
  }

  /**
   * Classify a goal and return relevant dimensions with confidence weights.
   */
  async classifyGoal(text: string): Promise<import('./classify').GoalClassification> {
    return this.request('classifyGoal', { text });
  }

  /**
   * Full classification of a journal entry: dimensions, sentiment, and topics.
   */
  async classifyJournal(text: string): Promise<import('./classify').JournalClassification> {
    return this.request('classifyJournal', { text });
  }

  /**
   * Estimate mood (1-10) from text using sentiment analysis.
   */
  async detectMood(text: string): Promise<import('./classify').MoodEstimate> {
    return this.request('detectMood', { text });
  }

  /**
   * Generate a short journal preview (~30 words).
   */
  async journalPreview(text: string): Promise<string> {
    return this.request<string>('journalPreview', { text });
  }

  /**
   * Summarize a week's journal entries into overall themes.
   */
  async summarizeWeekly(journals: string[]): Promise<string> {
    return this.request<string>('summarizeWeekly', { texts: journals });
  }

  /**
   * Process a voice transcript into a structured check-in.
   */
  async processVoice(transcript: string): Promise<import('./voice-processor').VoiceCheckInResult> {
    return this.request('voiceProcess', { text: transcript });
  }

  /**
   * Terminate the Worker and clean up resources.
   */
  dispose() {
    if (this.worker) {
      this.worker.removeEventListener('message', this.handleMessage);
      this.worker.removeEventListener('error', this.handleError);
      this.worker.terminate();
      this.worker = null;
    }
    // Reject remaining pending requests
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error('AILocalClient disposed'));
    }
    this.pending.clear();
  }
}
