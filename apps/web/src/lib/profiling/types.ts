import type { ProfilingSection, QuestionDefinition, RawAnswers, OnboardingSession } from '@life-design/core';

export type { ProfilingSection, QuestionDefinition, RawAnswers, OnboardingSession };

/** Wizard navigation position */
export interface WizardPosition {
  section: ProfilingSection | 'mentors' | 'summary';
  questionIndex: number;
}

/** Section metadata for the progress bar */
export interface SectionMeta {
  id: ProfilingSection;
  label: string;
  questionCount: number;
}
