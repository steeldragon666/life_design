export interface Transaction {
  date: string;           // YYYY-MM-DD or ISO datetime
  amount: number;         // positive = income, negative = expense
  category: string;       // 'groceries', 'entertainment', 'bills', 'income', 'transfer', etc.
  description: string;
}

export interface SpendingBaseline {
  avgDailySpend: number;
  avgWeeklyIncome: number;
  categoryAverages: Record<string, number>;
}

export interface FinancialStressResult {
  stressIndex: number;           // 0-100 (higher = more stressed)
  stressLevel: 'low' | 'moderate' | 'high';
  triggers: string[];            // e.g., "Spending 40% above baseline", "Late-night purchases detected"
  spendingDeviation: number;     // % deviation from baseline (positive = overspending)
  lateNightPurchases: number;    // count of purchases after 22:00 (impulse indicator)
  incomeStability: number;       // 0-1 (1 = very stable)
}

/**
 * Compute financial stress index from transactions against a spending baseline.
 *
 * Factors:
 * 1. Spending deviation from baseline (40% weight)
 * 2. Income stability — coefficient of variation of weekly income (20% weight)
 * 3. Late-night purchases (impulse spending indicator) (20% weight)
 * 4. Essential vs discretionary spending ratio change (20% weight)
 */
export function computeFinancialStressIndex(
  transactions: Transaction[],
  baseline: SpendingBaseline,
): FinancialStressResult {
  if (transactions.length === 0) {
    return {
      stressIndex: 0,
      stressLevel: 'low',
      triggers: [],
      spendingDeviation: 0,
      lateNightPurchases: 0,
      incomeStability: 1,
    };
  }

  const triggers: string[] = [];

  // --- 1. Spending deviation (40% weight) ---
  const expenses = transactions.filter((t) => t.amount < 0);
  const totalSpend = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const days = countUniqueDays(transactions);
  const actualDailySpend = days > 0 ? totalSpend / days : 0;
  const spendingDeviation =
    baseline.avgDailySpend > 0
      ? ((actualDailySpend - baseline.avgDailySpend) / baseline.avgDailySpend) * 100
      : 0;

  // Map deviation to 0-100 score: 0% = 0, 50% = 100 (aggressive scaling)
  const spendingScore = Math.min(100, Math.max(0, spendingDeviation * 2));

  if (spendingDeviation > 10) {
    triggers.push(`Spending ${Math.round(spendingDeviation)}% above baseline`);
  }

  // --- 2. Income stability (20% weight) ---
  const incomeByWeek = groupIncomeByWeek(transactions);
  const incomeStability = computeIncomeStability(incomeByWeek);
  const incomeInstabilityScore = (1 - incomeStability) * 100;

  if (incomeStability < 0.7) {
    triggers.push(`Income stability is low (${Math.round(incomeStability * 100)}%)`);
  }

  // --- 3. Late-night purchases (20% weight) ---
  const lateNightPurchases = countLateNightPurchases(transactions);
  // Scale: 0 late-night = 0, 5+ = 100
  const lateNightScore = Math.min(100, (lateNightPurchases / 5) * 100);

  if (lateNightPurchases > 0) {
    triggers.push(
      `Late-night purchases detected (${lateNightPurchases} transaction${lateNightPurchases > 1 ? 's' : ''} after 22:00)`,
    );
  }

  // --- 4. Essential vs discretionary ratio change (20% weight) ---
  const essentialCategories = new Set(['groceries', 'bills', 'rent', 'utilities', 'healthcare']);
  const essentialSpend = expenses
    .filter((t) => essentialCategories.has(t.category))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const discretionarySpend = expenses
    .filter((t) => !essentialCategories.has(t.category) && t.category !== 'income' && t.category !== 'transfer')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Higher discretionary ratio = more stress potential
  const totalExpenses = essentialSpend + discretionarySpend;
  const discretionaryRatio = totalExpenses > 0 ? discretionarySpend / totalExpenses : 0;

  // Compare to baseline ratios
  const baselineEssential = Object.entries(baseline.categoryAverages)
    .filter(([cat]) => essentialCategories.has(cat))
    .reduce((sum, [, avg]) => sum + avg, 0);
  const baselineTotal = Object.values(baseline.categoryAverages).reduce((sum, v) => sum + v, 0);
  const baselineDiscretionaryRatio =
    baselineTotal > 0 ? (baselineTotal - baselineEssential) / baselineTotal : 0.5;

  const ratioShift = discretionaryRatio - baselineDiscretionaryRatio;
  const ratioScore = Math.min(100, Math.max(0, ratioShift * 200)); // 50% shift = 100

  if (ratioShift > 0.1) {
    triggers.push(
      `Discretionary spending ratio increased by ${Math.round(ratioShift * 100)}%`,
    );
  }

  // --- Weighted combination ---
  const stressIndex = Math.round(
    Math.min(
      100,
      Math.max(
        0,
        spendingScore * 0.4 +
          incomeInstabilityScore * 0.2 +
          lateNightScore * 0.2 +
          ratioScore * 0.2,
      ),
    ),
  );

  const stressLevel: 'low' | 'moderate' | 'high' =
    stressIndex <= 30 ? 'low' : stressIndex <= 60 ? 'moderate' : 'high';

  return {
    stressIndex,
    stressLevel,
    triggers,
    spendingDeviation: Math.round(spendingDeviation * 100) / 100,
    lateNightPurchases,
    incomeStability: Math.round(incomeStability * 1000) / 1000,
  };
}

