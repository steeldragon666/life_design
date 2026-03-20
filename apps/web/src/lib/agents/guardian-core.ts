import {
  ALL_DIMENSIONS,
  Dimension,
  computeMovingAverage,
  computeVolatility,
  computeTrend,
  computeDimensionAverage,
} from '@life-design/core';
import { db } from '../db';
import type { DBCheckIn } from '../db/schema';
import type { FeatureLogRecord, GuardianLogEntry } from '../ml/types';
import { ActionSynthesizer } from './action-synthesizer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract per-dimension score arrays from check-ins sorted by date. */
function extractDimensionScores(
  checkIns: DBCheckIn[],
): Record<Dimension, number[]> {
  const result = {} as Record<Dimension, number[]>;
  for (const dim of ALL_DIMENSIONS) {
    result[dim] = [];
  }
  for (const ci of checkIns) {
    for (const dim of ALL_DIMENSIONS) {
      const score = ci.dimensionScores[dim];
      if (score !== undefined) {
        result[dim].push(score);
      }
    }
  }
  return result;
}

/** Compute z-score deviation of recent window mean relative to baseline. */
function zScore(recentMean: number, baselineMean: number, baselineStd: number): number {
  if (baselineStd === 0) return 0;
  return (recentMean - baselineMean) / baselineStd;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RECENT_WINDOW = 7;
const BASELINE_WINDOW = 30;

const WORK_DIMENSIONS = new Set<Dimension>([Dimension.Career, Dimension.Finance]);
const HEALTH_MOOD_DIMENSIONS = new Set<Dimension>([Dimension.Health, Dimension.Fitness]);
const SOCIAL_DIMENSIONS = new Set<Dimension>([Dimension.Social, Dimension.Family]);

const DEFAULT_SIGMA_THRESHOLD = 1.5;
const SEVERE_SIGMA_THRESHOLD = 2.5;
const ADAPTED_SIGMA_THRESHOLD = 2.0;
const IGNORE_COUNT_FOR_ADAPTATION = 3;

// Escalation day thresholds
const LEVEL_2_DAYS = 3;
const LEVEL_3_DAYS = 5;

// ---------------------------------------------------------------------------
// Guardian Agent
// ---------------------------------------------------------------------------

export class GuardianAgent {
  private synthesizer = new ActionSynthesizer();

  /**
   * Run the guardian assessment pipeline.
   *
   * Returns entries that require Level 3 (modal) intervention.
   * Level 1/2 entries are written directly to the database.
   */
  async assess(
    checkIns: DBCheckIn[],
    _featureLogs: FeatureLogRecord[],
  ): Promise<GuardianLogEntry[]> {
    // Sort check-ins by date ascending
    const sorted = [...checkIns].sort((a, b) => a.date.localeCompare(b.date));

    if (sorted.length < RECENT_WINDOW) {
      return []; // Not enough data
    }

    // Data retention pruning
    await this.pruneOldData();

    // Read past guardian logs for feedback adaptation
    const pastLogs = await db.guardianLogs.toArray();
    const ignoreCounts = this.computeIgnoreCounts(pastLogs);

    const dimensionScores = extractDimensionScores(sorted);

    // Compute per-dimension stats
    const dimStats: Record<
      Dimension,
      { recentMean: number; baselineMean: number; baselineStd: number; trend: number; consecutiveDays: number }
    > = {} as never;

    for (const dim of ALL_DIMENSIONS) {
      const scores = dimensionScores[dim];
      const recent = scores.slice(-RECENT_WINDOW);
      const baseline = scores.slice(-BASELINE_WINDOW);

      const recentMean = recent.length > 0 ? computeDimensionAverage(recent) : 0;
      const baselineMean = baseline.length > 0 ? computeDimensionAverage(baseline) : 0;
      const baselineStd = baseline.length >= 2 ? computeVolatility(baseline) : 0;
      const trend = computeTrend(scores.slice(-RECENT_WINDOW));
      const consecutiveDays = this.countConsecutiveDeviationDays(scores, baselineMean, baselineStd);

      dimStats[dim] = { recentMean, baselineMean, baselineStd, trend, consecutiveDays };
    }

    const entries: GuardianLogEntry[] = [];

    // --- Pattern 1: Burnout ---
    const burnoutEntry = this.detectBurnout(dimStats, ignoreCounts, _featureLogs);
    if (burnoutEntry) entries.push(burnoutEntry);

    // --- Pattern 2: Isolation ---
    const isolationEntry = this.detectIsolation(dimStats, ignoreCounts, _featureLogs);
    if (isolationEntry) entries.push(isolationEntry);

    // --- Pattern 3: Flow State ---
    const flowEntry = this.detectFlowState(dimStats);
    if (flowEntry) entries.push(flowEntry);

    // Process escalation for each entry
    const level3Entries: GuardianLogEntry[] = [];

    for (const entry of entries) {
      if (entry.escalationLevel === 1) {
        // Silent log
        await db.guardianLogs.add(entry);
      } else if (entry.escalationLevel === 2) {
        // Write to nudges + guardian logs
        await db.guardianLogs.add(entry);
        await db.nudges.add({
          type: 'guardian',
          title: `Guardian Alert: ${this.triggerTypeLabel(entry.triggerType)}`,
          message: entry.actionSuggested,
          scheduledFor: new Date(),
          dismissed: false,
          createdAt: new Date(),
        });
      } else {
        // Level 3 — return for modal display
        await db.guardianLogs.add(entry);
        level3Entries.push(entry);
      }
    }

    return level3Entries;
  }

  // -------------------------------------------------------------------------
  // Pattern Detection
  // -------------------------------------------------------------------------

  private detectBurnout(
    stats: Record<Dimension, { recentMean: number; baselineMean: number; baselineStd: number; trend: number; consecutiveDays: number }>,
    ignoreCounts: Record<string, number>,
    featureLogs: FeatureLogRecord[],
  ): GuardianLogEntry | null {
    const sigma = (ignoreCounts['burnout'] ?? 0) >= IGNORE_COUNT_FOR_ADAPTATION
      ? ADAPTED_SIGMA_THRESHOLD
      : DEFAULT_SIGMA_THRESHOLD;

    // Work dimensions must be >sigma above mean
    const workAbove = ALL_DIMENSIONS.filter(
      (dim) => WORK_DIMENSIONS.has(dim) && zScore(stats[dim].recentMean, stats[dim].baselineMean, stats[dim].baselineStd) > sigma,
    );

    // Health/mood dimensions must be >1.0 sigma below mean
    const healthBelow = ALL_DIMENSIONS.filter(
      (dim) => HEALTH_MOOD_DIMENSIONS.has(dim) && zScore(stats[dim].recentMean, stats[dim].baselineMean, stats[dim].baselineStd) < -1.0,
    );

    if (workAbove.length === 0 || healthBelow.length === 0) return null;

    // Must be 3+ consecutive days
    const maxConsecutive = Math.max(...[...workAbove, ...healthBelow].map((d) => stats[d].consecutiveDays));
    if (maxConsecutive < LEVEL_2_DAYS) return null;

    const dimensionsAffected = [...workAbove, ...healthBelow];
    const deviationMagnitude = Math.max(
      ...dimensionsAffected.map((d) => Math.abs(zScore(stats[d].recentMean, stats[d].baselineMean, stats[d].baselineStd))),
    );

    const escalationLevel = this.determineEscalation(maxConsecutive, deviationMagnitude);
    const topFeatures = this.extractTopFeatures(featureLogs);

    const actionSuggested = this.synthesizer.generate({
      triggerType: 'burnout',
      dimensionsAffected,
      topFeatures,
    });

    return {
      timestamp: Date.now(),
      triggerType: 'burnout',
      escalationLevel,
      actionSuggested,
      userAccepted: false,
      dimensionsAffected,
      deviationMagnitude,
    };
  }

  private detectIsolation(
    stats: Record<Dimension, { recentMean: number; baselineMean: number; baselineStd: number; trend: number; consecutiveDays: number }>,
    ignoreCounts: Record<string, number>,
    featureLogs: FeatureLogRecord[],
  ): GuardianLogEntry | null {
    const sigma = (ignoreCounts['isolation'] ?? 0) >= IGNORE_COUNT_FOR_ADAPTATION
      ? ADAPTED_SIGMA_THRESHOLD
      : DEFAULT_SIGMA_THRESHOLD;

    // Social dimensions must be >sigma below mean
    const socialBelow = ALL_DIMENSIONS.filter(
      (dim) => SOCIAL_DIMENSIONS.has(dim) && zScore(stats[dim].recentMean, stats[dim].baselineMean, stats[dim].baselineStd) < -sigma,
    );

    if (socialBelow.length === 0) return null;

    // Check digital fatigue spike from feature logs
    const hasDigitalFatigueSpike = this.checkDigitalFatigueSpike(featureLogs);

    // Even without digital fatigue spike, social isolation alone can trigger
    // but with digital fatigue it's more significant
    const maxConsecutive = Math.max(...socialBelow.map((d) => stats[d].consecutiveDays));
    if (maxConsecutive < LEVEL_2_DAYS) return null;

    const dimensionsAffected = socialBelow;
    const deviationMagnitude = Math.max(
      ...dimensionsAffected.map((d) => Math.abs(zScore(stats[d].recentMean, stats[d].baselineMean, stats[d].baselineStd))),
    );

    // Digital fatigue amplifies the deviation magnitude
    const adjustedMagnitude = hasDigitalFatigueSpike ? deviationMagnitude * 1.2 : deviationMagnitude;
    const escalationLevel = this.determineEscalation(maxConsecutive, adjustedMagnitude);
    const topFeatures = this.extractTopFeatures(featureLogs);

    const actionSuggested = this.synthesizer.generate({
      triggerType: 'isolation',
      dimensionsAffected,
      topFeatures,
    });

    return {
      timestamp: Date.now(),
      triggerType: 'isolation',
      escalationLevel,
      actionSuggested,
      userAccepted: false,
      dimensionsAffected,
      deviationMagnitude: adjustedMagnitude,
    };
  }

  private detectFlowState(
    stats: Record<Dimension, { recentMean: number; baselineMean: number; baselineStd: number; trend: number; consecutiveDays: number }>,
  ): GuardianLogEntry | null {
    // All dimensions must be trending positively for 5+ days
    const allPositive = ALL_DIMENSIONS.every((dim) => stats[dim].trend > 0);
    if (!allPositive) return null;

    // Check consecutive positive trend days (at least 5)
    const minConsecutive = Math.min(...ALL_DIMENSIONS.map((d) => stats[d].consecutiveDays));
    // For flow state, we want at least 5 days of consistent positive trend
    // We approximate via the consecutive deviation count from positive direction
    const allTrendsPositive = ALL_DIMENSIONS.every((dim) => {
      const z = zScore(stats[dim].recentMean, stats[dim].baselineMean, stats[dim].baselineStd);
      return z >= 0;
    });

    if (!allTrendsPositive) return null;

    // Average trend magnitude
    const avgTrend = computeDimensionAverage(ALL_DIMENSIONS.map((d) => stats[d].trend));

    const actionSuggested = this.synthesizer.generate({
      triggerType: 'flow_state',
      dimensionsAffected: ALL_DIMENSIONS.slice(),
      topFeatures: [],
    });

    return {
      timestamp: Date.now(),
      triggerType: 'flow_state',
      escalationLevel: 1, // Flow state is always a silent positive log
      actionSuggested,
      userAccepted: false,
      dimensionsAffected: ALL_DIMENSIONS.slice(),
      deviationMagnitude: avgTrend,
    };
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /**
   * Count how many consecutive recent days show deviation from baseline.
   * Counts backwards from the end of the score array.
   */
  private countConsecutiveDeviationDays(
    scores: number[],
    baselineMean: number,
    baselineStd: number,
  ): number {
    if (scores.length === 0 || baselineStd === 0) return 0;

    let count = 0;
    for (let i = scores.length - 1; i >= 0; i--) {
      const z = Math.abs((scores[i] - baselineMean) / baselineStd);
      if (z >= 0.5) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  private determineEscalation(
    consecutiveDays: number,
    deviationMagnitude: number,
  ): 1 | 2 | 3 {
    if (deviationMagnitude >= SEVERE_SIGMA_THRESHOLD || consecutiveDays >= LEVEL_3_DAYS) {
      return 3;
    }
    if (consecutiveDays >= LEVEL_2_DAYS) {
      return 2;
    }
    return 1;
  }

  private computeIgnoreCounts(
    logs: GuardianLogEntry[],
  ): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const log of logs) {
      if (!log.userAccepted) {
        counts[log.triggerType] = (counts[log.triggerType] ?? 0) + 1;
      }
    }
    return counts;
  }

  private checkDigitalFatigueSpike(featureLogs: FeatureLogRecord[]): boolean {
    if (featureLogs.length < 2) return false;
    const recent = featureLogs.slice(-RECENT_WINDOW);
    const fatigueScores = recent.map((fl) => fl.features.digital_fatigue);
    const mean = computeDimensionAverage(fatigueScores);
    return mean > 0.7; // High digital fatigue threshold
  }

  private extractTopFeatures(featureLogs: FeatureLogRecord[]): import('../ml/types').FeatureWeight[] {
    if (featureLogs.length === 0) return [];

    // Use the most recent feature log to extract salient features
    const latest = featureLogs[featureLogs.length - 1];
    const features = latest.features;

    const featureEntries: { feature: keyof typeof features; value: number }[] = [
      { feature: 'meeting_load', value: features.meeting_load },
      { feature: 'after_hours_work', value: features.after_hours_work },
      { feature: 'digital_fatigue', value: features.digital_fatigue },
      { feature: 'sleep_quality_score', value: 1 - features.sleep_quality_score }, // Invert so higher = worse
      { feature: 'context_switching_penalty', value: features.context_switching_penalty },
    ];

    const sorted = featureEntries.sort((a, b) => b.value - a.value);
    return sorted.slice(0, 3).map((entry) => ({
      feature: entry.feature,
      weight: entry.value,
      humanLabel: this.humanLabel(entry.feature),
    }));
  }

  private humanLabel(feature: string): string {
    const labels: Record<string, string> = {
      meeting_load: 'heavy meeting load',
      after_hours_work: 'after-hours work',
      digital_fatigue: 'screen fatigue',
      sleep_quality_score: 'poor sleep quality',
      context_switching_penalty: 'context switching',
      sleep_duration_score: 'short sleep',
      physical_strain: 'physical strain',
      recovery_status: 'low recovery',
      deep_work_opportunity: 'limited deep work',
      doomscroll_index: 'doomscrolling',
      audio_valence: 'music mood',
      audio_energy: 'music energy',
    };
    return labels[feature] ?? feature;
  }

  private triggerTypeLabel(triggerType: GuardianLogEntry['triggerType']): string {
    switch (triggerType) {
      case 'burnout':
        return 'Burnout Risk';
      case 'isolation':
        return 'Isolation Warning';
      case 'flow_state':
        return 'Flow State';
      default:
        return 'Alert';
    }
  }

  // -------------------------------------------------------------------------
  // Data Retention
  // -------------------------------------------------------------------------

  private async pruneOldData(): Promise<void> {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    await db.featureLogs.where('extractedAt').below(ninetyDaysAgo).delete();

    const oneEightyDaysAgo = Date.now() - 180 * 24 * 60 * 60 * 1000;
    await db.guardianLogs.where('timestamp').below(oneEightyDaysAgo).delete();
  }
}
