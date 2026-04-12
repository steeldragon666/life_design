import { describe, it, expect } from 'vitest';
import {
  computeFinancialWellness,
  generateFinancialInsights,
  buildFinancialStressContext,
  type FinancialWellnessProfile,
} from '../financial-stress-reframe';
import type { FinancialStressResult } from '../financial-stress';

function makeStressResult(overrides: Partial<FinancialStressResult> = {}): FinancialStressResult {
  return {
    stressIndex: overrides.stressIndex ?? 25,
    stressLevel: overrides.stressLevel ?? 'low',
    triggers: overrides.triggers ?? [],
    spendingDeviation: overrides.spendingDeviation ?? 5,
    lateNightPurchases: overrides.lateNightPurchases ?? 0,
    incomeStability: overrides.incomeStability ?? 0.9,
  };
}

describe('computeFinancialWellness', () => {
  it('financialWellnessScore is weighted average of control, stability, mindfulness', () => {
    const stress = makeStressResult({ spendingDeviation: 20, incomeStability: 0.8, lateNightPurchases: 1 });
    const profile = computeFinancialWellness(stress);

    const expectedControl = 100 - Math.min(100, Math.abs(20));
    const expectedStability = 0.8 * 100;
    const expectedMindfulness = 100 - Math.min(100, 1 * 20);
    const expectedWellness = expectedControl * 0.4 + expectedStability * 0.3 + expectedMindfulness * 0.3;

    expect(profile.controlScore).toBe(expectedControl);
    expect(profile.stabilityScore).toBe(expectedStability);
    expect(profile.mindfulnessScore).toBe(expectedMindfulness);
    expect(profile.financialWellnessScore).toBeCloseTo(expectedWellness, 0);
  });

  it('controlScore calculation from spendingDeviation', () => {
    // Positive deviation
    const profile1 = computeFinancialWellness(makeStressResult({ spendingDeviation: 30 }));
    expect(profile1.controlScore).toBe(70);

    // Negative deviation (underspending) — should still use abs
    const profile2 = computeFinancialWellness(makeStressResult({ spendingDeviation: -20 }));
    expect(profile2.controlScore).toBe(80);

    // Extreme deviation capped at 0
    const profile3 = computeFinancialWellness(makeStressResult({ spendingDeviation: 150 }));
    expect(profile3.controlScore).toBe(0);
  });

  it('stabilityScore maps incomeStability to 0-100', () => {
    expect(computeFinancialWellness(makeStressResult({ incomeStability: 1 })).stabilityScore).toBe(100);
    expect(computeFinancialWellness(makeStressResult({ incomeStability: 0.5 })).stabilityScore).toBe(50);
    expect(computeFinancialWellness(makeStressResult({ incomeStability: 0 })).stabilityScore).toBe(0);
  });

  it('mindfulnessScore penalizes late-night purchases', () => {
    expect(computeFinancialWellness(makeStressResult({ lateNightPurchases: 0 })).mindfulnessScore).toBe(100);
    expect(computeFinancialWellness(makeStressResult({ lateNightPurchases: 2 })).mindfulnessScore).toBe(60);
    expect(computeFinancialWellness(makeStressResult({ lateNightPurchases: 5 })).mindfulnessScore).toBe(0);
    // Capped at 0 for 6+
    expect(computeFinancialWellness(makeStressResult({ lateNightPurchases: 8 })).mindfulnessScore).toBe(0);
  });

  it('trend detection: improving when stress decreased', () => {
    const current = makeStressResult({ stressIndex: 20 });
    const previous = makeStressResult({ stressIndex: 40 });
    const profile = computeFinancialWellness(current, previous);
    expect(profile.trend).toBe('improving');
  });

  it('trend detection: declining when stress increased', () => {
    const current = makeStressResult({ stressIndex: 50 });
    const previous = makeStressResult({ stressIndex: 30 });
    const profile = computeFinancialWellness(current, previous);
    expect(profile.trend).toBe('declining');
  });

  it('trend detection: stable when stress is similar', () => {
    const current = makeStressResult({ stressIndex: 25 });
    const previous = makeStressResult({ stressIndex: 27 });
    const profile = computeFinancialWellness(current, previous);
    expect(profile.trend).toBe('stable');
  });

  it('trend defaults to stable when no previous result', () => {
    const profile = computeFinancialWellness(makeStressResult());
    expect(profile.trend).toBe('stable');
  });

  it('edge case: zero stress = perfect wellness scores', () => {
    const stress = makeStressResult({
      stressIndex: 0,
      spendingDeviation: 0,
      lateNightPurchases: 0,
      incomeStability: 1,
    });
    const profile = computeFinancialWellness(stress);
    expect(profile.controlScore).toBe(100);
    expect(profile.stabilityScore).toBe(100);
    expect(profile.mindfulnessScore).toBe(100);
    expect(profile.financialWellnessScore).toBe(100);
  });
});

