// packages/core/src/profiling/types.ts

/** Sections in the onboarding questionnaire */
export type ProfilingSection =
  | 'goal'
  | 'habits'
  | 'energy'
  | 'style'
  | 'wellbeing'
  | 'baseline'
  | 'personality'
  | 'drive'
  | 'satisfaction'
  | 'needs';

/** Question input types */
export type QuestionType = 'single_select' | 'multi_select' | 'scale';

/** A single question definition */
export interface QuestionDefinition {
  id: string;
  section: ProfilingSection;
  type: QuestionType;
  question: string;
  options?: { value: string; label: string }[];
  scaleMin?: number;
  scaleMax?: number;
  maxSelections?: number;
}

/** Raw answers as stored in onboarding_sessions.raw_answers */
export type RawAnswers = Record<string, string | string[] | number>;

/** Normalised profile — all values 0.0–1.0 */
export interface NormalisedProfile {
  goal_domain: string;
  goal_importance: number;
  goal_urgency: number;
  execution_consistency: number;
  structure_preference: number;
  routine_stability: number;
  chronotype: string;
  primary_failure_modes: string[];
  recovery_resilience: number;
  energy_level: number;
  stress_load: number;
  life_load: number;
  motivation_type: string;
  action_orientation: number;
  delay_discounting_score: number;
  self_efficacy: number;
  planning_style: string;
  social_recharge_style: string;
}

/** Derived composite scores */
export interface DerivedScores {
  friction_index: number;
  discipline_index: number;
  structure_need: number;
  dropout_risk_initial: number;
  goal_success_prior: number;
}

/** Template-based profile summary */
export interface ProfileSummaryTemplate {
  strength: string;
  friction: string;
  strategy: string;
  this_week: string;
}

/** Full user profile (matches user_profiles table) */
export interface DetailedUserProfile extends NormalisedProfile, DerivedScores {
  id: string;
  user_id: string;
  profile_version: number;
  intervention_preferences: Record<string, unknown>;
  profile_confidence: number;
  source_mix: { onboarding: number; behaviour: number };
  summary_template: ProfileSummaryTemplate | null;
  summary_llm: string | null;
  created_at: string;
  updated_at: string;
}

/** Onboarding session status */
export type OnboardingSessionStatus = 'in_progress' | 'completed' | 'abandoned';

/** Onboarding session (matches onboarding_sessions table) */
export interface OnboardingSession {
  id: string;
  user_id: string;
  status: OnboardingSessionStatus;
  current_section: ProfilingSection | 'mentors' | 'summary';
  current_step: number;
  version: number;
  raw_answers: RawAnswers;
  normalized_answers: Partial<NormalisedProfile>;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
}
