import { ModelTask, routeToModel, SONNET_MODEL, OPUS_MODEL } from '../model-router.js';
import { ModelTier } from '../../types.js';

describe('routeToModel', () => {
  it('routes Conversation to Sonnet', () => {
    const config = routeToModel(ModelTask.Conversation);
    expect(config.model).toBe(SONNET_MODEL);
    expect(config.tier).toBe(ModelTier.Sonnet);
  });

  it('routes SafetyClassification to Sonnet', () => {
    const config = routeToModel(ModelTask.SafetyClassification);
    expect(config.model).toBe(SONNET_MODEL);
    expect(config.tier).toBe(ModelTier.Sonnet);
  });

  it('routes BackgroundProcessing to Sonnet', () => {
    const config = routeToModel(ModelTask.BackgroundProcessing);
    expect(config.model).toBe(SONNET_MODEL);
    expect(config.tier).toBe(ModelTier.Sonnet);
  });

  it('routes EpisodicSummarisation to Sonnet', () => {
    const config = routeToModel(ModelTask.EpisodicSummarisation);
    expect(config.model).toBe(SONNET_MODEL);
    expect(config.tier).toBe(ModelTier.Sonnet);
  });

  it('routes ProfileUpdate to Sonnet', () => {
    const config = routeToModel(ModelTask.ProfileUpdate);
    expect(config.model).toBe(SONNET_MODEL);
    expect(config.tier).toBe(ModelTier.Sonnet);
  });

  it('routes GrowthNarrative to Opus', () => {
    const config = routeToModel(ModelTask.GrowthNarrative);
    expect(config.model).toBe(OPUS_MODEL);
    expect(config.tier).toBe(ModelTier.Opus);
  });

  it('routes PatternAnalysis to Opus', () => {
    const config = routeToModel(ModelTask.PatternAnalysis);
    expect(config.model).toBe(OPUS_MODEL);
    expect(config.tier).toBe(ModelTier.Opus);
  });

  it('routes CrisisAssessment to Opus', () => {
    const config = routeToModel(ModelTask.CrisisAssessment);
    expect(config.model).toBe(OPUS_MODEL);
    expect(config.tier).toBe(ModelTier.Opus);
  });

  it('routes LifeStorySynthesis to Opus', () => {
    const config = routeToModel(ModelTask.LifeStorySynthesis);
    expect(config.model).toBe(OPUS_MODEL);
    expect(config.tier).toBe(ModelTier.Opus);
  });

  it('routes ModalitySwitching to Opus', () => {
    const config = routeToModel(ModelTask.ModalitySwitching);
    expect(config.model).toBe(OPUS_MODEL);
    expect(config.tier).toBe(ModelTier.Opus);
  });

  it('handles every ModelTask value without returning undefined', () => {
    const allTasks = Object.values(ModelTask);
    for (const task of allTasks) {
      const config = routeToModel(task);
      expect(config).toBeDefined();
      expect(config.model).toBeTruthy();
      expect(typeof config.maxTokens).toBe('number');
      expect(typeof config.temperature).toBe('number');
    }
  });

  it('SafetyClassification has temperature 0.1 (near-zero for determinism)', () => {
    const config = routeToModel(ModelTask.SafetyClassification);
    expect(config.temperature).toBeLessThanOrEqual(0.1);
  });

  it('CrisisAssessment has temperature 0.1 (near-zero for determinism)', () => {
    const config = routeToModel(ModelTask.CrisisAssessment);
    expect(config.temperature).toBeLessThanOrEqual(0.1);
  });

  it('GrowthNarrative has higher temperature (creative synthesis)', () => {
    const config = routeToModel(ModelTask.GrowthNarrative);
    expect(config.temperature).toBeGreaterThanOrEqual(0.5);
  });

  it('Conversation has moderate-high temperature', () => {
    const config = routeToModel(ModelTask.Conversation);
    expect(config.temperature).toBeGreaterThanOrEqual(0.5);
  });

  it('returns a new object each call (not a shared reference)', () => {
    const a = routeToModel(ModelTask.Conversation);
    const b = routeToModel(ModelTask.Conversation);
    expect(a).not.toBe(b);
  });
});
