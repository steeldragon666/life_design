import { Dimension } from './enums';

export interface HolisticContext {
  world: {
    weather: any;
    nearbyHubs: any[];
    professionalTrends: any[];
  };
  performance: {
    averageScores: Record<Dimension, number>;
    trends: Record<Dimension, number>;
    recentActivities: any[];
  };
  intent: {
    activeGoals: any[];
    currentPathwayStep: any;
  };
  synthesis: {
    primaryFocus: Dimension;
    opportunityGap: string;
    actionableIntelligence: string;
  };
}

/**
 * Logic to be used by the AI engine to action data:
 * 1. Correlate Weather + Fitness scores (Suggestion: Indoor vs Outdoor)
 * 2. Correlate Professional Trends + Career Goals (Suggestion: Skill-up)
 * 3. Correlate Romance/Social scores + Nearby POIs (Suggestion: Date/Networking spots)
 */
export function synthesizeHolisticState(
  world: any,
  performance: any,
  intent: any
): Partial<HolisticContext> {
  // Logic to determine primary focus based on lowest balance score
  const scores = Object.entries(performance.averageScores || {}) as [Dimension, number][];
  const lowest = scores.sort((a, b) => a[1] - b[1])[0];
  
  return {
    world,
    performance,
    intent,
    synthesis: {
      primaryFocus: lowest?.[0] || Dimension.Growth,
      opportunityGap: `Your ${lowest?.[0]} score is below optimal balance.`,
      actionableIntelligence: "Use current weather and professional trends to close the gap."
    }
  };
}
