import { pipeline, type FeatureExtractionPipeline } from './transformers-entry';
import { MODEL_REGISTRY, EMBEDDING_DIM, lazySingleton } from './models';

const getExtractor = lazySingleton<FeatureExtractionPipeline>(async (onProgress) => {
  return (await pipeline('feature-extraction', MODEL_REGISTRY.embedding.modelId, {
    progress_callback: onProgress,
  })) as FeatureExtractionPipeline;
});

function l2Normalize(vec: Float32Array): Float32Array {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  const out = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i++) {
    out[i] = vec[i] / norm;
  }
  return out;
}

/**
 * Compute a normalized embedding vector for the given text.
 * Uses mean pooling across tokens + L2 normalization.
 */
export async function embed(
  text: string,
  onProgress?: (progress: { status: string; progress?: number }) => void,
): Promise<Float32Array> {
  if (!text.trim()) {
    return new Float32Array(EMBEDDING_DIM);
  }
  const ext = await getExtractor(onProgress);
  const output = await ext(text, { pooling: 'mean', normalize: true });
  const raw = output.tolist()[0] as number[];
  const vec = new Float32Array(raw);
  return l2Normalize(vec);
}

/**
 * Compute normalized embeddings for a batch of texts.
 * Uses true batch processing when the pipeline supports array input.
 */
export async function embedBatch(
  texts: string[],
  onProgress?: (progress: { status: string; progress?: number }) => void,
): Promise<Float32Array[]> {
  if (texts.length === 0) return [];

  const ext = await getExtractor(onProgress);

  // True batch: pass all texts as an array for ~5x speedup on 10+ texts
  const nonEmpty = texts.map((t) => t.trim() || ' ');
  const output = await ext(nonEmpty, { pooling: 'mean', normalize: true });
  const rawBatch = output.tolist() as number[][];

  return rawBatch.map((raw) => l2Normalize(new Float32Array(raw)));
}

export { EMBEDDING_DIM };
