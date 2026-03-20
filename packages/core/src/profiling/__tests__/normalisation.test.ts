import { describe, it, expect } from 'vitest';
import { normaliseLikert, normaliseCategory, normaliseRawAnswers } from '../normalisation';
import type { RawAnswers } from '../types';

describe('normaliseLikert', () => {
  it('maps 1 to 0.0', () => {
    expect(normaliseLikert(1)).toBeCloseTo(0.0);
  });

  it('maps 10 to 1.0', () => {
    expect(normaliseLikert(10)).toBeCloseTo(1.0);
  });

  it('maps 5 to ~0.444', () => {
    expect(normaliseLikert(5)).toBeCloseTo(4 / 9);
  });

  it('clamps below 1', () => {
    expect(normaliseLikert(0)).toBeCloseTo(0.0);
  });

  it('clamps above 10', () => {
    expect(normaliseLikert(15)).toBeCloseTo(1.0);
  });
});

describe('normaliseCategory', () => {
  it('returns mapped value for known category', () => {
    expect(normaliseCategory('goal_urgency', 'critical')).toBe(1.0);
  });

  it('returns 0.5 for unknown category value', () => {
    expect(normaliseCategory('goal_urgency', 'nonexistent')).toBe(0.5);
  });

  it('returns 0.5 for unknown map key', () => {
    expect(normaliseCategory('nonexistent_map', 'value')).toBe(0.5);
  });
});

describe('normaliseRawAnswers', () => {
  it('normalises a complete answer set', () => {
    const raw: RawAnswers = {
      goal_domain: 'health_fitness',
      goal_importance: 8,
      goal_urgency: 'urgent',
      execution_consistency: 'often',
      structure_preference: 'rough_plan',
      routine_stability: 'mostly_consistent',
      chronotype: 'early_morning',
      primary_failure_modes: ['low_energy', 'distractions'],
      recovery_resilience: 'struggle_recover',
      energy_level: 6,
      stress_load: 7,
      life_load: '3_4',
      motivation_type: 'progress',
      action_orientation: 'act_quickly',
      delay_discounting_choice: '150_in_1_month',
      self_efficacy: 7,
      planning_style: 'structure',
      social_recharge_style: 'alone',
    };

    const result = normaliseRawAnswers(raw);
    expect(result.goal_importance).toBeCloseTo(7 / 9);
    expect(result.goal_urgency).toBe(0.75);
    expect(result.execution_consistency).toBe(0.75);
    expect(result.delay_discounting_score).toBe(0.8);
    expect(result.primary_failure_modes).toEqual(['low_energy', 'distractions']);
    expect(result.chronotype).toBe('early_morning');
  });
});
