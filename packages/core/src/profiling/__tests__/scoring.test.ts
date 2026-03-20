import { describe, it, expect } from 'vitest';
import {
  frictionIndex,
  disciplineIndex,
  structureNeed,
  dropoutRiskInitial,
  goalSuccessPrior,
  computeAllDerivedScores,
} from '../scoring';
import type { NormalisedProfile } from '../types';

const mockProfile: NormalisedProfile = {
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

describe('frictionIndex', () => {
  it('returns value between 0 and 1', () => {
    const result = frictionIndex(mockProfile.stress_load, mockProfile.life_load, mockProfile.energy_level);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('high stress + high load + low energy = high friction', () => {
    const result = frictionIndex(0.9, 0.9, 0.1);
    expect(result).toBeGreaterThan(0.7);
  });

  it('low stress + low load + high energy = low friction', () => {
    const result = frictionIndex(0.1, 0.1, 0.9);
    expect(result).toBeLessThan(0.15);
  });
});

describe('disciplineIndex', () => {
  it('returns value between 0 and 1', () => {
    const result = disciplineIndex(mockProfile.execution_consistency, mockProfile.routine_stability, mockProfile.self_efficacy);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

describe('dropoutRiskInitial', () => {
  it('returns value between 0 and 1', () => {
    const result = dropoutRiskInitial(mockProfile);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('low consistency + high stress = higher risk', () => {
    const riskyProfile = { ...mockProfile, execution_consistency: 0.15, stress_load: 0.9, self_efficacy: 0.15 };
    const result = dropoutRiskInitial(riskyProfile);
    expect(result).toBeGreaterThan(0.5);
  });
});

describe('goalSuccessPrior', () => {
  it('returns value between 0 and 1', () => {
    const result = goalSuccessPrior(mockProfile);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

describe('computeAllDerivedScores', () => {
  it('returns all 5 derived scores', () => {
    const scores = computeAllDerivedScores(mockProfile);
    expect(scores).toHaveProperty('friction_index');
    expect(scores).toHaveProperty('discipline_index');
    expect(scores).toHaveProperty('structure_need');
    expect(scores).toHaveProperty('dropout_risk_initial');
    expect(scores).toHaveProperty('goal_success_prior');
    Object.values(scores).forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    });
  });
});
