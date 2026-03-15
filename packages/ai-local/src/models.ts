/**
 * Model registry: maps each ML task to its Hugging Face model ID and config.
 * Models are loaded lazily on first use and cached in IndexedDB by Transformers.js.
 */

export type ModelTask = 'embedding' | 'classification' | 'summarization';

export interface ModelConfig {
  modelId: string;
  /** Approximate quantized model size in MB (for progress estimation) */
  sizeMB: number;
}

export const MODEL_REGISTRY: Record<ModelTask, ModelConfig> = {
  embedding: {
    modelId: 'Xenova/all-MiniLM-L6-v2',
    sizeMB: 23,
  },
  classification: {
    modelId: 'Xenova/mobilebert-uncased-mnli',
    sizeMB: 25,
  },
  summarization: {
    modelId: 'Xenova/distilbart-cnn-6-6',
    sizeMB: 110,
  },
};

/** The 8 life dimensions used as classification labels — re-exported from core */
export { ALL_DIMENSIONS as DIMENSION_LABELS, type Dimension as DimensionLabel } from '@life-design/core';

/**
 * Lazy singleton factory for pipeline initialization.
 * Prevents triplicated boilerplate across embed/classify/summarize modules.
 *
 * Usage:
 *   const getPipeline = lazySingleton(async (onProgress) => {
 *     return await pipeline('task', MODEL_REGISTRY.task.modelId, { progress_callback: onProgress });
 *   });
 */
export function lazySingleton<T>(
  factory: (onProgress?: (progress: { status: string; progress?: number }) => void) => Promise<T>,
): (onProgress?: (progress: { status: string; progress?: number }) => void) => Promise<T> {
  let instance: T | null = null;
  return async (onProgress) => {
    if (!instance) {
      instance = await factory(onProgress);
    }
    return instance;
  };
}

/** Embedding vector length for all-MiniLM-L6-v2 */
export const EMBEDDING_DIM = 384;
