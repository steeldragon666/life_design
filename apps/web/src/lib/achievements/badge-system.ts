// ---------------------------------------------------------------------------
// Badge System
// ---------------------------------------------------------------------------
// Evaluates badge criteria against user check-in data stored in Dexie.
// Used by AnalysisPipeline and LifeDesignProvider to track achievements.
// ---------------------------------------------------------------------------

import type { LifeDesignDB, DBBadge } from '@/lib/db/schema';
import { BADGE_DEFINITIONS, type BadgeDefinition } from './badge-definitions';

export class BadgeSystem {
  constructor(private db: LifeDesignDB) {}

  /**
   * Check which badges the user has newly earned after a check-in.
   * Returns only *newly* earned badges (not previously stored).
   */
  async checkAfterCheckIn(checkIn: {
    id?: number;
    date: string;
    mood: number;
    dimensionScores?: Partial<Record<string, number>>;
    journal?: string;
    tags?: string[];
  }): Promise<BadgeDefinition[]> {
    const earnedRecords = await this.db.badges.toArray();
    const earnedIds = new Set(earnedRecords.map((b: DBBadge) => b.badgeId));

    const unearnedDefs = BADGE_DEFINITIONS.filter(d => !earnedIds.has(d.id));
    if (unearnedDefs.length === 0) return [];

    const newlyEarned: BadgeDefinition[] = [];

    for (const def of unearnedDefs) {
      const met = await this.evaluateCriteria(def, checkIn);
      if (met) {
        // Persist the badge
        await this.db.badges.add({
          badgeId: def.id,
          earnedAt: new Date(),
          context: def.category,
        });
        newlyEarned.push(def);
      }
    }

    return newlyEarned;
  }

  /**
   * Get all badges the user has earned so far, resolved to their definitions.
   */
  async getEarnedBadges(): Promise<BadgeDefinition[]> {
    const records = await this.db.badges.toArray();
    const byId = new Map(BADGE_DEFINITIONS.map(d => [d.id, d]));
    return records
      .map((r: DBBadge) => byId.get(r.badgeId))
      .filter((d): d is BadgeDefinition => d !== undefined);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async evaluateCriteria(
    def: BadgeDefinition,
    currentCheckIn: {
      mood: number;
      dimensionScores?: Partial<Record<string, number>>;
      journal?: string;
      date: string;
    },
  ): Promise<boolean> {
    switch (def.criteria.type) {
      case 'checkin_count': {
        const count = await this.db.checkIns.count();
        return count >= def.criteria.threshold;
      }

      case 'streak_days': {
        const streak = await this.computeCurrentStreak(currentCheckIn.date);
        return streak >= def.criteria.threshold;
      }

      case 'dimension_score': {
        if (def.criteria.dimension === 'mood') {
          return currentCheckIn.mood >= def.criteria.threshold;
        }
        const dimScores = currentCheckIn.dimensionScores ?? {};
        const dimKey = def.criteria.dimension;
        if (!dimKey) return false;
        const score = dimScores[dimKey];
        return score !== undefined && score !== null && score >= def.criteria.threshold;
      }

      case 'all_dimensions': {
        const scores = currentCheckIn.dimensionScores ?? {};
        const scoredCount = Object.values(scores).filter(
          v => v !== undefined && v !== null,
        ).length;
        return scoredCount >= def.criteria.threshold;
      }

      case 'journal_count': {
        const withJournal = await this.db.checkIns
          .filter(ci => !!ci.journal && ci.journal.trim().length > 0)
          .count();
        return withJournal >= def.criteria.threshold;
      }

      default:
        return false;
    }
  }

  /**
   * Compute the current consecutive-day check-in streak ending at `todayStr`.
   */
  private async computeCurrentStreak(todayStr: string): Promise<number> {
    const allDates = await this.db.checkIns
      .orderBy('date')
      .reverse()
      .uniqueKeys();

    if (!allDates || allDates.length === 0) return 0;

    // Convert to sorted unique date strings (most recent first)
    const sorted = (allDates as string[]).sort().reverse();

    let streak = 0;
    let expectedDate = new Date(todayStr + 'T00:00:00');

    for (const dateStr of sorted) {
      const d = new Date(dateStr + 'T00:00:00');
      const diff = Math.round(
        (expectedDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diff === 0) {
        streak++;
        expectedDate = new Date(expectedDate.getTime() - 86400000);
      } else if (diff > 0) {
        // Gap detected — streak is broken
        break;
      }
      // diff < 0 means duplicate or future date, skip
    }

    return streak;
  }
}
