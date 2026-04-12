/**
 * @module client/model-router
 *
 * Maps DRM task types to concrete model configurations.
 * Sonnet handles latency-sensitive and background work; Opus handles tasks
 * requiring deep reasoning, synthesis, or clinical judgement.
 */

import { ModelTier } from '../types.js';

// ── Task enum ────────────────────────────────────────────────────────────────

/**
 * Every task that the DRM pipeline dispatches to a language model.
 * Used as the routing key — add new values here when new task types emerge.
 */
export enum ModelTask {
  // Sonnet — fast & cost-efficient
  Conversation = 'Conversation',
  SafetyClassification = 'SafetyClassification',
  BackgroundProcessing = 'BackgroundProcessing',
  EpisodicSummarisation = 'EpisodicSummarisation',
  ProfileUpdate = 'ProfileUpdate',

  // Opus — deep reasoning
  GrowthNarrative = 'GrowthNarrative',
  PatternAnalysis = 'PatternAnalysis',
  ModalitySwitching = 'ModalitySwitching',
  LifeStorySynthesis = 'LifeStorySynthesis',
  CrisisAssessment = 'CrisisAssessment',
}

// ── Model strings ────────────────────────────────────────────────────────────

export const SONNET_MODEL = 'claude-sonnet-4-20250514' as const;
export const OPUS_MODEL = 'claude-opus-4-20250514' as const;

// ── Config type ───────────────────────────────────────────────────────────────

/**
 * All parameters needed to instantiate a model call for a given task.
 */
export interface ModelConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  tier: ModelTier;
}

// ── Preset configs ────────────────────────────────────────────────────────────

const SONNET_CONVERSATION: ModelConfig = {
  model: SONNET_MODEL,
  maxTokens: 1024,
  temperature: 0.7,
  tier: ModelTier.Sonnet,
};

const SONNET_CLASSIFICATION: ModelConfig = {
  model: SONNET_MODEL,
  maxTokens: 256,
  temperature: 0.1,
  tier: ModelTier.Sonnet,
};

const SONNET_BACKGROUND: ModelConfig = {
  model: SONNET_MODEL,
  maxTokens: 2048,
  temperature: 0.3,
  tier: ModelTier.Sonnet,
};

const SONNET_SUMMARISATION: ModelConfig = {
  model: SONNET_MODEL,
  maxTokens: 1024,
  temperature: 0.3,
  tier: ModelTier.Sonnet,
};

const SONNET_PROFILE_UPDATE: ModelConfig = {
  model: SONNET_MODEL,
  maxTokens: 1024,
  temperature: 0.2,
  tier: ModelTier.Sonnet,
};

const OPUS_NARRATIVE: ModelConfig = {
  model: OPUS_MODEL,
  maxTokens: 4096,
  temperature: 0.7,
  tier: ModelTier.Opus,
};

const OPUS_PATTERN_ANALYSIS: ModelConfig = {
  model: OPUS_MODEL,
  maxTokens: 4096,
  temperature: 0.4,
  tier: ModelTier.Opus,
};

const OPUS_MODALITY_SWITCHING: ModelConfig = {
  model: OPUS_MODEL,
  maxTokens: 2048,
  temperature: 0.4,
  tier: ModelTier.Opus,
};

const OPUS_LIFE_STORY: ModelConfig = {
  model: OPUS_MODEL,
  maxTokens: 8192,
  temperature: 0.7,
  tier: ModelTier.Opus,
};

const OPUS_CRISIS: ModelConfig = {
  model: OPUS_MODEL,
  maxTokens: 1024,
  temperature: 0.1,
  tier: ModelTier.Opus,
};

// ── Routing map ───────────────────────────────────────────────────────────────

const TASK_CONFIG_MAP: Record<ModelTask, ModelConfig> = {
  [ModelTask.Conversation]: SONNET_CONVERSATION,
  [ModelTask.SafetyClassification]: SONNET_CLASSIFICATION,
  [ModelTask.BackgroundProcessing]: SONNET_BACKGROUND,
  [ModelTask.EpisodicSummarisation]: SONNET_SUMMARISATION,
  [ModelTask.ProfileUpdate]: SONNET_PROFILE_UPDATE,
  [ModelTask.GrowthNarrative]: OPUS_NARRATIVE,
  [ModelTask.PatternAnalysis]: OPUS_PATTERN_ANALYSIS,
  [ModelTask.ModalitySwitching]: OPUS_MODALITY_SWITCHING,
  [ModelTask.LifeStorySynthesis]: OPUS_LIFE_STORY,
  [ModelTask.CrisisAssessment]: OPUS_CRISIS,
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return the `ModelConfig` for a given `ModelTask`.
 *
 * The returned object is frozen to prevent mutation across call sites.
 * Callers may spread it to override individual fields for one-off requests.
 *
 * @example
 * ```ts
 * const config = routeToModel(ModelTask.CrisisAssessment);
 * // { model: 'claude-opus-4-20250514', maxTokens: 1024, temperature: 0.1, tier: ModelTier.Opus }
 * ```
 */
export function routeToModel(task: ModelTask): ModelConfig {
  return { ...TASK_CONFIG_MAP[task] };
}
