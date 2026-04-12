import { describe, it, expect } from 'vitest';
import {
  createPrivacyBudget,
  canParticipateWithBudget,
  recordParticipation,
  getRemainingBudget,
  estimateRoundsRemaining,
} from '../privacy-budget';

describe('Privacy Budget', () => {
  it('createPrivacyBudget uses defaults', () => {
    const budget = createPrivacyBudget();
    expect(budget.totalEpsilon).toBe(0);
    expect(budget.totalDelta).toBe(0);
    expect(budget.maxEpsilon).toBe(10.0);
    expect(budget.maxDelta).toBe(1e-4);
    expect(budget.roundsParticipated).toBe(0);
    expect(budget.lastParticipation).toBe('');
  });

  it('createPrivacyBudget accepts custom limits', () => {
    const budget = createPrivacyBudget(5.0, 1e-6);
    expect(budget.maxEpsilon).toBe(5.0);
    expect(budget.maxDelta).toBe(1e-6);
  });

  it('canParticipateWithBudget returns true when within budget', () => {
    const budget = createPrivacyBudget();
    expect(canParticipateWithBudget(budget, 1.0, 1e-5)).toBe(true);
  });

  it('canParticipateWithBudget returns false when would exceed epsilon', () => {
    const budget = createPrivacyBudget(2.0);
    const updated = recordParticipation(budget, {
      roundId: 'r1',
      epsilon: 1.5,
      delta: 1e-5,
      timestamp: '2026-01-01T00:00:00Z',
    });
    expect(canParticipateWithBudget(updated, 1.0, 1e-5)).toBe(false);
  });

  it('canParticipateWithBudget returns false when would exceed delta', () => {
    const budget = createPrivacyBudget(10.0, 2e-5);
    const updated = recordParticipation(budget, {
      roundId: 'r1',
      epsilon: 1.0,
      delta: 1.5e-5,
      timestamp: '2026-01-01T00:00:00Z',
    });
    expect(canParticipateWithBudget(updated, 0.5, 1e-5)).toBe(false);
  });

  it('recordParticipation updates totals correctly', () => {
    let budget = createPrivacyBudget();
    budget = recordParticipation(budget, {
      roundId: 'r1',
      epsilon: 1.0,
      delta: 1e-5,
      timestamp: '2026-01-01T00:00:00Z',
    });
    expect(budget.totalEpsilon).toBe(1.0);
    expect(budget.totalDelta).toBe(1e-5);
    expect(budget.roundsParticipated).toBe(1);
    expect(budget.lastParticipation).toBe('2026-01-01T00:00:00Z');

    budget = recordParticipation(budget, {
      roundId: 'r2',
      epsilon: 2.0,
      delta: 2e-5,
      timestamp: '2026-01-02T00:00:00Z',
    });
    expect(budget.totalEpsilon).toBe(3.0);
    expect(budget.totalDelta).toBeCloseTo(3e-5, 10);
    expect(budget.roundsParticipated).toBe(2);
    expect(budget.lastParticipation).toBe('2026-01-02T00:00:00Z');
  });

  it('getRemainingBudget calculates percentage', () => {
    let budget = createPrivacyBudget(10.0, 1e-4);
    budget = recordParticipation(budget, {
      roundId: 'r1',
      epsilon: 3.0,
      delta: 2e-5,
      timestamp: '2026-01-01T00:00:00Z',
    });
    const remaining = getRemainingBudget(budget);
    expect(remaining.epsilonRemaining).toBe(7.0);
    expect(remaining.deltaRemaining).toBeCloseTo(8e-5, 10);
    expect(remaining.percentUsed).toBe(30); // 3/10 = 30%
  });

  it('estimateRoundsRemaining with different per-round costs', () => {
    const budget = createPrivacyBudget(10.0);
    expect(estimateRoundsRemaining(budget, 1.0)).toBe(10);
    expect(estimateRoundsRemaining(budget, 2.0)).toBe(5);
    expect(estimateRoundsRemaining(budget, 3.0)).toBe(3);

    const used = recordParticipation(budget, {
      roundId: 'r1',
      epsilon: 4.0,
      delta: 1e-5,
      timestamp: '2026-01-01T00:00:00Z',
    });
    expect(estimateRoundsRemaining(used, 2.0)).toBe(3);
  });
});
