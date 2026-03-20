import { db } from '@/lib/db';
import type { NormalisationStatsRecord } from './types';

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

export class NormalisationStore {
  async getStats(feature: string): Promise<NormalisationStatsRecord | undefined> {
    return db.normalisationStats.get(feature);
  }

  async normalise(feature: string, rawValue: number): Promise<number> {
    const stats = await this.getStats(feature);
    if (!stats || stats.stddev30d === 0 || stats.sampleCount < 2) return 0.5;
    const z = (rawValue - stats.mean30d) / stats.stddev30d;
    return sigmoid(z);
  }

  async updateStats(feature: string, newValue: number): Promise<void> {
    const existing = await this.getStats(feature);
    if (!existing) {
      await db.normalisationStats.put({
        feature,
        mean30d: newValue,
        stddev30d: 0,
        median: newValue,
        sampleCount: 1,
        lastUpdated: Date.now(),
      });
      return;
    }

    const n = Math.min(existing.sampleCount + 1, 30);
    const alpha = 1 / n;
    const newMean = existing.mean30d + alpha * (newValue - existing.mean30d);
    const newVariance = (1 - alpha) * (existing.stddev30d ** 2 + alpha * (newValue - existing.mean30d) ** 2);
    const newStddev = Math.sqrt(Math.max(0, newVariance));

    await db.normalisationStats.put({
      feature,
      mean30d: newMean,
      stddev30d: newStddev,
      median: existing.median,
      sampleCount: existing.sampleCount + 1,
      lastUpdated: Date.now(),
    });
  }
}
