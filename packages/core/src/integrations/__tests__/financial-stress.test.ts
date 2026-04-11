import { describe, it, expect } from 'vitest';
import {
  computeFinancialStressIndex,
  computeSpendingBaseline,
  type Transaction,
  type SpendingBaseline,
} from '../financial-stress';

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    date: overrides.date ?? '2025-01-15',
    amount: overrides.amount ?? -10,
    category: overrides.category ?? 'groceries',
    description: overrides.description ?? 'Test purchase',
  };
}

const defaultBaseline: SpendingBaseline = {
  avgDailySpend: 50,
  avgWeeklyIncome: 500,
  categoryAverages: { groceries: 20, entertainment: 10, bills: 15 },
};

describe('computeFinancialStressIndex', () => {
  it('returns low stress (index=0) for empty transactions', () => {
    const result = computeFinancialStressIndex([], defaultBaseline);
    expect(result.stressIndex).toBe(0);
    expect(result.stressLevel).toBe('low');
    expect(result.triggers).toEqual([]);
    expect(result.spendingDeviation).toBe(0);
    expect(result.lateNightPurchases).toBe(0);
    expect(result.incomeStability).toBe(1);
  });

  it('returns low stress when spending is at baseline', () => {
    // 7 days of spending at exactly $50/day
    const transactions: Transaction[] = [];
    for (let d = 1; d <= 7; d++) {
      transactions.push(makeTx({ date: `2025-01-${String(d).padStart(2, '0')}`, amount: -50 }));
      transactions.push(makeTx({ date: `2025-01-${String(d).padStart(2, '0')}`, amount: 500 / 7, category: 'income' }));
    }
    const result = computeFinancialStressIndex(transactions, defaultBaseline);
    expect(result.stressLevel).toBe('low');
    expect(result.stressIndex).toBeLessThanOrEqual(30);
  });

  it('returns moderate/high stress when spending 50% above baseline', () => {
    const transactions: Transaction[] = [];
    for (let d = 1; d <= 7; d++) {
      // $75/day instead of $50 = 50% above baseline
      transactions.push(makeTx({ date: `2025-01-${String(d).padStart(2, '0')}`, amount: -75 }));
    }
    // Add stable income separately so unique days don't dilute daily spend
    transactions.push(makeTx({ date: '2025-01-01', amount: 500, category: 'income' }));
    const result = computeFinancialStressIndex(transactions, defaultBaseline);
    expect(result.stressIndex).toBeGreaterThan(30);
    expect(result.spendingDeviation).toBeCloseTo(50, 0);
    expect(['moderate', 'high']).toContain(result.stressLevel);
  });

  it('increases stress for late night purchases', () => {
    const normalTx: Transaction[] = [
      makeTx({ date: '2025-01-15T14:00:00', amount: -50 }),
    ];
    const lateNightTx: Transaction[] = [
      makeTx({ date: '2025-01-15T23:30:00', amount: -50 }),
    ];
    const resultNormal = computeFinancialStressIndex(normalTx, defaultBaseline);
    const resultLate = computeFinancialStressIndex(lateNightTx, defaultBaseline);
    expect(resultLate.lateNightPurchases).toBe(1);
    expect(resultNormal.lateNightPurchases).toBe(0);
    expect(resultLate.stressIndex).toBeGreaterThan(resultNormal.stressIndex);
  });

  it('produces lower stress contribution from stable income', () => {
    // Stable: same income each week
    const stableTx: Transaction[] = [
      makeTx({ date: '2025-01-07', amount: 500, category: 'income' }),
      makeTx({ date: '2025-01-14', amount: 500, category: 'income' }),
      makeTx({ date: '2025-01-21', amount: 500, category: 'income' }),
    ];
    const result = computeFinancialStressIndex(stableTx, defaultBaseline);
    expect(result.incomeStability).toBeCloseTo(1, 1);
  });

  it('produces higher stress from unstable income', () => {
    const unstableTx: Transaction[] = [
      makeTx({ date: '2025-01-07', amount: 200, category: 'income' }),
      makeTx({ date: '2025-01-14', amount: 800, category: 'income' }),
      makeTx({ date: '2025-01-21', amount: 100, category: 'income' }),
    ];
    const result = computeFinancialStressIndex(unstableTx, defaultBaseline);
    expect(result.incomeStability).toBeLessThan(0.5);
    // Unstable income should produce higher stress than stable
    const stableResult = computeFinancialStressIndex(
      [
        makeTx({ date: '2025-01-07', amount: 500, category: 'income' }),
        makeTx({ date: '2025-01-14', amount: 500, category: 'income' }),
        makeTx({ date: '2025-01-21', amount: 500, category: 'income' }),
      ],
      defaultBaseline,
    );
    expect(result.stressIndex).toBeGreaterThan(stableResult.stressIndex);
  });

  it('generates correct triggers for each factor', () => {
    const transactions: Transaction[] = [
      // High spending — all on same days to keep unique day count low
      makeTx({ date: '2025-01-15T23:30:00', amount: -100 }),
      makeTx({ date: '2025-01-15T22:15:00', amount: -80 }),
      // Unstable income on same day so unique days stays at 1
      makeTx({ date: '2025-01-15', amount: 200, category: 'income' }),
    ];
    const result = computeFinancialStressIndex(transactions, defaultBaseline);
    expect(result.triggers.length).toBeGreaterThan(0);
    // Should mention spending deviation
    const hasSpendingTrigger = result.triggers.some((t) => t.toLowerCase().includes('spending'));
    expect(hasSpendingTrigger).toBe(true);
    // Should mention late-night
    const hasLateNightTrigger = result.triggers.some((t) => t.toLowerCase().includes('late'));
    expect(hasLateNightTrigger).toBe(true);
  });

  it('stress levels: <=30 low, <=60 moderate, >60 high', () => {
    // We test boundary by verifying the mapping function
    // Low: no stress factors
    const lowResult = computeFinancialStressIndex([], defaultBaseline);
    expect(lowResult.stressLevel).toBe('low');

    // High: extreme spending + late night + unstable income
    const highTx: Transaction[] = [];
    for (let d = 1; d <= 14; d++) {
      highTx.push(makeTx({ date: `2025-01-${String(d).padStart(2, '0')}T23:30:00`, amount: -200 }));
    }
    highTx.push(makeTx({ date: '2025-01-07', amount: 100, category: 'income' }));
    highTx.push(makeTx({ date: '2025-01-14', amount: 900, category: 'income' }));
    const highResult = computeFinancialStressIndex(highTx, defaultBaseline);
    expect(highResult.stressLevel).toBe('high');
    expect(highResult.stressIndex).toBeGreaterThan(60);
  });
});

