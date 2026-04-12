/**
 * @module client/embeddings
 *
 * Embedding generation for DRM memory retrieval.
 *
 * The production path will call Voyage AI (via Anthropic) once that endpoint
 * is stabilised.  For now a deterministic, hash-based placeholder is provided
 * so the rest of the pipeline can develop against a stable interface without
 * an external dependency.
 *
 * Swap in a real model by replacing `generateEmbedding` — the dimension
 * constant, `cosineSimilarity`, and all call sites remain unchanged.
 */

// ── Constants ────────────────────────────────────────────────────────────────

/** Target vector dimension — matches OpenAI ada-002 / Voyage-2 output size. */
export const EMBEDDING_DIMENSIONS = 1536;

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Deterministic 32-bit integer hash (FNV-1a variant) over a UTF-16 string.
 * Pure function — identical input always produces identical output.
 */
function fnv1a32(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    // Simulate 32-bit unsigned integer overflow without bitwise tricks that
    // TypeScript narrows to signed int32.
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash;
}

/**
 * Seed a simple LCG PRNG from a 32-bit integer and return a callable that
 * produces the next value in [0, 1) on each invocation.
 */
function seededRng(seed: number): () => number {
  let state = seed >>> 0;
  return (): number => {
    // LCG parameters from Numerical Recipes
    state = ((state * 1664525 + 1013904223) >>> 0);
    return state / 0x100000000;
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a `EMBEDDING_DIMENSIONS`-dimensional embedding vector for `text`.
 *
 * **Current implementation:** deterministic placeholder derived from a hash
 * of the input text, normalised to unit length.  The vector is stable across
 * runs — the same string always produces the same embedding — but cosine
 * similarity between unrelated strings is essentially random.
 *
 * **Production replacement:** swap the body of this function for a real
 * Voyage AI or `text-embedding-3-small` call; the signature and the
 * `EMBEDDING_DIMENSIONS` constant must stay consistent with whatever model
 * is used.
 *
 * @param text    The text to embed (conversation turn, memory summary, etc.)
 * @param _apiKey Reserved for future use when calling an external model.
 */
export async function generateEmbedding(
  text: string,
  _apiKey: string,
): Promise<number[]> {
  const seed = fnv1a32(text);
  const next = seededRng(seed);

  // Fill a raw vector
  const raw = new Float64Array(EMBEDDING_DIMENSIONS);
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
    // Map [0,1) → [-1, 1)
    raw[i] = next() * 2 - 1;
  }

  // L2-normalise so every vector lives on the unit sphere and cosine
  // similarity equals the dot product.
  let magnitude = 0;
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
    magnitude += raw[i] * raw[i];
  }
  magnitude = Math.sqrt(magnitude);

  if (magnitude === 0) {
    // Degenerate edge-case: return zero vector (shouldn't happen with the LCG)
    return Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0);
  }

  return Array.from(raw, (v) => v / magnitude);
}

/**
 * Compute cosine similarity between two L2-normalised embedding vectors.
 *
 * Returns a value in `[-1, 1]`:
 * - `1`  → identical direction (semantically equivalent)
 * - `0`  → orthogonal (unrelated)
 * - `-1` → opposite direction (antonymous)
 *
 * Throws if the vectors have different lengths.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `cosineSimilarity: vector length mismatch (${a.length} vs ${b.length})`,
    );
  }

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  const denominator = Math.sqrt(magA) * Math.sqrt(magB);

  if (denominator === 0) return 0;

  // Clamp to [-1, 1] to guard against floating-point drift
  return Math.max(-1, Math.min(1, dot / denominator));
}
