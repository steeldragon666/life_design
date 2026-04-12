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
} from './life-story.js';

export {
  GROWTH_NARRATIVE_PROMPT,
  buildGrowthNarrativeContext,
  parseGrowthNarrativeResponse,
  shouldGenerateNarrative,
} from './growth-narrative.js';

export {
  PATTERN_ANALYSIS_PROMPT,
  buildPatternAnalysisContext,
  parsePatternResponse,
  detectCyclicalPatterns,
  detectAvoidancePatterns,
  formatPatternInsight,
} from './pattern-intelligence.js';

export type { MicroMomentContext } from './micro-moments.js';

export {
  MICRO_MOMENT_PROMPT,
  buildMicroMomentMessage,
  determineMicroMoment,
} from './micro-moments.js';
