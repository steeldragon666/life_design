import { Dimension } from './enums';
import {
  computeAllPairCorrelations,
  detectSignificantPatterns,
  generateInsightNarrative,
  rankInsightsByNovelty,
  type CorrelationMatrix,
  type RankedInsight,
  type ScoresByDateOrSeries,
} from './correlation';
import { computeBalanceIndex } from './scoring';

export interface HolisticContext {
  world: {
    weather: unknown;
    nearbyHubs: unknown[];
    professionalTrends: unknown[];
  };
  performance: {
    averageScores: Record<Dimension, number>;
    trends: Record<Dimension, number>;
    recentActivities: unknown[];
    balanceIndex?: number;
    correlationMatrix?: CorrelationMatrix;
    significantPatterns?: RankedInsight[];
  };
  intent: {
    activeGoals: unknown[];
    currentPathwayStep: unknown;
  };
  synthesis: {
    primaryFocus: Dimension;
    opportunityGap: string;
    actionableIntelligence: string;
    balanceIndex?: number;
    narratives?: string[];
    correlationHighlights?: RankedInsight[];
  };
}

export interface HolisticPerformanceInput {
  averageScores?: Partial<Record<Dimension, number>>;
  trends?: Partial<Record<Dimension, number>>;
  recentActivities?: unknown[];
  scoreSeries?: ScoresByDateOrSeries;
  correlationMatrix?: CorrelationMatrix;
  seenInsights?: Iterable<string>;
}

export interface HolisticIntentInput {
  activeGoals?: unknown[];
  currentPathwayStep?: unknown;
}

export interface HolisticWorldInput {
  weather?: unknown;
  nearbyHubs?: unknown[];
  professionalTrends?: unknown[];
  [key: string]: unknown;
}

function normalizeAverageScores(
  scores?: Partial<Record<Dimension, number>>,
): Record<Dimension, number> {
  return {
    [Dimension.Career]: scores?.[Dimension.Career] ?? 0,
    [Dimension.Finance]: scores?.[Dimension.Finance] ?? 0,
    [Dimension.Health]: scores?.[Dimension.Health] ?? 0,
    [Dimension.Fitness]: scores?.[Dimension.Fitness] ?? 0,
    [Dimension.Family]: scores?.[Dimension.Family] ?? 0,
    [Dimension.Social]: scores?.[Dimension.Social] ?? 0,
    [Dimension.Romance]: scores?.[Dimension.Romance] ?? 0,
    [Dimension.Growth]: scores?.[Dimension.Growth] ?? 0,
  };
}

/**
 * Logic to be used by the AI engine to action data:
 * 1. Correlate Weather + Fitness scores (Suggestion: Indoor vs Outdoor)
 * 2. Correlate Professional Trends + Career Goals (Suggestion: Skill-up)
 * 3. Correlate Romance/Social scores + Nearby POIs (Suggestion: Date/Networking spots)
 */
export function synthesizeHolisticState(
  world: HolisticWorldInput,
  performance: HolisticPerformanceInput,
  intent: HolisticIntentInput,
): Partial<HolisticContext> {
  const averageScores = normalizeAverageScores(performance.averageScores);
  const scoreEntries = Object.entries(averageScores) as [Dimension, number][];
  const lowest = [...scoreEntries].sort((a, b) => a[1] - b[1])[0];
  const balanceIndex = computeBalanceIndex(scoreEntries.map(([, score]) => score));

  const baseMatrix =
    performance.correlationMatrix ??
    (performance.scoreSeries ? computeAllPairCorrelations(performance.scoreSeries) : []);
  const significant = detectSignificantPatterns(baseMatrix, 0.55);
  const highlights = rankInsightsByNovelty(significant, performance.seenInsights ?? []).slice(0, 3);
  const narratives = highlights.map(generateInsightNarrative);

  const primaryFocus = lowest?.[0] ?? Dimension.Growth;
  const primaryScore = lowest?.[1] ?? 0;
  const opportunityGap = `Your ${primaryFocus} score (${primaryScore.toFixed(1)}) is currently the furthest from balance.`;
  const actionableIntelligence =
    narratives[0] ??
    'No statistically significant life-pattern links yet. Keep consistent check-ins to unlock stronger signals.';

  return {
    world: {
      ...world,
      weather: world.weather ?? null,
      nearbyHubs: world.nearbyHubs ?? [],
      professionalTrends: world.professionalTrends ?? [],
    },
    performance: {
      averageScores,
      trends: {
        [Dimension.Career]: performance.trends?.[Dimension.Career] ?? 0,
        [Dimension.Finance]: performance.trends?.[Dimension.Finance] ?? 0,
        [Dimension.Health]: performance.trends?.[Dimension.Health] ?? 0,
        [Dimension.Fitness]: performance.trends?.[Dimension.Fitness] ?? 0,
        [Dimension.Family]: performance.trends?.[Dimension.Family] ?? 0,
        [Dimension.Social]: performance.trends?.[Dimension.Social] ?? 0,
        [Dimension.Romance]: performance.trends?.[Dimension.Romance] ?? 0,
        [Dimension.Growth]: performance.trends?.[Dimension.Growth] ?? 0,
      },
      recentActivities: performance.recentActivities ?? [],
      balanceIndex,
      correlationMatrix: baseMatrix,
      significantPatterns: highlights,
    },
    intent: {
      activeGoals: intent.activeGoals ?? [],
      currentPathwayStep: intent.currentPathwayStep ?? null,
    },
    synthesis: {
      primaryFocus,
      opportunityGap,
      actionableIntelligence,
      balanceIndex,
      narratives,
      correlationHighlights: highlights,
    },
  };
}
