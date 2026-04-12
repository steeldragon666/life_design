import type { FinancialStressResult } from './financial-stress';

export interface FinancialWellnessProfile {
  stressResult: FinancialStressResult;

  // Reframed metrics (positive framing)
  financialWellnessScore: number;    // 0-100 (100 = excellent, weighted average)
  controlScore: number;              // 0-100, how much user is "in control" of spending
  stabilityScore: number;            // 0-100, income consistency
  mindfulnessScore: number;          // 0-100, absence of impulsive spending patterns

  // Actionable insights (educational, not prescriptive)
  insights: string[];

  // Trend
  trend: 'improving' | 'stable' | 'declining';
}

/**
 * Reframe financial stress into a wellness profile with positive framing.
 *
 * Scores: higher = better.
 * - controlScore = 100 - min(100, abs(spendingDeviation))
 * - stabilityScore = incomeStability * 100
 * - mindfulnessScore = 100 - min(100, lateNightPurchases * 20)
 * - financialWellnessScore = weighted average (control 40%, stability 30%, mindfulness 30%)
 *
 * Trend compares current vs previous stressIndex:
 * - improving: current stress decreased by >5
 * - declining: current stress increased by >5
 * - stable: within 5 points
 */
export function computeFinancialWellness(
  current: FinancialStressResult,
  previous?: FinancialStressResult,
): FinancialWellnessProfile {
  const controlScore = 100 - Math.min(100, Math.abs(current.spendingDeviation));
  const stabilityScore = current.incomeStability * 100;
  const mindfulnessScore = 100 - Math.min(100, current.lateNightPurchases * 20);

  const financialWellnessScore = Math.round(
    controlScore * 0.4 + stabilityScore * 0.3 + mindfulnessScore * 0.3,
  );

  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (previous) {
    const diff = current.stressIndex - previous.stressIndex;
    if (diff < -5) {
      trend = 'improving';
    } else if (diff > 5) {
      trend = 'declining';
    }
  }

  const profile: FinancialWellnessProfile = {
    stressResult: current,
    financialWellnessScore,
    controlScore,
    stabilityScore,
    mindfulnessScore,
    insights: [],
    trend,
  };

  profile.insights = generateFinancialInsights(profile);

  return profile;
}

/**
 * Generate 2-3 positive-framed insights based on wellness scores.
 * Never exposes exact financial amounts — uses relative terms only.
 */
export function generateFinancialInsights(profile: FinancialWellnessProfile): string[] {
  const insights: string[] = [];

  // Control / spending insight
  if (profile.controlScore >= 80) {
    insights.push(
      'Your spending is consistent with your usual patterns — nice financial discipline!',
    );
  } else if (profile.controlScore >= 50) {
    insights.push(
      'Your spending has been slightly higher than usual this period. Worth keeping an eye on, but nothing alarming.',
    );
  } else {
    insights.push(
      'Your spending has been notably higher than usual recently. It may be worth reviewing whether all purchases were intentional.',
    );
  }

  // Stability insight
  if (profile.stabilityScore >= 80) {
    insights.push(
      'Your income has been stable and predictable — that is a strong foundation for financial well-being.',
    );
  } else if (profile.stabilityScore >= 50) {
    insights.push(
      'Your income has been somewhat variable lately. Building a small buffer can help smooth things out.',
    );
  } else {
    insights.push(
      'Your income has been quite irregular recently. Having variable income can feel stressful — a simple spending plan may help bring a sense of control.',
    );
  }

  // Mindfulness insight (only add if there are late-night purchases, to keep it at 2-3 total)
  if (profile.mindfulnessScore < 80) {
    insights.push(
      'A few late-night purchases were detected. These can sometimes be impulsive — something to be mindful of.',
    );
  }

  // Ensure we return 2-3 insights
  return insights.slice(0, 3);
}

/**
 * Build AI mentor context string focused on financial wellness.
 * Never exposes exact amounts — uses relative terms only.
 */
export function buildFinancialStressContext(profile: FinancialWellnessProfile): string {
  const lines: string[] = ['\nFinancial Wellness Overview:'];

  // Wellness score category
  const wellnessLabel =
    profile.financialWellnessScore >= 80
      ? 'excellent'
      : profile.financialWellnessScore >= 60
        ? 'good'
        : profile.financialWellnessScore >= 40
          ? 'fair'
          : 'needs attention';

  lines.push(`- Overall financial wellness score: ${wellnessLabel}`);

  // Spending control
  if (profile.controlScore >= 80) {
    lines.push('- Spending is within the user\'s normal range');
  } else if (profile.controlScore >= 50) {
    lines.push('- Spending is somewhat higher than usual');
  } else {
    lines.push('- Spending is significantly higher than usual');
  }

  // Income stability
  if (profile.stabilityScore >= 80) {
    lines.push('- Income has been stable and consistent');
  } else if (profile.stabilityScore >= 50) {
    lines.push('- Income has been somewhat variable');
  } else {
    lines.push('- Income has been irregular or unpredictable');
  }

  // Mindfulness
  if (profile.mindfulnessScore < 80) {
    lines.push('- Some late-night or potentially impulsive purchases were detected');
  }

  // Trend
  if (profile.trend === 'improving') {
    lines.push('- Trend: financial wellness is improving compared to the previous period');
  } else if (profile.trend === 'declining') {
    lines.push('- Trend: financial wellness has declined compared to the previous period');
  } else {
    lines.push('- Trend: financial wellness is stable');
  }

  // Insights for the mentor
  if (profile.insights.length > 0) {
    lines.push('- Key insights to share with the user (use conversational, supportive tone):');
    for (const insight of profile.insights) {
      lines.push(`  - ${insight}`);
    }
  }

  lines.push(
    '- IMPORTANT: Never share exact financial figures with the user. Use relative terms like "within your usual range", "higher than usual", or "stable". Frame feedback as educational, not prescriptive.',
  );

  return lines.join('\n');
}
