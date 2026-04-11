import { describe, it, expect } from 'vitest';
import { aggregateGradients, GradientSubmission } from '../aggregation';

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
});
