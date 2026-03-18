/**
 * Embedding persistence helpers.
 *
 * After a checkin or goal is created/updated, call these functions to
 * asynchronously compute and persist the embedding vector to pgvector.
 *
 * The call is fire-and-forget — embedding failures should never block
 * the primary user action. The API route handles auth and ownership
 * verification independently.
 */

const EMBEDDING_API = '/api/embeddings';

/**
 * Persist the journal_embedding for a checkin.
 * Fire-and-forget — errors are logged but not thrown.
 */
export async function persistCheckinEmbedding(checkinId: string): Promise<void> {
  try {
    const res = await fetch(EMBEDDING_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkin_id: checkinId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[embedding-persistence] Checkin embedding failed:', body);
    }
  } catch (err) {
    console.warn('[embedding-persistence] Network error for checkin embedding:', err);
  }
}

/**
 * Persist the title_embedding for a goal.
 * Fire-and-forget — errors are logged but not thrown.
 */
export async function persistGoalEmbedding(goalId: string): Promise<void> {
  try {
    const res = await fetch(EMBEDDING_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal_id: goalId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[embedding-persistence] Goal embedding failed:', body);
    }
  } catch (err) {
    console.warn('[embedding-persistence] Network error for goal embedding:', err);
  }
}
