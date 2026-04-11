import type { QuestionDefinition } from '@life-design/core';
import type { SectionMeta } from './types';

export const SECTIONS: SectionMeta[] = [
  { id: 'goal', label: 'Your Goal', questionCount: 3 },
  { id: 'wellbeing', label: 'Your Wellbeing', questionCount: 15 },
  { id: 'baseline', label: 'Your Baseline', questionCount: 20 },
  { id: 'personality', label: 'Your Personality', questionCount: 10 },
  { id: 'drive', label: 'Your Drive', questionCount: 8 },
  { id: 'satisfaction', label: 'Life Satisfaction', questionCount: 5 },
  { id: 'needs', label: 'Your Needs', questionCount: 12 },
  { id: 'style', label: 'Your Style', questionCount: 6 },
];

export const QUESTIONS: QuestionDefinition[] = [
  // =========================================================================
  // Section: goal (3 questions) — context for personalisation
  // =========================================================================
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

  // =========================================================================
  // Section: wellbeing — PERMA Profiler (Butler & Kern, 2016)
  // 15 items, 0–10 scale, 3 items per subscale
  // =========================================================================

  // Positive Emotion
  {
    id: 'perma_1',
    section: 'wellbeing',
    type: 'scale',
    question: 'In general, how often do you feel joyful?',
    scaleMin: 0,
    scaleMax: 10,
  },
  {
    id: 'perma_2',
    section: 'wellbeing',
    type: 'scale',
    question: 'In general, how often do you feel positive?',
    scaleMin: 0,
    scaleMax: 10,
  },
  {
    id: 'perma_3',
    section: 'wellbeing',
    type: 'scale',
    question: 'In general, to what extent do you feel contented?',
    scaleMin: 0,
    scaleMax: 10,
  },

  // Engagement
  {
    id: 'perma_4',
    section: 'wellbeing',
    type: 'scale',
    question: 'How often do you become absorbed in what you are doing?',
    scaleMin: 0,
    scaleMax: 10,
  },
  {
    id: 'perma_5',
    section: 'wellbeing',
    type: 'scale',
    question: 'In general, to what extent do you feel excited and interested in things?',
    scaleMin: 0,
    scaleMax: 10,
  },
  {
    id: 'perma_6',
    section: 'wellbeing',
    type: 'scale',
    question: 'How often do you lose track of time while doing something you enjoy?',
    scaleMin: 0,
    scaleMax: 10,
  },

  // Relationships
  {
    id: 'perma_7',
    section: 'wellbeing',
    type: 'scale',
    question: 'To what extent do you receive help and support from others when you need it?',
    scaleMin: 0,
    scaleMax: 10,
  },
  {
    id: 'perma_8',
    section: 'wellbeing',
    type: 'scale',
    question: 'To what extent do you feel loved?',
    scaleMin: 0,
    scaleMax: 10,
  },
  {
    id: 'perma_9',
    section: 'wellbeing',
    type: 'scale',
    question: 'How satisfied are you with your personal relationships?',
    scaleMin: 0,
    scaleMax: 10,
  },

  // Meaning
  {
    id: 'perma_10',
    section: 'wellbeing',
    type: 'scale',
    question: 'In general, to what extent do you lead a purposeful and meaningful life?',
    scaleMin: 0,
    scaleMax: 10,
  },
  {
    id: 'perma_11',
    section: 'wellbeing',
    type: 'scale',
    question: 'In general, to what extent do you feel that what you do in your life is valuable and worthwhile?',
    scaleMin: 0,
    scaleMax: 10,
  },
  {
    id: 'perma_12',
    section: 'wellbeing',
    type: 'scale',
    question: 'To what extent do you generally feel you have a sense of direction in your life?',
    scaleMin: 0,
    scaleMax: 10,
  },

  // Accomplishment
  {
    id: 'perma_13',
    section: 'wellbeing',
    type: 'scale',
    question: 'How much of the time do you feel you are making progress towards accomplishing your goals?',
    scaleMin: 0,
    scaleMax: 10,
  },
  {
    id: 'perma_14',
    section: 'wellbeing',
    type: 'scale',
    question: 'How often do you achieve the important goals you have set for yourself?',
    scaleMin: 0,
    scaleMax: 10,
  },
  {
    id: 'perma_15',
    section: 'wellbeing',
    type: 'scale',
    question: 'How often are you able to handle your responsibilities?',
    scaleMin: 0,
    scaleMax: 10,
  },

  // =========================================================================
  // Section: baseline — Chronotype, Sleep, Stress, Self-Compassion, Locus of Control
  // 17 items across 5 validated instruments
  // NOTE: Question text mirrors packages/core/src/profiling/instruments.ts
  // (BASELINE_ITEMS). The core package owns scoring metadata (scales, reverse
  // flags, subscales); this file owns UI presentation (option labels, types).
  // If you update question wording, update both locations.
  // =========================================================================

  // Chronotype (MEQ-SA short form)
  {
    id: 'chrono_1',
    section: 'baseline',
    type: 'single_select',
    question: 'If you were entirely free to plan your day, what time would you get up?',
    options: [
      { value: '5', label: 'Before 6:30am' },
      { value: '4', label: '6:30–7:30am' },
      { value: '3', label: '7:30–9:00am' },
      { value: '2', label: '9:00–11:00am' },
      { value: '1', label: 'After 11:00am' },
    ],
  },
  {
    id: 'chrono_2',
    section: 'baseline',
    type: 'single_select',
    question: 'During the first half hour after waking, how alert do you feel?',
    options: [
      { value: '4', label: 'Very alert' },
      { value: '3', label: 'Fairly alert' },
      { value: '2', label: 'Fairly groggy' },
      { value: '1', label: 'Very groggy' },
    ],
  },
  {
    id: 'chrono_3',
    section: 'baseline',
    type: 'single_select',
    question: 'At what time of day do you feel your best?',
    options: [
      { value: '5', label: 'Early morning' },
      { value: '4', label: 'Late morning' },
      { value: '3', label: 'Afternoon' },
      { value: '2', label: 'Early evening' },
      { value: '1', label: 'Late evening / night' },
    ],
  },

  // Sleep Quality (PSQI short form) — 0-3 scale
  {
    id: 'sleep_1',
    section: 'baseline',
    type: 'single_select',
    question: 'During the past month, how would you rate your overall sleep quality?',
    options: [
      { value: '0', label: 'Very good' },
      { value: '1', label: 'Fairly good' },
      { value: '2', label: 'Fairly bad' },
      { value: '3', label: 'Very bad' },
    ],
  },
  {
    id: 'sleep_2',
    section: 'baseline',
    type: 'single_select',
    question: 'How often have you had trouble falling asleep within 30 minutes?',
    options: [
      { value: '0', label: 'Not at all' },
      { value: '1', label: 'Less than once a week' },
      { value: '2', label: 'Once or twice a week' },
      { value: '3', label: 'Three or more times a week' },
    ],
  },
  {
    id: 'sleep_3',
    section: 'baseline',
    type: 'single_select',
    question: 'How often have you had trouble staying asleep during the night?',
    options: [
      { value: '0', label: 'Not at all' },
      { value: '1', label: 'Less than once a week' },
      { value: '2', label: 'Once or twice a week' },
      { value: '3', label: 'Three or more times a week' },
    ],
  },
  {
    id: 'sleep_4',
    section: 'baseline',
    type: 'single_select',
    question: 'How often have you felt tired or had low energy during the day?',
    options: [
      { value: '0', label: 'Not at all' },
      { value: '1', label: 'Less than once a week' },
      { value: '2', label: 'Once or twice a week' },
      { value: '3', label: 'Three or more times a week' },
    ],
  },

  // Perceived Stress (PSS-4) — 0-4 scale
  {
    id: 'stress_1',
    section: 'baseline',
    type: 'scale',
    question: 'In the last month, how often have you felt unable to control the important things in your life?',
    scaleMin: 0,
    scaleMax: 4,
  },
  {
    id: 'stress_2',
    section: 'baseline',
    type: 'scale',
    question: 'In the last month, how often have you felt confident about handling your personal problems?',
    scaleMin: 0,
    scaleMax: 4,
  },
  {
    id: 'stress_3',
    section: 'baseline',
    type: 'scale',
    question: 'In the last month, how often have you felt things were going your way?',
    scaleMin: 0,
    scaleMax: 4,
  },
  {
    id: 'stress_4',
    section: 'baseline',
    type: 'scale',
    question: 'In the last month, how often have you felt difficulties piling up so high you could not overcome them?',
    scaleMin: 0,
    scaleMax: 4,
  },

  // Self-Compassion (SCS-SF) — 1-5 scale
  {
    id: 'sc_1',
    section: 'baseline',
    type: 'scale',
    question: 'When I fail at something important, I try to keep things in perspective.',
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'sc_2',
    section: 'baseline',
    type: 'scale',
    question: "When I'm going through a hard time, I'm tough on myself.",
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'sc_3',
    section: 'baseline',
    type: 'scale',
    question: "When something painful happens, I try to see it as part of everyone's experience.",
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'sc_4',
    section: 'baseline',
    type: 'scale',
    question: "When I fail, I feel like I'm the only one who struggles.",
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'sc_5',
    section: 'baseline',
    type: 'scale',
    question: 'When something upsets me, I try to observe my feelings without judging them.',
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'sc_6',
    section: 'baseline',
    type: 'scale',
    question: "When I'm feeling down, I get carried away by negative feelings.",
    scaleMin: 1,
    scaleMax: 5,
  },

  // Locus of Control (Brief IPC) — 1-6 scale
  {
    id: 'loc_1',
    section: 'baseline',
    type: 'scale',
    question: 'My life is determined by my own actions.',
    scaleMin: 1,
    scaleMax: 6,
  },
  {
    id: 'loc_2',
    section: 'baseline',
    type: 'scale',
    question: 'Other people have a lot of influence over what happens in my life.',
    scaleMin: 1,
    scaleMax: 6,
  },
  {
    id: 'loc_3',
    section: 'baseline',
    type: 'scale',
    question: 'To a great extent, my life is controlled by accidental happenings.',
    scaleMin: 1,
    scaleMax: 6,
  },

  // =========================================================================
  // Section: personality — TIPI (Gosling et al., 2003)
  // 10 items, 1–7 scale. Prefix: "I see myself as..."
  // =========================================================================
  {
    id: 'tipi_1',
    section: 'personality',
    type: 'scale',
    question: 'I see myself as extraverted and enthusiastic.',
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'tipi_2',
    section: 'personality',
    type: 'scale',
    question: 'I see myself as critical and quarrelsome.',
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'tipi_3',
    section: 'personality',
    type: 'scale',
    question: 'I see myself as dependable and self-disciplined.',
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'tipi_4',
    section: 'personality',
    type: 'scale',
    question: 'I see myself as anxious and easily upset.',
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'tipi_5',
    section: 'personality',
    type: 'scale',
    question: 'I see myself as open to new experiences and complex.',
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'tipi_6',
    section: 'personality',
    type: 'scale',
    question: 'I see myself as reserved and quiet.',
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'tipi_7',
    section: 'personality',
    type: 'scale',
    question: 'I see myself as sympathetic and warm.',
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'tipi_8',
    section: 'personality',
    type: 'scale',
    question: 'I see myself as disorganized and careless.',
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'tipi_9',
    section: 'personality',
    type: 'scale',
    question: 'I see myself as calm and emotionally stable.',
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'tipi_10',
    section: 'personality',
    type: 'scale',
    question: 'I see myself as conventional and uncreative.',
    scaleMin: 1,
    scaleMax: 7,
  },

  // =========================================================================
  // Section: drive — Short Grit Scale (Duckworth & Quinn, 2009)
  // 8 items, 1–5 scale
  // =========================================================================
  {
    id: 'grit_1',
    section: 'drive',
    type: 'scale',
    question: 'New ideas and projects sometimes distract me from previous ones.',
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'grit_2',
    section: 'drive',
    type: 'scale',
    question: "Setbacks don't discourage me. I don't give up easily.",
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'grit_3',
    section: 'drive',
    type: 'scale',
    question: 'I often set a goal but later choose to pursue a different one.',
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'grit_4',
    section: 'drive',
    type: 'scale',
    question: 'I am a hard worker.',
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'grit_5',
    section: 'drive',
    type: 'scale',
    question: 'I have difficulty maintaining my focus on projects that take more than a few months to complete.',
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'grit_6',
    section: 'drive',
    type: 'scale',
    question: 'I finish whatever I begin.',
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'grit_7',
    section: 'drive',
    type: 'scale',
    question: 'My interests change from year to year.',
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'grit_8',
    section: 'drive',
    type: 'scale',
    question: 'I am diligent. I never give up.',
    scaleMin: 1,
    scaleMax: 5,
  },

  // =========================================================================
  // Section: satisfaction — SWLS (Diener et al., 1985)
  // 5 items, 1–7 scale
  // =========================================================================
  {
    id: 'swls_1',
    section: 'satisfaction',
    type: 'scale',
    question: 'In most ways my life is close to my ideal.',
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'swls_2',
    section: 'satisfaction',
    type: 'scale',
    question: 'The conditions of my life are excellent.',
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'swls_3',
    section: 'satisfaction',
    type: 'scale',
    question: 'I am satisfied with my life.',
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'swls_4',
    section: 'satisfaction',
    type: 'scale',
    question: 'So far I have gotten the important things I want in life.',
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'swls_5',
    section: 'satisfaction',
    type: 'scale',
    question: 'If I could live my life over, I would change almost nothing.',
    scaleMin: 1,
    scaleMax: 7,
  },

  // =========================================================================
  // Section: needs — Basic Psychological Needs Scale (Deci & Ryan)
  // 12 items, 1–7 scale
  // =========================================================================

  // Autonomy
  {
    id: 'bpns_1',
    section: 'needs',
    type: 'scale',
    question: 'I feel like I am free to decide for myself how to live my life.',
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'bpns_2',
    section: 'needs',
    type: 'scale',
    question: 'I generally feel free to express my ideas and opinions.',
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'bpns_3',
    section: 'needs',
    type: 'scale',
    question: 'I feel like I can pretty much be myself in my daily situations.',
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'bpns_4',
    section: 'needs',
    type: 'scale',
    question: 'I feel pressured in my life.',
    scaleMin: 1,
    scaleMax: 7,
  },

  // Competence
  {
    id: 'bpns_5',
    section: 'needs',
    type: 'scale',
    question: 'Most days I feel a sense of accomplishment from what I do.',
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'bpns_6',
    section: 'needs',
    type: 'scale',
    question: 'People I know tell me I am good at what I do.',
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'bpns_7',
    section: 'needs',
    type: 'scale',
    question: 'I have been able to learn interesting new skills recently.',
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'bpns_8',
    section: 'needs',
    type: 'scale',
    question: 'Most days I feel that I have met my responsibilities well.',
    scaleMin: 1,
    scaleMax: 7,
  },

  // Relatedness
  {
    id: 'bpns_9',
    section: 'needs',
    type: 'scale',
    question: 'I really like the people I interact with.',
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'bpns_10',
    section: 'needs',
    type: 'scale',
    question: 'I get along with people I come into contact with.',
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'bpns_11',
    section: 'needs',
    type: 'scale',
    question: 'People in my life care about me.',
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'bpns_12',
    section: 'needs',
    type: 'scale',
    question: 'People I interact with on a daily basis tend to take my feelings into consideration.',
    scaleMin: 1,
    scaleMax: 7,
  },

  // =========================================================================
  // Section: style (6 questions) — existing behavioural profiling
  // =========================================================================
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
