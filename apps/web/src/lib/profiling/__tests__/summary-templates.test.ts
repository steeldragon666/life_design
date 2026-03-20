import { describe, it, expect } from 'vitest';
import { generateSummaryTemplate } from '../summary-templates';
import type { NormalisedProfile, DerivedScores } from '@life-design/core';

const baseProfile: NormalisedProfile = {
  goal_domain: 'health_fitness',
  goal_importance: 0.78,
  goal_urgency: 0.75,
  execution_consistency: 0.75,
  structure_preference: 0.55,
  routine_stability: 0.7,
  chronotype: 'early_morning',
  primary_failure_modes: ['low_energy'],
  recovery_resilience: 0.5,
  energy_level: 0.56,
  stress_load: 0.67,
  life_load: 0.45,
  motivation_type: 'progress',
  action_orientation: 1.0,
  delay_discounting_score: 0.8,
  self_efficacy: 0.67,
  planning_style: 'structure',
  social_recharge_style: 'alone',
};

const baseScores: DerivedScores = {
  friction_index: 0.52,
  discipline_index: 0.71,
  structure_need: 0.44,
  dropout_risk_initial: 0.35,
  goal_success_prior: 0.68,
};

describe('generateSummaryTemplate', () => {
  it('returns all 4 summary fields', () => {
    const result = generateSummaryTemplate(baseProfile, baseScores);
    expect(result.strength).toBeTruthy();
    expect(result.friction).toBeTruthy();
    expect(result.strategy).toBeTruthy();
    expect(result.this_week).toBeTruthy();
  });

  it('strength reflects high discipline', () => {
    const result = generateSummaryTemplate(baseProfile, { ...baseScores, discipline_index: 0.85 });
    expect(result.strength).toContain('follow-through');
  });

  it('friction reflects high friction index', () => {
    const result = generateSummaryTemplate(baseProfile, { ...baseScores, friction_index: 0.75 });
    expect(result.friction.length).toBeGreaterThan(10);
  });

  it('returns non-empty strings for edge-case profiles', () => {
    const lowProfile: NormalisedProfile = {
      ...baseProfile,
      execution_consistency: 0.1,
      self_efficacy: 0.1,
      energy_level: 0.1,
    };
    const lowScores: DerivedScores = {
      friction_index: 0.9,
      discipline_index: 0.1,
      structure_need: 0.9,
      dropout_risk_initial: 0.85,
      goal_success_prior: 0.15,
    };
    const result = generateSummaryTemplate(lowProfile, lowScores);
    expect(result.strength.length).toBeGreaterThan(5);
    expect(result.strategy.length).toBeGreaterThan(5);
  });
});
