import { computeAllPairCorrelations, Dimension } from '@life-design/core';
import type { LifeDesignDB, DBCheckIn } from '@/lib/db/schema';
import { InsightGenerator, type Insight } from '@/lib/insights/insight-generator';
import type { AILocalClient } from '@life-design/ai-local';
export interface AnalysisSummary {
  insightCount: number;
  correlationCount: number;
  lastAnalysisAt: Date;
}

export class AnalysisPipeline {
  private insightGenerator: InsightGenerator;

  constructor(
    private db: LifeDesignDB,
    private aiLocal?: AILocalClient | null,
  ) {
    this.insightGenerator = new InsightGenerator(db);
  }

  async runIncrementalAnalysis(checkIn: DBCheckIn): Promise<{
    newInsights: Insight[];
    newCorrelations: number;
    embeddingStored: boolean;
  }> {
    // 1. Generate insights
    const newInsights = await this.insightGenerator.generateDashboardInsights();

    // 2. Correlations (if 14+ check-ins)
    let newCorrelations = 0;
    const checkInCount = await this.db.checkIns.count();
    if (checkInCount >= 14) {
      const allCheckIns = await this.db.checkIns.orderBy('date').toArray();
      // Convert to ScoresByDate format: Record<date, Record<dimension, number>>
      const scoresByDate: Record<string, Record<string, number | null | undefined>> = {};
      for (const ci of allCheckIns) {
        scoresByDate[ci.date] = ci.dimensionScores as Record<string, number | null | undefined>;
      }
      const pairs = computeAllPairCorrelations(scoresByDate);
      // Clear old correlations and store fresh ones
      await this.db.correlations.clear();
      const meaningful = pairs.filter(p => Math.abs(p.correlation) >= 0.3);
      if (meaningful.length > 0) {
        await this.db.correlations.bulkAdd(
          meaningful.map(p => ({
            dimension1: p.keyA as Dimension,
            dimension2: p.keyB as Dimension,
            strength: p.correlation,
            description: `${p.keyA} and ${p.keyB} are ${p.correlation > 0 ? 'positively' : 'negatively'} correlated`,
            sampleSize: p.sampleSize,
            calculatedAt: new Date(),
          }))
        );
      }
      newCorrelations = meaningful.length;
    }

    // 3. Embedding (if AI ready)
    let embeddingStored = false;
    if (this.aiLocal && checkIn.journal) {
      try {
        const embedding = await this.aiLocal.embed(checkIn.journal);
        await this.db.checkIns.update(checkIn.id!, {
          embedding: Array.from(embedding),
        });
        embeddingStored = true;
      } catch { /* AI not ready, skip */ }
    }

    return { newInsights, newCorrelations, embeddingStored };
  }

  async runFullReanalysis(): Promise<void> {
    const allCheckIns = await this.db.checkIns.orderBy('date').toArray();
    if (allCheckIns.length < 2) return;

    // Recompute all correlations
    if (allCheckIns.length >= 14) {
      const scoresByDate: Record<string, Record<string, number | null | undefined>> = {};
      for (const ci of allCheckIns) {
        scoresByDate[ci.date] = ci.dimensionScores as Record<string, number | null | undefined>;
      }
      const pairs = computeAllPairCorrelations(scoresByDate);
      await this.db.correlations.clear();
      const meaningful = pairs.filter(p => Math.abs(p.correlation) >= 0.3);
      if (meaningful.length > 0) {
        await this.db.correlations.bulkAdd(
          meaningful.map(p => ({
            dimension1: p.keyA as Dimension,
            dimension2: p.keyB as Dimension,
            strength: p.correlation,
            description: `${p.keyA} and ${p.keyB} are ${p.correlation > 0 ? 'positively' : 'negatively'} correlated`,
            sampleSize: p.sampleSize,
            calculatedAt: new Date(),
          }))
        );
      }
    }

    // Regenerate insights
    await this.insightGenerator.generateDashboardInsights();

    // Recompute embeddings for check-ins with journals (if AI available)
    if (this.aiLocal) {
      for (const ci of allCheckIns) {
        if (ci.journal && !ci.embedding) {
          try {
            const embedding = await this.aiLocal.embed(ci.journal);
            await this.db.checkIns.update(ci.id!, { embedding: Array.from(embedding) });
          } catch { break; }
        }
      }
    }
  }

  async getLatestAnalysis(): Promise<AnalysisSummary> {
    const [insightCount, correlationCount] = await Promise.all([
      this.db.insights.count(),
      this.db.correlations.count(),
    ]);
    return {
      insightCount,
      correlationCount,
      lastAnalysisAt: new Date(),
    };
  }
}
