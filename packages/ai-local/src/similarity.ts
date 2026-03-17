// ---------------------------------------------------------------------------
// Vector Similarity Utilities
// ---------------------------------------------------------------------------
// Provides cosine similarity and related distance functions for embedding
// vectors. Used by classify.ts and summarize.ts for semantic comparisons.
// ---------------------------------------------------------------------------

/**
 * Compute the cosine similarity between two vectors.
 * Both vectors must have the same length. Returns a value in [-1, 1].
 * For L2-normalized vectors, this is equivalent to the dot product.
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(
      `cosineSimilarity: vectors must have the same length (got ${a.length} vs ${b.length})`,
    );
  }
  if (a.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;

  return dot / denom;
}

/**
 * Compute the Euclidean distance between two vectors.
 */
export function euclideanDistance(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(
      `euclideanDistance: vectors must have the same length (got ${a.length} vs ${b.length})`,
    );
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Find the top-K most similar items to a query vector.
 */
export function topKSimilar<T>(
  query: Float32Array,
  items: Array<{ embedding: Float32Array; data: T }>,
  k: number,
): Array<{ data: T; score: number }> {
  const scored = items.map((item) => ({
    data: item.data,
    score: cosineSimilarity(query, item.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

// ---------------------------------------------------------------------------
// Types used by index.ts re-exports
// ---------------------------------------------------------------------------

export interface ScoredCheckIn {
  checkInId: number;
  score: number;
  date: string;
}

export interface Cluster {
  centroid: Float32Array;
  memberIds: number[];
  label?: string;
}
