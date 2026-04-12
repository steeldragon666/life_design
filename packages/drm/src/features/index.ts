/**
 * @module features
 *
 * Re-exports all feature modules for the Deep Relational Model (DRM).
 */

export {
  LIFE_STORY_PROMPT,
  buildLifeStoryContext,
  parseLifeStoryResponse,
  createDefaultLifeStory,
} from './life-story';

export {
  GROWTH_NARRATIVE_PROMPT,
  buildGrowthNarrativeContext,
  parseGrowthNarrativeResponse,
  shouldGenerateNarrative,
} from './growth-narrative';

export {
  PATTERN_ANALYSIS_PROMPT,
  buildPatternAnalysisContext,
  parsePatternResponse,
  detectCyclicalPatterns,
  detectAvoidancePatterns,
  formatPatternInsight,
} from './pattern-intelligence';

export type { MicroMomentContext } from './micro-moments';

export {
  MICRO_MOMENT_PROMPT,
  buildMicroMomentMessage,
  determineMicroMoment,
} from './micro-moments';
