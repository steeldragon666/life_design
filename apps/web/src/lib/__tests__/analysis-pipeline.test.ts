import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { LifeDesignDB } from '@/lib/db/schema';
import { AnalysisPipeline } from '@/lib/analysis/analysis-pipeline';
import { Dimension } from '@life-design/core';

describe('AnalysisPipeline', () => {
  let db: LifeDesignDB;
  let pipeline: AnalysisPipeline;

  beforeEach(() => {
    db = new LifeDesignDB();
    pipeline = new AnalysisPipeline(db);
  });

  afterEach(async () => { await db.delete(); });

  it('runIncrementalAnalysis returns summary with insights', async () => {
    // Seed 15 check-ins to trigger correlation computation
    for (let i = 14; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      await db.checkIns.add({
        date: d.toISOString().slice(0, 10),
        mood: 5 + Math.round(Math.random() * 3),
        dimensionScores: { [Dimension.Career]: 6, [Dimension.Health]: 7 },
        tags: [],
        createdAt: d,
      });
    }

    const latest = (await db.checkIns.orderBy('date').last())!;
    const result = await pipeline.runIncrementalAnalysis(latest);

    expect(result).toHaveProperty('newInsights');
    expect(result).toHaveProperty('newCorrelations');
    expect(result).toHaveProperty('newBadges');
    expect(result).toHaveProperty('embeddingStored');
    expect(Array.isArray(result.newInsights)).toBe(true);
  });

  it('runIncrementalAnalysis works with few check-ins (no correlations)', async () => {
    await db.checkIns.add({
      date: new Date().toISOString().slice(0, 10),
      mood: 7,
      dimensionScores: { [Dimension.Career]: 6 },
      tags: [],
      createdAt: new Date(),
    });

    const latest = (await db.checkIns.orderBy('date').last())!;
    const result = await pipeline.runIncrementalAnalysis(latest);

    expect(result.newCorrelations).toBe(0);
    expect(result.embeddingStored).toBe(false);
    expect(result.newBadges).toEqual([]);
  });

  it('getLatestAnalysis returns counts', async () => {
    const summary = await pipeline.getLatestAnalysis();
    expect(summary).toHaveProperty('insightCount');
    expect(summary).toHaveProperty('correlationCount');
    expect(summary).toHaveProperty('badgeCount');
    expect(summary).toHaveProperty('lastAnalysisAt');
    expect(summary.insightCount).toBe(0);
  });
});
