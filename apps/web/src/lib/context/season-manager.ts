import { Dimension, ALL_DIMENSIONS } from '@life-design/core';
import { db } from '../db';
import type { SeasonName, SeasonRecord } from '../ml/types';

// ---------------------------------------------------------------------------
// Season weight definitions
// ---------------------------------------------------------------------------

export const SEASON_WEIGHTS: Record<SeasonName, Record<Dimension, number>> = {
  Sprint: {
    [Dimension.Career]: 1.5,
    [Dimension.Finance]: 1.0,
    [Dimension.Health]: 0.8,
    [Dimension.Fitness]: 0.7,
    [Dimension.Family]: 0.7,
    [Dimension.Social]: 0.5,
    [Dimension.Romance]: 0.5,
    [Dimension.Growth]: 1.3,
  },
  Recharge: {
    [Dimension.Career]: 0.7,
    [Dimension.Finance]: 0.8,
    [Dimension.Health]: 1.5,
    [Dimension.Fitness]: 1.3,
    [Dimension.Family]: 1.2,
    [Dimension.Social]: 1.0,
    [Dimension.Romance]: 1.0,
    [Dimension.Growth]: 0.8,
  },
  Exploration: {
    [Dimension.Career]: 0.8,
    [Dimension.Finance]: 0.7,
    [Dimension.Health]: 1.0,
    [Dimension.Fitness]: 1.0,
    [Dimension.Family]: 0.8,
    [Dimension.Social]: 1.5,
    [Dimension.Romance]: 1.2,
    [Dimension.Growth]: 1.3,
  },
  Maintenance: {
    [Dimension.Career]: 1.0,
    [Dimension.Finance]: 1.0,
    [Dimension.Health]: 1.0,
    [Dimension.Fitness]: 1.0,
    [Dimension.Family]: 1.0,
    [Dimension.Social]: 1.0,
    [Dimension.Romance]: 1.0,
    [Dimension.Growth]: 1.0,
  },
};

// ---------------------------------------------------------------------------
// Season descriptions (used by UI components)
// ---------------------------------------------------------------------------

export const SEASON_DESCRIPTIONS: Record<SeasonName, string> = {
  Sprint: 'Focus on career and growth. Expect less time for social activities.',
  Recharge: 'Prioritise health and family. Recovery is the goal.',
  Exploration: 'Expand your horizons. Social connections and growth take centre stage.',
  Maintenance: 'Balanced across all dimensions. The default steady state.',
};

export const ALL_SEASONS: SeasonName[] = ['Sprint', 'Recharge', 'Exploration', 'Maintenance'];

// ---------------------------------------------------------------------------
// Season Manager
// ---------------------------------------------------------------------------

export class SeasonManager {
  /**
   * Get the currently active season, or undefined if none is set.
   */
  async getActiveSeason(): Promise<SeasonRecord | undefined> {
    return db.seasons.where('isActive').equals(1).first();
  }

  /**
   * Set a new active season. Deactivates the current season (setting its
   * endDate) and creates a new active season record.
   */
  async setSeason(name: SeasonName): Promise<void> {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    await db.transaction('rw', db.seasons, async () => {
      // Deactivate current season
      const current = await db.seasons.where('isActive').equals(1).first();
      if (current && current.id !== undefined) {
        await db.seasons.update(current.id, {
          isActive: false,
          endDate: today,
        } as Partial<SeasonRecord>);
      }

      // Create new active season
      await db.seasons.add({
        name,
        startDate: today,
        isActive: true,
        triggerSource: 'manual',
        weights: SEASON_WEIGHTS[name],
      } as SeasonRecord);
    });
  }

  /**
   * Get the history of past (inactive) seasons, most recent first.
   */
  async getHistory(limit = 10): Promise<SeasonRecord[]> {
    const all = await db.seasons
      .orderBy('id')
      .reverse()
      .toArray();

    // Filter to inactive seasons only, then take the limit
    return all.filter((s) => !s.isActive).slice(0, limit);
  }
}
