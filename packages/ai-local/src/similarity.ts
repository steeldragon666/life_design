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

// ---------------------------------------------------------------------------
// Check-in similarity search
// ---------------------------------------------------------------------------

interface CheckInRecord {
  id: string;
  journal_entry?: string;
  [key: string]: unknown;
}

interface SimilarCheckInResult {
  checkIn: CheckInRecord;
  similarity: number;
}

interface ClusterResult {
  centroid: Float32Array;
  label: string;
  members: CheckInRecord[];
}

/**
 * Find check-ins most similar to a query string.
 * Embeds the query and all check-in journal entries, then ranks by cosine similarity.
 */
export async function findSimilarCheckIns(
  query: string,
  checkIns: CheckInRecord[],
  topK = 5,
): Promise<SimilarCheckInResult[]> {
  if (checkIns.length === 0) return [];

  const { embed } = await import('./embed');
  const queryVec = await embed(query);

  const results: SimilarCheckInResult[] = [];
  for (const checkIn of checkIns) {
    const text = checkIn.journal_entry ?? '';
    const vec = await embed(text);
    results.push({ checkIn, similarity: cosineSimilarity(queryVec, vec) });
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
}

/**
 * Cluster check-ins into k groups using a simple k-means-like approach.
 */
export async function clusterCheckIns(
  checkIns: CheckInRecord[],
  k = 3,
): Promise<ClusterResult[]> {
  if (checkIns.length === 0) return [];

  const { embed } = await import('./embed');
  const embeddings: Float32Array[] = [];
  for (const checkIn of checkIns) {
    embeddings.push(await embed(checkIn.journal_entry ?? ''));
  }

  const dim = embeddings[0].length;
  const effectiveK = Math.min(k, checkIns.length);

  // Initialize centroids with first k embeddings
  const centroids = embeddings.slice(0, effectiveK).map((e) => new Float32Array(e));
  const assignments = new Array<number>(checkIns.length).fill(0);

  // Run 10 iterations of k-means
  for (let iter = 0; iter < 10; iter++) {
    // Assign each point to nearest centroid
    for (let i = 0; i < embeddings.length; i++) {
      let bestDist = Infinity;
      let bestCluster = 0;
      for (let c = 0; c < centroids.length; c++) {
        const dist = euclideanDistance(embeddings[i], centroids[c]);
        if (dist < bestDist) {
          bestDist = dist;
          bestCluster = c;
        }
      }
      assignments[i] = bestCluster;
    }

    // Recompute centroids
    for (let c = 0; c < centroids.length; c++) {
      const members = assignments.reduce<number[]>((acc, a, i) => {
        if (a === c) acc.push(i);
        return acc;
      }, []);
      if (members.length === 0) continue;

      const newCentroid = new Float32Array(dim);
      for (const idx of members) {
        for (let d = 0; d < dim; d++) {
          newCentroid[d] += embeddings[idx][d];
        }
      }
      for (let d = 0; d < dim; d++) {
        newCentroid[d] /= members.length;
      }
      centroids[c] = newCentroid;
    }
  }

  // Build result
  const clusters: ClusterResult[] = [];
  for (let c = 0; c < centroids.length; c++) {
    const members = checkIns.filter((_, i) => assignments[i] === c);
    if (members.length === 0) continue;
    clusters.push({
      centroid: centroids[c],
      label: `Cluster ${c + 1}`,
      members,
    });
  }

  return clusters;
}
