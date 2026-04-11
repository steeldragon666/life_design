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
