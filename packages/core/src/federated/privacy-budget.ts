export interface PrivacyBudget {
  totalEpsilon: number;
  totalDelta: number;
  maxEpsilon: number;
  maxDelta: number;
  roundsParticipated: number;
  lastParticipation: string;
}

export interface PrivacyAccountingEntry {
  roundId: string;
  epsilon: number;
  delta: number;
  timestamp: string;
}

/**
 * Initialize a privacy budget with default or custom limits.
 */
export function createPrivacyBudget(
  maxEpsilon: number = 10.0,
  maxDelta: number = 1e-4,
): PrivacyBudget {
  return {
    totalEpsilon: 0,
    totalDelta: 0,
    maxEpsilon,
    maxDelta,
    roundsParticipated: 0,
    lastParticipation: '',
  };
}

/**
 * Check if participating in a round would exceed the privacy budget.
 * Uses simple composition: epsilon and delta both sum.
 */
export function canParticipateWithBudget(
  budget: PrivacyBudget,
  roundEpsilon: number,
  roundDelta: number,
): boolean {
  return (
    budget.totalEpsilon + roundEpsilon <= budget.maxEpsilon &&
    budget.totalDelta + roundDelta <= budget.maxDelta
  );
}

/**
 * Record a participation event, returning an updated (immutable) budget.
 */
export function recordParticipation(
  budget: PrivacyBudget,
  entry: PrivacyAccountingEntry,
): PrivacyBudget {
  return {
    ...budget,
    totalEpsilon: budget.totalEpsilon + entry.epsilon,
    totalDelta: budget.totalDelta + entry.delta,
    roundsParticipated: budget.roundsParticipated + 1,
    lastParticipation: entry.timestamp,
  };
}

/**
 * Calculate remaining budget and percentage used.
 * Percentage is based on epsilon consumption (the primary privacy metric).
 */
export function getRemainingBudget(budget: PrivacyBudget): {
  epsilonRemaining: number;
  deltaRemaining: number;
  percentUsed: number;
} {
  return {
    epsilonRemaining: budget.maxEpsilon - budget.totalEpsilon,
    deltaRemaining: budget.maxDelta - budget.totalDelta,
    percentUsed: (budget.totalEpsilon / budget.maxEpsilon) * 100,
  };
}

/**
 * Estimate how many more rounds the user can participate in
 * given a per-round epsilon cost.
 */
export function estimateRoundsRemaining(
  budget: PrivacyBudget,
  perRoundEpsilon: number,
): number {
  const remaining = budget.maxEpsilon - budget.totalEpsilon;
  return Math.floor(remaining / perRoundEpsilon);
}