describe('computeSpendingBaseline', () => {
  it('computes correct averages from historical transactions', () => {
    const transactions: Transaction[] = [];
    // 28 days of spending: $40/day on groceries, $10/day on entertainment
    for (let d = 1; d <= 28; d++) {
      const dd = String(d).padStart(2, '0');
      transactions.push(makeTx({ date: `2025-01-${dd}`, amount: -40, category: 'groceries' }));
      transactions.push(makeTx({ date: `2025-01-${dd}`, amount: -10, category: 'entertainment' }));
      // Weekly income on days 7, 14, 21, 28
      if (d % 7 === 0) {
        transactions.push(makeTx({ date: `2025-01-${dd}`, amount: 700, category: 'income' }));
      }
    }
    const baseline = computeSpendingBaseline(transactions, 28);
    expect(baseline.avgDailySpend).toBeCloseTo(50, 0);
    expect(baseline.avgWeeklyIncome).toBeCloseTo(700, 0);
    expect(baseline.categoryAverages['groceries']).toBeCloseTo(40, 0);
    expect(baseline.categoryAverages['entertainment']).toBeCloseTo(10, 0);
  });

  it('returns zeros for empty transactions', () => {
    const baseline = computeSpendingBaseline([], 30);
    expect(baseline.avgDailySpend).toBe(0);
    expect(baseline.avgWeeklyIncome).toBe(0);
    expect(Object.keys(baseline.categoryAverages)).toHaveLength(0);
  });
});
