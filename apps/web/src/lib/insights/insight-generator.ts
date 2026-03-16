// ---------------------------------------------------------------------------
// Insight Generator
// ---------------------------------------------------------------------------
// Analyses check-in data to produce actionable insights. Used by the
// AnalysisPipeline to generate dashboard content after each check-in.
// ---------------------------------------------------------------------------

import type { LifeDesignDB, DBCheckIn, DBInsight } from '@/lib/db/schema';

export interface Insight {
  id: string;
  type: string;
  dimension?: string;
  title: string;
  body: string;
  confidence: number;
  generatedAt: Date;
  dismissed: boolean;
}

export class InsightGenerator {
  constructor(private db: LifeDesignDB) {}

  /**
   * Generate dashboard-ready insights from recent check-in data.
   * Stores new insights in Dexie and returns the generated set.
   */
  async generateDashboardInsights(): Promise<Insight[]> {
    const checkIns = await this.db.checkIns.orderBy('date').reverse().limit(30).toArray();
    if (checkIns.length < 3) return [];

    const insights: Insight[] = [];

    // 1. Mood trend insight
    const moodInsight = this.analyzeMoodTrend(checkIns);
    if (moodInsight) insights.push(moodInsight);

    // 2. Low-dimension alerts
    const dimInsights = this.analyzeDimensionAlerts(checkIns);
    insights.push(...dimInsights);

    // 3. Consistency insight
    const consistencyInsight = this.analyzeConsistency(checkIns);
    if (consistencyInsight) insights.push(consistencyInsight);

    // Persist new insights (clear stale ones first)
    await this.db.insights
      .where('dismissed')
      .equals(0)
      .delete();

    for (const insight of insights) {
      await this.db.insights.add({
        type: insight.type as DBInsight['type'],
        title: insight.title,
        body: insight.body,
        dimension: insight.dimension as DBInsight['dimension'],
        confidence: insight.confidence,
        sourceCheckInIds: checkIns.slice(0, 7).map(ci => ci.id!).filter(Boolean),
        generatedAt: insight.generatedAt,
        dismissed: false,
      });
    }

    return insights;
  }

  /**
   * Get all non-dismissed insights from the database.
   */
  async getActiveInsights(): Promise<Insight[]> {
    const records = await this.db.insights
      .where('dismissed')
      .equals(0)
      .toArray();

    return records.map(r => ({
      id: String(r.id),
      type: r.type,
      dimension: r.dimension,
      title: r.title,
      body: r.body,
      confidence: r.confidence ?? 0.5,
      generatedAt: r.generatedAt,
      dismissed: r.dismissed,
    }));
  }

  // ---------------------------------------------------------------------------
  // Analysis helpers
  // ---------------------------------------------------------------------------

  private analyzeMoodTrend(checkIns: DBCheckIn[]): Insight | null {
    if (checkIns.length < 5) return null;

    const recent = checkIns.slice(0, 5);
    const older = checkIns.slice(5, 10);
    if (older.length === 0) return null;

    const recentAvg = recent.reduce((s, c) => s + c.mood, 0) / recent.length;
    const olderAvg = older.reduce((s, c) => s + c.mood, 0) / older.length;
    const diff = recentAvg - olderAvg;

    if (Math.abs(diff) < 0.5) return null;

    const direction = diff > 0 ? 'improving' : 'declining';
    const emoji = diff > 0 ? 'upward' : 'downward';

    return {
      id: `mood-trend-${Date.now()}`,
      type: 'trend',
      title: `Mood trending ${emoji}`,
      body: `Your average mood over the last ${recent.length} check-ins is ${recentAvg.toFixed(1)}/10, ${direction} from ${olderAvg.toFixed(1)}/10 previously.`,
      confidence: Math.min(0.9, 0.5 + checkIns.length * 0.02),
      generatedAt: new Date(),
      dismissed: false,
    };
  }

  private analyzeDimensionAlerts(checkIns: DBCheckIn[]): Insight[] {
    const recent = checkIns.slice(0, 7);
    const dimTotals: Record<string, { sum: number; count: number }> = {};

    for (const ci of recent) {
      for (const [dim, score] of Object.entries(ci.dimensionScores)) {
        if (score === undefined || score === null) continue;
        if (!dimTotals[dim]) dimTotals[dim] = { sum: 0, count: 0 };
        dimTotals[dim].sum += score;
        dimTotals[dim].count++;
      }
    }

    const alerts: Insight[] = [];

    for (const [dim, { sum, count }] of Object.entries(dimTotals)) {
      const avg = sum / count;
      if (avg <= 4 && count >= 3) {
        alerts.push({
          id: `dim-alert-${dim}-${Date.now()}`,
          type: 'alert',
          dimension: dim,
          title: `${dim.charAt(0).toUpperCase() + dim.slice(1)} needs attention`,
          body: `Your ${dim} score has averaged ${avg.toFixed(1)}/10 over the last ${count} check-ins. Consider focusing on this area.`,
          confidence: Math.min(0.85, 0.5 + count * 0.05),
          generatedAt: new Date(),
          dismissed: false,
        });
      }
    }

    return alerts;
  }

  private analyzeConsistency(checkIns: DBCheckIn[]): Insight | null {
    if (checkIns.length < 7) return null;

    // Check if user has checked in at least 5 of the last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const recentDates = new Set(
      checkIns
        .filter(ci => new Date(ci.date) >= sevenDaysAgo)
        .map(ci => ci.date),
    );

    if (recentDates.size >= 5) {
      return {
        id: `consistency-${Date.now()}`,
        type: 'positive',
        title: 'Great consistency!',
        body: `You've checked in ${recentDates.size} out of the last 7 days. Consistent reflection is key to personal growth.`,
        confidence: 0.95,
        generatedAt: new Date(),
        dismissed: false,
      };
    }

    return null;
  }
}
