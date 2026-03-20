// packages/core/src/profiling/constants.ts

/** Normalisation maps for ordered categorical answers → 0.0–1.0 */
export const NORMALISATION_MAPS = {
  goal_urgency: {
    not_urgent: 0.15,
    somewhat_urgent: 0.45,
    urgent: 0.75,
    critical: 1.0,
  },
  execution_consistency: {
    almost_always: 1.0,
    often: 0.75,
    sometimes: 0.45,
    rarely: 0.15,
  },
  structure_preference: {
    detailed_schedule: 1.0,
    rough_plan: 0.55,
    no_plan: 0.15,
  },
  routine_stability: {
    very_consistent: 1.0,
    mostly_consistent: 0.7,
    irregular: 0.35,
    completely_unpredictable: 0.1,
  },
  recovery_resilience: {
    immediately: 1.0,
    struggle_recover: 0.5,
    fall_off: 0.15,
  },
  life_load: {
    '1_2': 0.15,
    '3_4': 0.45,
    '5_6': 0.75,
    '7_plus': 1.0,
  },
  action_orientation: {
    act_quickly: 1.0,
    think_carefully: 0.3,
  },
  delay_discounting: {
    '100_today': 0.2,
    '150_in_1_month': 0.8,
  },
  planning_style: {
    structure: 1.0,
    flexibility: 0.25,
  },
  social_recharge: {
    alone: 0.3,
    others: 0.8,
  },
} as const;

/** Dropout risk weights (sum = 1.0) */
export const DROPOUT_RISK_WEIGHTS = {
  execution_consistency: 0.24,
  stress_load: 0.18,
  life_load: 0.14,
  recovery_resilience: 0.12,
  self_efficacy: 0.12,
  energy_level: 0.10,
  routine_stability: 0.10,
} as const;

/** Goal success prior weights (sum = 1.0) */
export const GOAL_SUCCESS_WEIGHTS = {
  execution_consistency: 0.25,
  self_efficacy: 0.20,
  energy_level: 0.15,
  routine_stability: 0.15,
  recovery_resilience: 0.10,
  goal_importance: 0.10,
  delay_discounting_score: 0.05,
} as const;

/** Structure need weights (sum = 1.0) */
export const STRUCTURE_NEED_WEIGHTS = {
  stress_load: 0.3,
  routine_stability_inverse: 0.4,
  structure_preference: 0.3,
} as const;
