import { NORMALISATION_MAPS } from './constants';
import type { NormalisedProfile, RawAnswers } from './types';

/** Normalise a 1–10 Likert scale value to 0.0–1.0 */
export function normaliseLikert(value: number): number {
  return (Math.min(Math.max(value, 1), 10) - 1) / 9;
}

/** Normalise a categorical answer using predefined maps. Returns 0.5 for unknowns. */
export function normaliseCategory(mapKey: string, value: string): number {
  const map = (NORMALISATION_MAPS as Record<string, Record<string, number>>)[mapKey];
  if (!map) return 0.5;
  return map[value] ?? 0.5;
}

/** Normalise a complete raw answer set into a NormalisedProfile */
export function normaliseRawAnswers(raw: RawAnswers): NormalisedProfile {
  return {
    goal_domain: String(raw.goal_domain ?? ''),
    goal_importance: normaliseLikert(Number(raw.goal_importance ?? 5)),
    goal_urgency: normaliseCategory('goal_urgency', String(raw.goal_urgency ?? '')),
    execution_consistency: normaliseCategory('execution_consistency', String(raw.execution_consistency ?? '')),
    structure_preference: normaliseCategory('structure_preference', String(raw.structure_preference ?? '')),
    routine_stability: normaliseCategory('routine_stability', String(raw.routine_stability ?? '')),
    chronotype: String(raw.chronotype ?? ''),
    primary_failure_modes: Array.isArray(raw.primary_failure_modes) ? raw.primary_failure_modes : [],
    recovery_resilience: normaliseCategory('recovery_resilience', String(raw.recovery_resilience ?? '')),
    energy_level: normaliseLikert(Number(raw.energy_level ?? 5)),
    stress_load: normaliseLikert(Number(raw.stress_load ?? 5)),
    life_load: normaliseCategory('life_load', String(raw.life_load ?? '')),
    motivation_type: String(raw.motivation_type ?? ''),
    action_orientation: normaliseCategory('action_orientation', String(raw.action_orientation ?? '')),
    delay_discounting_score: normaliseCategory('delay_discounting', String(raw.delay_discounting_choice ?? '')),
    self_efficacy: normaliseLikert(Number(raw.self_efficacy ?? 5)),
    planning_style: String(raw.planning_style ?? ''),
    social_recharge_style: String(raw.social_recharge_style ?? ''),
  };
}
