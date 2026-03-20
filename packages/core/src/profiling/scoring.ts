import { DROPOUT_RISK_WEIGHTS, GOAL_SUCCESS_WEIGHTS } from './constants';
import type { NormalisedProfile, DerivedScores } from './types';

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function mean(...values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function weighted(pairs: [number, number][]): number {
  return pairs.reduce((sum, [value, weight]) => sum + value * weight, 0);
}

export function frictionIndex(stressLoad: number, lifeLoad: number, energyLevel: number): number {
  return clamp01(mean(stressLoad, lifeLoad, 1 - energyLevel));
}

export function disciplineIndex(executionConsistency: number, routineStability: number, selfEfficacy: number): number {
  return clamp01(mean(executionConsistency, routineStability, selfEfficacy));
}

export function structureNeed(stressLoad: number, routineStability: number, structurePreference: number): number {
  return clamp01(weighted([
    [stressLoad, 0.3],
    [1 - routineStability, 0.4],
    [structurePreference, 0.3],
  ]));
}

export function dropoutRiskInitial(profile: NormalisedProfile): number {
  const w = DROPOUT_RISK_WEIGHTS;
  return clamp01(
    w.execution_consistency * (1 - profile.execution_consistency) +
    w.stress_load * profile.stress_load +
    w.life_load * profile.life_load +
    w.recovery_resilience * (1 - profile.recovery_resilience) +
    w.self_efficacy * (1 - profile.self_efficacy) +
    w.energy_level * (1 - profile.energy_level) +
    w.routine_stability * (1 - profile.routine_stability)
  );
}

export function goalSuccessPrior(profile: NormalisedProfile): number {
  const w = GOAL_SUCCESS_WEIGHTS;
  return clamp01(
    w.execution_consistency * profile.execution_consistency +
    w.self_efficacy * profile.self_efficacy +
    w.energy_level * profile.energy_level +
    w.routine_stability * profile.routine_stability +
    w.recovery_resilience * profile.recovery_resilience +
    w.goal_importance * profile.goal_importance +
    w.delay_discounting_score * profile.delay_discounting_score
  );
}

export function computeAllDerivedScores(profile: NormalisedProfile): DerivedScores {
  return {
    friction_index: frictionIndex(profile.stress_load, profile.life_load, profile.energy_level),
    discipline_index: disciplineIndex(profile.execution_consistency, profile.routine_stability, profile.self_efficacy),
    structure_need: structureNeed(profile.stress_load, profile.routine_stability, profile.structure_preference),
    dropout_risk_initial: dropoutRiskInitial(profile),
    goal_success_prior: goalSuccessPrior(profile),
  };
}