/**
 * Compute a spending baseline from historical transactions.
 */
export function computeSpendingBaseline(
  transactions: Transaction[],
  windowDays: number,
): SpendingBaseline {
  if (transactions.length === 0) {
    return { avgDailySpend: 0, avgWeeklyIncome: 0, categoryAverages: {} };
  }

  const expenses = transactions.filter((t) => t.amount < 0);
  const incomes = transactions.filter((t) => t.amount > 0 && t.category === 'income');

  const totalSpend = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);

  const avgDailySpend = windowDays > 0 ? totalSpend / windowDays : 0;
  const weeks = windowDays / 7;
  const avgWeeklyIncome = weeks > 0 ? totalIncome / weeks : 0;

  // Category averages (daily)
  const categoryTotals: Record<string, number> = {};
  for (const t of expenses) {
    categoryTotals[t.category] = (categoryTotals[t.category] ?? 0) + Math.abs(t.amount);
  }
  const categoryAverages: Record<string, number> = {};
  for (const [cat, total] of Object.entries(categoryTotals)) {
    categoryAverages[cat] = windowDays > 0 ? total / windowDays : 0;
  }

  return { avgDailySpend, avgWeeklyIncome, categoryAverages };
}

// --- Helpers ---

function countUniqueDays(transactions: Transaction[]): number {
  const days = new Set(transactions.map((t) => t.date.slice(0, 10)));
  return days.size;
}

function countLateNightPurchases(transactions: Transaction[]): number {
  return transactions.filter((t) => {
    if (t.amount >= 0) return false; // Only expenses
    const timePart = t.date.includes('T') ? t.date.split('T')[1] : null;
    if (!timePart) return false;
    const hour = parseInt(timePart.split(':')[0], 10);
    return hour >= 22;
  }).length;
}

function groupIncomeByWeek(transactions: Transaction[]): number[] {
  const incomes = transactions.filter(
    (t) => t.amount > 0 && t.category === 'income',
  );
  if (incomes.length === 0) return [];

  const weekMap: Record<string, number> = {};
  for (const t of incomes) {
    const d = new Date(t.date.slice(0, 10));
    // ISO week key
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    weekMap[key] = (weekMap[key] ?? 0) + t.amount;
  }
  return Object.values(weekMap);
}

function computeIncomeStability(weeklyIncomes: number[]): number {
  if (weeklyIncomes.length <= 1) return 1; // Single or no data = stable

  const mean = weeklyIncomes.reduce((a, b) => a + b, 0) / weeklyIncomes.length;
  if (mean === 0) return 1;

  const variance =
    weeklyIncomes.reduce((sum, v) => sum + (v - mean) ** 2, 0) / weeklyIncomes.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean; // Coefficient of variation

  // Map CV to stability: CV=0 → 1, CV>=1 → 0
  return Math.max(0, Math.min(1, 1 - cv));
}
