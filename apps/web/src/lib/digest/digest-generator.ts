// ---------------------------------------------------------------------------
// Weekly Digest Generator
// ---------------------------------------------------------------------------
// Generates weekly digest summaries from check-in data. The StoredDigest
// interface is consumed by the WeeklyDigestView component.
// ---------------------------------------------------------------------------

import type { LifeDesignDB } from '@/lib/db/schema';

export interface DimensionSummary {
  dimension: string;
  trend: 'up' | 'down' | 'stable';
  avgScore: number;
  note: string;
}

export interface StoredDigest {
  id: string;
  weekStarting: string;
  generatedAt: string;
  summary: string;
  highlights: string[];
  dimensionSummaries: DimensionSummary[];
}

export class DigestGenerator {
  constructor(private db: LifeDesignDB) {}

  /**
   * Generate a weekly digest for the most recent 7-day period.
   * Returns null if there are not enough check-ins.
   */
  async generateWeeklyDigest(): Promise<StoredDigest | null> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const weekStartStr = weekAgo.toISOString().slice(0, 10);

    const recentCheckIns = await this.db.checkIns
      .where('date')
      .aboveOrEqual(weekStartStr)
      .toArray();

    if (recentCheckIns.length < 2) return null;

    // Compute average mood
    const avgMood =
      recentCheckIns.reduce((sum, ci) => sum + ci.mood, 0) / recentCheckIns.length;

    // Compute per-dimension averages
    const dimTotals: Record<string, { sum: number; count: number }> = {};
    for (const ci of recentCheckIns) {
      for (const [dim, score] of Object.entries(ci.dimensionScores)) {
        if (score === undefined || score === null) continue;
        if (!dimTotals[dim]) dimTotals[dim] = { sum: 0, count: 0 };
        dimTotals[dim].sum += score;
        dimTotals[dim].count++;
      }
    }

    const dimensionSummaries: DimensionSummary[] = Object.entries(dimTotals).map(
      ([dim, { sum, count }]) => {
        const avg = sum / count;
        // Determine trend by comparing first half vs second half
        const mid = Math.floor(recentCheckIns.length / 2);
        const firstHalf = recentCheckIns.slice(0, mid);
        const secondHalf = recentCheckIns.slice(mid);

        const avgFirst = this.avgDimScore(firstHalf, dim);
        const avgSecond = this.avgDimScore(secondHalf, dim);

        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (avgSecond - avgFirst > 0.5) trend = 'up';
        else if (avgFirst - avgSecond > 0.5) trend = 'down';

        const trendLabel = trend === 'up' ? 'improving' : trend === 'down' ? 'declining' : 'steady';

        return {
          dimension: dim,
          trend,
          avgScore: Math.round(avg * 10) / 10,
          note: `${dim} has been ${trendLabel} this week (avg ${avg.toFixed(1)}/10)`,
        };
      },
    );

    // Build highlights
    const highlights: string[] = [];
    if (recentCheckIns.length >= 7) {
      highlights.push('You checked in every day this week!');
    }
    const bestDim = dimensionSummaries.reduce(
      (best, ds) => (ds.avgScore > best.avgScore ? ds : best),
      dimensionSummaries[0],
    );
    if (bestDim) {
      highlights.push(
        `Your strongest area was ${bestDim.dimension} with an average of ${bestDim.avgScore}/10`,
      );
    }
    const improvingDims = dimensionSummaries.filter(ds => ds.trend === 'up');
    if (improvingDims.length > 0) {
      highlights.push(
        `${improvingDims.map(d => d.dimension).join(', ')} ${improvingDims.length === 1 ? 'is' : 'are'} trending upward`,
      );
    }

    const moodLabel =
      avgMood >= 8 ? 'great' : avgMood >= 6 ? 'good' : avgMood >= 4 ? 'moderate' : 'challenging';

    return {
      id: `digest-${weekStartStr}`,
      weekStarting: weekStartStr,
      generatedAt: now.toISOString(),
      summary: `This week you completed ${recentCheckIns.length} check-in${recentCheckIns.length === 1 ? '' : 's'} with an average mood of ${avgMood.toFixed(1)}/10. Overall, it was a ${moodLabel} week.`,
      highlights,
      dimensionSummaries,
    };
  }

  private avgDimScore(
    checkIns: Array<{ dimensionScores: Partial<Record<string, number>> }>,
    dim: string,
  ): number {
    let sum = 0;
    let count = 0;
    for (const ci of checkIns) {
      const score = ci.dimensionScores[dim as keyof typeof ci.dimensionScores] as
        | number
        | undefined;
      if (score !== undefined && score !== null) {
        sum += score;
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
  }
}