describe('generateFinancialInsights', () => {
  it('produces positive framing for good scores', () => {
    const stress = makeStressResult({
      stressIndex: 10,
      spendingDeviation: 5,
      lateNightPurchases: 0,
      incomeStability: 0.95,
    });
    const profile = computeFinancialWellness(stress);
    const insights = generateFinancialInsights(profile);

    expect(insights.length).toBeGreaterThanOrEqual(2);
    expect(insights.length).toBeLessThanOrEqual(3);
    // Should have positive language
    const joined = insights.join(' ').toLowerCase();
    expect(joined).toMatch(/consistent|disciplin|stable|track|well|within/i);
  });

  it('mentions concerns for poor scores', () => {
    const stress = makeStressResult({
      stressIndex: 70,
      spendingDeviation: 60,
      lateNightPurchases: 4,
      incomeStability: 0.3,
    });
    const profile = computeFinancialWellness(stress);
    const insights = generateFinancialInsights(profile);

    expect(insights.length).toBeGreaterThanOrEqual(2);
    const joined = insights.join(' ').toLowerCase();
    // Should mention something about spending or mindfulness concerns
    expect(joined).toMatch(/higher than usual|mindful|impulsive|attention|variable|irregular/i);
  });

  it('never mentions exact amounts', () => {
    const stress = makeStressResult({
      stressIndex: 45,
      spendingDeviation: 35,
      lateNightPurchases: 2,
      incomeStability: 0.6,
    });
    const profile = computeFinancialWellness(stress);
    const insights = generateFinancialInsights(profile);

    for (const insight of insights) {
      // Should not contain currency symbols or specific dollar/pound amounts
      expect(insight).not.toMatch(/\$\d|£\d|€\d|\d+\.\d{2}/);
    }
  });
});

describe('buildFinancialStressContext', () => {
  it('produces mentor-friendly string', () => {
    const stress = makeStressResult({
      stressIndex: 30,
      spendingDeviation: 15,
      lateNightPurchases: 1,
      incomeStability: 0.85,
    });
    const profile = computeFinancialWellness(stress);
    const context = buildFinancialStressContext(profile);

    expect(typeof context).toBe('string');
    expect(context.length).toBeGreaterThan(50);
    // Should use relative terms
    expect(context.toLowerCase()).toMatch(/wellness|score|stable|range/i);
    // Should not contain exact amounts
    expect(context).not.toMatch(/\$\d|£\d|€\d/);
    // Should include the instruction to not share numbers
    expect(context.toLowerCase()).toMatch(/never.*exact|do not.*exact|avoid.*exact/i);
  });

  it('does not expose exact financial amounts', () => {
    const stress = makeStressResult({ spendingDeviation: 42.5 });
    const profile = computeFinancialWellness(stress);
    const context = buildFinancialStressContext(profile);

    // Should not contain the raw deviation number
    expect(context).not.toContain('42.5');
  });
});
