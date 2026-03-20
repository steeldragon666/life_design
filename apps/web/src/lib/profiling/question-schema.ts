import type { QuestionDefinition } from '@life-design/core';
import type { SectionMeta } from './types';

export const SECTIONS: SectionMeta[] = [
  { id: 'goal', label: 'Your Goal', questionCount: 3 },
  { id: 'habits', label: 'Your Habits', questionCount: 5 },
  { id: 'energy', label: 'Your Energy', questionCount: 4 },
  { id: 'style', label: 'Your Style', questionCount: 6 },
];

export const QUESTIONS: QuestionDefinition[] = [
  // --- Section: goal (3 questions) ---
  {
    id: 'goal_domain',
    section: 'goal',
    type: 'single_select',
    question: 'What do you want to improve right now?',
    options: [
      { value: 'health_fitness', label: 'Health & fitness' },
      { value: 'energy_sleep', label: 'Energy & sleep' },
      { value: 'productivity', label: 'Productivity' },
      { value: 'learning_skills', label: 'Learning & skills' },
      { value: 'mental_wellbeing', label: 'Mental wellbeing' },
      { value: 'financial_discipline', label: 'Financial discipline' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    id: 'goal_importance',
    section: 'goal',
    type: 'scale',
    question: 'How important is this goal to you right now?',
    scaleMin: 1,
    scaleMax: 10,
  },
  {
    id: 'goal_urgency',
    section: 'goal',
    type: 'single_select',
    question: 'How urgent is this for you?',
    options: [
      { value: 'not_urgent', label: 'Not urgent' },
      { value: 'somewhat_urgent', label: 'Somewhat urgent' },
      { value: 'urgent', label: 'Urgent' },
      { value: 'critical', label: 'Critical' },
    ],
  },
  // --- Section: habits (5 questions) ---
  {
    id: 'execution_consistency',
    section: 'habits',
    type: 'single_select',
    question: 'When you plan something for the day, how often do you follow through?',
    options: [
      { value: 'almost_always', label: 'Almost always' },
      { value: 'often', label: 'Often' },
      { value: 'sometimes', label: 'Sometimes' },
      { value: 'rarely', label: 'Rarely' },
    ],
  },
  {
    id: 'structure_preference',
    section: 'habits',
    type: 'single_select',
    question: 'How do you usually organise your day?',
    options: [
      { value: 'detailed_schedule', label: 'Detailed schedule' },
      { value: 'rough_plan', label: 'Rough plan' },
      { value: 'no_plan', label: 'No plan, decide as I go' },
    ],
  },
  {
    id: 'routine_stability',
    section: 'habits',
    type: 'single_select',
    question: 'How consistent is your daily routine?',
    options: [
      { value: 'very_consistent', label: 'Very consistent' },
      { value: 'mostly_consistent', label: 'Mostly consistent' },
      { value: 'irregular', label: 'Irregular' },
      { value: 'completely_unpredictable', label: 'Completely unpredictable' },
    ],
  },
  {
    id: 'chronotype',
    section: 'habits',
    type: 'single_select',
    question: 'When are you naturally most productive?',
    options: [
      { value: 'early_morning', label: 'Early morning' },
      { value: 'late_morning', label: 'Late morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' },
      { value: 'late_night', label: 'Late night' },
    ],
  },
  {
    id: 'primary_failure_modes',
    section: 'habits',
    type: 'multi_select',
    question: 'What most often stops you from achieving goals?',
    maxSelections: 2,
    options: [
      { value: 'lack_of_time', label: 'Lack of time' },
      { value: 'low_energy', label: 'Low energy' },
      { value: 'losing_motivation', label: 'Losing motivation' },
      { value: 'distractions', label: 'Distractions' },
      { value: 'not_knowing_next', label: 'Not knowing what to do next' },
      { value: 'overcommitting', label: 'Overcommitting' },
      { value: 'stress_overwhelm', label: 'Stress / overwhelm' },
    ],
  },
  // --- Section: energy (4 questions) ---
  {
    id: 'recovery_resilience',
    section: 'energy',
    type: 'single_select',
    question: 'When you miss a day, what usually happens next?',
    options: [
      { value: 'immediately', label: 'I get back on track immediately' },
      { value: 'struggle_recover', label: 'I struggle but recover' },
      { value: 'fall_off', label: 'I often fall off completely' },
    ],
  },
  {
    id: 'energy_level',
    section: 'energy',
    type: 'scale',
    question: 'How would you rate your daily energy levels?',
    scaleMin: 1,
    scaleMax: 10,
  },
  {
    id: 'stress_load',
    section: 'energy',
    type: 'scale',
    question: 'How overwhelmed do you feel day-to-day?',
    scaleMin: 1,
    scaleMax: 10,
  },
  {
    id: 'life_load',
    section: 'energy',
    type: 'single_select',
    question: 'How many major commitments are you currently balancing?',
    options: [
      { value: '1_2', label: '1–2' },
      { value: '3_4', label: '3–4' },
      { value: '5_6', label: '5–6' },
      { value: '7_plus', label: '7+' },
    ],
  },
  // --- Section: style (6 questions) ---
  {
    id: 'motivation_type',
    section: 'style',
    type: 'single_select',
    question: 'What motivates you the most?',
    options: [
      { value: 'progress', label: 'Seeing progress' },
      { value: 'rewards', label: 'Rewards / incentives' },
      { value: 'accountability', label: 'Accountability to others' },
      { value: 'avoiding_failure', label: 'Avoiding failure' },
      { value: 'curiosity', label: 'Curiosity / interest' },
    ],
  },
  {
    id: 'action_orientation',
    section: 'style',
    type: 'single_select',
    question: 'Which feels more like you?',
    options: [
      { value: 'act_quickly', label: 'I act quickly and adjust later' },
      { value: 'think_carefully', label: 'I think carefully before acting' },
    ],
  },
  {
    id: 'delay_discounting_choice',
    section: 'style',
    type: 'single_select',
    question: 'Which would you choose?',
    options: [
      { value: '100_today', label: '$100 today' },
      { value: '150_in_1_month', label: '$150 in 1 month' },
    ],
  },
  {
    id: 'self_efficacy',
    section: 'style',
    type: 'scale',
    question: "If you set a realistic goal today, how confident are you that you'll complete it?",
    scaleMin: 1,
    scaleMax: 10,
  },
  {
    id: 'planning_style',
    section: 'style',
    type: 'single_select',
    question: 'Do you prefer:',
    options: [
      { value: 'structure', label: 'Structure and clear plans' },
      { value: 'flexibility', label: 'Flexibility and freedom' },
    ],
  },
  {
    id: 'social_recharge_style',
    section: 'style',
    type: 'single_select',
    question: 'Do you recharge more by:',
    options: [
      { value: 'alone', label: 'Time alone' },
      { value: 'others', label: 'Time with others' },
    ],
  },
];

export function getQuestionsForSection(section: string): QuestionDefinition[] {
  return QUESTIONS.filter((q) => q.section === section);
}

export function getTotalQuestionCount(): number {
  return QUESTIONS.length;
}
