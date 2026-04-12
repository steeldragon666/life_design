export interface GradientSubmission {
  userId: string;
  weights: number[];
  bias: number;
  sampleCount: number;
}

export interface AggregateResult {
  averageWeights: number[];
  averageBias: number;
  totalSamples: number;
  participantCount: number;
  roundId: string;
}

export interface FederatedRound {
  id: string;
  roundNumber: number;
  targetDimension: string;
  status: 'open' | 'aggregating' | 'complete';
  minParticipants: number;
  participantCount: number;
  openedAt: string;
  closedAt?: string;
}

export interface FederatedModel {
  targetDimension: string;
  modelVersion: number;
  weights: number[];
  bias: number;
  totalSamples: number;
  participantCount: number;
}

/**
 * Check if a round has enough participants and is in the correct state for aggregation.
 */
export function validateRoundReadiness(
  round: FederatedRound,
  submissions: number,
): { ready: boolean; reason?: string } {
  if (round.status !== 'open') {
    return { ready: false, reason: `Round status is '${round.status}', expected 'open'` };
  }
  if (submissions < round.minParticipants) {
    return {
      ready: false,
      reason: `Not enough participants: ${submissions}/${round.minParticipants}`,
    };
  }
  return { ready: true };
}

/**
 * Cosine distance between two weight vectors.
 * Returns 0 for identical vectors, 1 for orthogonal vectors.
 * For empty arrays, returns 0.
 */
export function computeModelDrift(oldWeights: number[], newWeights: number[]): number {
  if (oldWeights.length === 0 || newWeights.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < oldWeights.length; i++) {
    dotProduct += oldWeights[i] * newWeights[i];
    normA += oldWeights[i] * oldWeights[i];
    normB += newWeights[i] * newWeights[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  const cosineSimilarity = dotProduct / magnitude;
  // Clamp to [-1, 1] to handle floating point errors
  const clamped = Math.max(-1, Math.min(1, cosineSimilarity));
  return 1 - clamped;
}

/**
 * Federated averaging: weighted average of gradients based on sample count.
 * Server never sees raw data — only noisy gradients from GradientEncoder.
 */
export function aggregateGradients(
  submissions: GradientSubmission[],
  roundId: string,
): AggregateResult | null {
  if (submissions.length === 0) return null;

  const totalSamples = submissions.reduce((s, sub) => s + sub.sampleCount, 0);
  if (totalSamples === 0) return null;

  const nWeights = submissions[0].weights.length;
  if (submissions.some(s => s.weights.length !== nWeights)) {
    return null;
  }
  const avgWeights = new Array(nWeights).fill(0);
  let avgBias = 0;

  for (const sub of submissions) {
    const weight = sub.sampleCount / totalSamples;
    for (let i = 0; i < nWeights; i++) {
      avgWeights[i] += sub.weights[i] * weight;
    }
    avgBias += sub.bias * weight;
  }

  return {
    averageWeights: avgWeights.map((w) => Math.round(w * 10000) / 10000),
    averageBias: Math.round(avgBias * 10000) / 10000,
    totalSamples,
    participantCount: submissions.length,
    roundId,
  };
}
