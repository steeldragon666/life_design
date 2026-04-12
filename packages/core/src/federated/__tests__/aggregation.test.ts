import { describe, it, expect } from 'vitest';
import {
  aggregateGradients,
  GradientSubmission,
  FederatedRound,
  validateRoundReadiness,
  computeModelDrift,
} from '../aggregation';

describe('aggregateGradients', () => {
  it('returns null for empty submissions', () => {
    expect(aggregateGradients([], 'round-1')).toBeNull();
  });

  it('returns the single submission gradients when only one participant', () => {
    const submissions: GradientSubmission[] = [
      { userId: 'u1', weights: [0.5, -0.3, 1.2], bias: 0.1, sampleCount: 10 },
    ];
    const result = aggregateGradients(submissions, 'round-2');
    expect(result).not.toBeNull();
    expect(result!.averageWeights).toEqual([0.5, -0.3, 1.2]);
    expect(result!.averageBias).toBe(0.1);
  });

  it('computes simple average for two equal submissions', () => {
    const submissions: GradientSubmission[] = [
      { userId: 'u1', weights: [1.0, 2.0], bias: 0.5, sampleCount: 10 },
      { userId: 'u2', weights: [3.0, 4.0], bias: 1.5, sampleCount: 10 },
    ];
    const result = aggregateGradients(submissions, 'round-3');
    expect(result).not.toBeNull();
    expect(result!.averageWeights).toEqual([2.0, 3.0]);
    expect(result!.averageBias).toBe(1.0);
  });

  it('weights average by sample count', () => {
    const submissions: GradientSubmission[] = [
      { userId: 'u1', weights: [1.0], bias: 0.0, sampleCount: 30 },
      { userId: 'u2', weights: [4.0], bias: 3.0, sampleCount: 10 },
    ];
    // weighted: (1.0*30 + 4.0*10)/40 = 70/40 = 1.75
    // bias: (0*30 + 3*10)/40 = 30/40 = 0.75
    const result = aggregateGradients(submissions, 'round-4');
    expect(result).not.toBeNull();
    expect(result!.averageWeights).toEqual([1.75]);
    expect(result!.averageBias).toBe(0.75);
  });

  it('returns null when all sample counts are zero', () => {
    const submissions: GradientSubmission[] = [
      { userId: 'u1', weights: [1.0], bias: 0.5, sampleCount: 0 },
      { userId: 'u2', weights: [2.0], bias: 1.0, sampleCount: 0 },
    ];
    expect(aggregateGradients(submissions, 'round-5')).toBeNull();
  });

  it('reports correct participantCount and totalSamples', () => {
    const submissions: GradientSubmission[] = [
      { userId: 'u1', weights: [0.1], bias: 0.0, sampleCount: 5 },
      { userId: 'u2', weights: [0.2], bias: 0.0, sampleCount: 15 },
      { userId: 'u3', weights: [0.3], bias: 0.0, sampleCount: 30 },
    ];
    const result = aggregateGradients(submissions, 'round-6');
    expect(result).not.toBeNull();
    expect(result!.participantCount).toBe(3);
    expect(result!.totalSamples).toBe(50);
  });

  it('passes through the roundId correctly', () => {
    const submissions: GradientSubmission[] = [
      { userId: 'u1', weights: [1.0], bias: 0.0, sampleCount: 1 },
    ];
    const result = aggregateGradients(submissions, 'my-custom-round-id');
    expect(result).not.toBeNull();
    expect(result!.roundId).toBe('my-custom-round-id');
  });

  it('returns null when submissions have mismatched weight vector lengths', () => {
    const submissions: GradientSubmission[] = [
      { userId: 'u1', weights: [1.0, 2.0], bias: 0.5, sampleCount: 10 },
      { userId: 'u2', weights: [3.0], bias: 1.5, sampleCount: 10 },
    ];
    expect(aggregateGradients(submissions, 'round-mismatch')).toBeNull();
  });
});

describe('validateRoundReadiness', () => {
  const makeRound = (overrides: Partial<FederatedRound> = {}): FederatedRound => ({
    id: 'round-1',
    roundNumber: 1,
    targetDimension: 'sleep',
    status: 'open',
    minParticipants: 5,
    participantCount: 0,
    openedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  });

  it('is ready when enough participants and status is open', () => {
    const result = validateRoundReadiness(makeRound(), 5);
    expect(result.ready).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('is not ready when too few participants', () => {
    const result = validateRoundReadiness(makeRound(), 3);
    expect(result.ready).toBe(false);
    expect(result.reason).toContain('Not enough participants');
  });

  it('is not ready when status is not open', () => {
    const result = validateRoundReadiness(makeRound({ status: 'aggregating' }), 10);
    expect(result.ready).toBe(false);
    expect(result.reason).toContain('aggregating');
  });
});

describe('computeModelDrift', () => {
  it('returns 0 for identical weights', () => {
    expect(computeModelDrift([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it('returns a value between 0 and 1 for different weights', () => {
    const drift = computeModelDrift([1, 0, 0], [0, 1, 0]);
    expect(drift).toBeGreaterThan(0);
    expect(drift).toBeLessThanOrEqual(1);
    // Orthogonal vectors should have drift = 1
    expect(drift).toBeCloseTo(1, 10);
  });

  it('handles empty arrays', () => {
    expect(computeModelDrift([], [])).toBe(0);
    expect(computeModelDrift([1, 2], [])).toBe(0);
    expect(computeModelDrift([], [1, 2])).toBe(0);
  });
});
