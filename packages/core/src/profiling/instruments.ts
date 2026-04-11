// packages/core/src/profiling/instruments.ts

import type { PsychometricItem } from './psychometric-types';

// ---------------------------------------------------------------------------
// PERMA Profiler (Butler & Kern, 2016) — 15 items, 0-10 scale
// ---------------------------------------------------------------------------

const PERMA_ITEMS: PsychometricItem[] = [
  // Positive Emotion
  {
    id: 'perma_1',
    instrument: 'perma',
    subscale: 'positiveEmotion',
    text: 'In general, how often do you feel joyful?',
    reversed: false,
    scaleMin: 0,
    scaleMax: 10,
  },
  {
    id: 'perma_2',
    instrument: 'perma',
    subscale: 'positiveEmotion',
    text: 'In general, how often do you feel positive?',
    reversed: false,
    scaleMin: 0,
    scaleMax: 10,
  },
  {
    id: 'perma_3',
    instrument: 'perma',
    subscale: 'positiveEmotion',
    text: 'In general, to what extent do you feel contented?',
    reversed: false,
    scaleMin: 0,
    scaleMax: 10,
  },
  // Engagement
  {
    id: 'perma_4',
    instrument: 'perma',
    subscale: 'engagement',
    text: 'How often do you become absorbed in what you are doing?',
    reversed: false,
    scaleMin: 0,
    scaleMax: 10,
  },
  {
    id: 'perma_5',
    instrument: 'perma',
    subscale: 'engagement',
    text: 'In general, to what extent do you feel excited and interested in things?',
    reversed: false,
    scaleMin: 0,
    scaleMax: 10,
  },
  {
    id: 'perma_6',
    instrument: 'perma',
    subscale: 'engagement',
    text: 'How often do you lose track of time while doing something you enjoy?',
    reversed: false,
    scaleMin: 0,
    scaleMax: 10,
  },
  // Relationships
  {
    id: 'perma_7',
    instrument: 'perma',
    subscale: 'relationships',
    text: 'To what extent do you receive help and support from others when you need it?',
    reversed: false,
    scaleMin: 0,
    scaleMax: 10,
  },
  {
    id: 'perma_8',
    instrument: 'perma',
    subscale: 'relationships',
    text: 'To what extent do you feel loved?',
    reversed: false,
    scaleMin: 0,
    scaleMax: 10,
  },
  {
    id: 'perma_9',
    instrument: 'perma',
    subscale: 'relationships',
    text: 'How satisfied are you with your personal relationships?',
    reversed: false,
    scaleMin: 0,
    scaleMax: 10,
  },
  // Meaning
  {
    id: 'perma_10',
    instrument: 'perma',
    subscale: 'meaning',
    text: 'In general, to what extent do you lead a purposeful and meaningful life?',
    reversed: false,
    scaleMin: 0,
    scaleMax: 10,
  },
  {
    id: 'perma_11',
    instrument: 'perma',
    subscale: 'meaning',
    text: 'In general, to what extent do you feel that what you do in your life is valuable and worthwhile?',
    reversed: false,
    scaleMin: 0,
    scaleMax: 10,
  },
  {
    id: 'perma_12',
    instrument: 'perma',
    subscale: 'meaning',
    text: 'To what extent do you generally feel you have a sense of direction in your life?',
    reversed: false,
    scaleMin: 0,
    scaleMax: 10,
  },
  // Accomplishment
  {
    id: 'perma_13',
    instrument: 'perma',
    subscale: 'accomplishment',
    text: 'How much of the time do you feel you are making progress towards accomplishing your goals?',
    reversed: false,
    scaleMin: 0,
    scaleMax: 10,
  },
  {
    id: 'perma_14',
    instrument: 'perma',
    subscale: 'accomplishment',
    text: 'How often do you achieve the important goals you have set for yourself?',
    reversed: false,
    scaleMin: 0,
    scaleMax: 10,
  },
  {
    id: 'perma_15',
    instrument: 'perma',
    subscale: 'accomplishment',
    text: 'How often are you able to handle your responsibilities?',
    reversed: false,
    scaleMin: 0,
    scaleMax: 10,
  },
];

// ---------------------------------------------------------------------------
// TIPI (Gosling et al., 2003) — 10 items, 1-7 scale
// Stem: "I see myself as..."
// ---------------------------------------------------------------------------

const TIPI_ITEMS: PsychometricItem[] = [
  {
    id: 'tipi_1',
    instrument: 'tipi',
    subscale: 'extraversion',
    text: 'I see myself as... Extraverted, enthusiastic',
    reversed: false,
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'tipi_2',
    instrument: 'tipi',
    subscale: 'agreeableness',
    text: 'I see myself as... Critical, quarrelsome',
    reversed: true,
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'tipi_3',
    instrument: 'tipi',
    subscale: 'conscientiousness',
    text: 'I see myself as... Dependable, self-disciplined',
    reversed: false,
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'tipi_4',
    instrument: 'tipi',
    subscale: 'emotionalStability',
    text: 'I see myself as... Anxious, easily upset',
    reversed: true,
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'tipi_5',
    instrument: 'tipi',
    subscale: 'openness',
    text: 'I see myself as... Open to new experiences, complex',
    reversed: false,
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'tipi_6',
    instrument: 'tipi',
    subscale: 'extraversion',
    text: 'I see myself as... Reserved, quiet',
    reversed: true,
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'tipi_7',
    instrument: 'tipi',
    subscale: 'agreeableness',
    text: 'I see myself as... Sympathetic, warm',
    reversed: false,
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'tipi_8',
    instrument: 'tipi',
    subscale: 'conscientiousness',
    text: 'I see myself as... Disorganized, careless',
    reversed: true,
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'tipi_9',
    instrument: 'tipi',
    subscale: 'emotionalStability',
    text: 'I see myself as... Calm, emotionally stable',
    reversed: false,
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'tipi_10',
    instrument: 'tipi',
    subscale: 'openness',
    text: 'I see myself as... Conventional, uncreative',
    reversed: true,
    scaleMin: 1,
    scaleMax: 7,
  },
];

// ---------------------------------------------------------------------------
// Short Grit Scale (Duckworth & Quinn, 2009) — 8 items, 1-5 scale
// Consistency subscale: items 1,3,5,7 (all reversed)
// Perseverance subscale: items 2,4,6,8
// ---------------------------------------------------------------------------

const GRIT_ITEMS: PsychometricItem[] = [
  {
    id: 'grit_1',
    instrument: 'grit',
    subscale: 'consistency',
    text: 'New ideas and projects sometimes distract me from previous ones',
    reversed: true,
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'grit_2',
    instrument: 'grit',
    subscale: 'perseverance',
    text: 'Setbacks don\'t discourage me. I don\'t give up easily',
    reversed: false,
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'grit_3',
    instrument: 'grit',
    subscale: 'consistency',
    text: 'I often set a goal but later choose to pursue a different one',
    reversed: true,
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'grit_4',
    instrument: 'grit',
    subscale: 'perseverance',
    text: 'I am a hard worker',
    reversed: false,
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'grit_5',
    instrument: 'grit',
    subscale: 'consistency',
    text: 'I have difficulty maintaining my focus on projects that take more than a few months to complete',
    reversed: true,
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'grit_6',
    instrument: 'grit',
    subscale: 'perseverance',
    text: 'I finish whatever I begin',
    reversed: false,
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'grit_7',
    instrument: 'grit',
    subscale: 'consistency',
    text: 'My interests change from year to year',
    reversed: true,
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'grit_8',
    instrument: 'grit',
    subscale: 'perseverance',
    text: 'I am diligent. I never give up',
    reversed: false,
    scaleMin: 1,
    scaleMax: 5,
  },
];

// ---------------------------------------------------------------------------
// SWLS — Satisfaction with Life Scale (Diener et al., 1985) — 5 items, 1-7 scale
// ---------------------------------------------------------------------------

const SWLS_ITEMS: PsychometricItem[] = [
  {
    id: 'swls_1',
    instrument: 'swls',
    subscale: 'satisfaction',
    text: 'In most ways my life is close to my ideal',
    reversed: false,
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'swls_2',
    instrument: 'swls',
    subscale: 'satisfaction',
    text: 'The conditions of my life are excellent',
    reversed: false,
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'swls_3',
    instrument: 'swls',
    subscale: 'satisfaction',
    text: 'I am satisfied with my life',
    reversed: false,
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'swls_4',
    instrument: 'swls',
    subscale: 'satisfaction',
    text: 'So far I have gotten the important things I want in life',
    reversed: false,
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'swls_5',
    instrument: 'swls',
    subscale: 'satisfaction',
    text: 'If I could live my life over, I would change almost nothing',
    reversed: false,
    scaleMin: 1,
    scaleMax: 7,
  },
];

// ---------------------------------------------------------------------------
// BPNS — Basic Psychological Needs Scale (Deci & Ryan) — 12 items, 1-7 scale
// ---------------------------------------------------------------------------

const BPNS_ITEMS: PsychometricItem[] = [
  // Autonomy
  {
    id: 'bpns_1',
    instrument: 'bpns',
    subscale: 'autonomy',
    text: 'I feel like I am free to decide for myself how to live my life',
    reversed: false,
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'bpns_2',
    instrument: 'bpns',
    subscale: 'autonomy',
    text: 'I generally feel free to express my ideas and opinions',
    reversed: false,
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'bpns_3',
    instrument: 'bpns',
    subscale: 'autonomy',
    text: 'I feel like I can pretty much be myself in my daily situations',
    reversed: false,
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'bpns_4',
    instrument: 'bpns',
    subscale: 'autonomy',
    text: 'I feel pressured in my life',
    reversed: true,
    scaleMin: 1,
    scaleMax: 7,
  },
  // Competence
  {
    id: 'bpns_5',
    instrument: 'bpns',
    subscale: 'competence',
    text: 'Most days I feel a sense of accomplishment from what I do',
    reversed: false,
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'bpns_6',
    instrument: 'bpns',
    subscale: 'competence',
    text: 'People I know tell me I am good at what I do',
    reversed: false,
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'bpns_7',
    instrument: 'bpns',
    subscale: 'competence',
    text: 'I have been able to learn interesting new skills recently',
    reversed: false,
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'bpns_8',
    instrument: 'bpns',
    subscale: 'competence',
    text: 'Most days I feel that I have met my responsibilities well',
    reversed: false,
    scaleMin: 1,
    scaleMax: 7,
  },
  // Relatedness
  {
    id: 'bpns_9',
    instrument: 'bpns',
    subscale: 'relatedness',
    text: 'I really like the people I interact with',
    reversed: false,
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'bpns_10',
    instrument: 'bpns',
    subscale: 'relatedness',
    text: 'I get along with people I come into contact with',
    reversed: false,
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'bpns_11',
    instrument: 'bpns',
    subscale: 'relatedness',
    text: 'People in my life care about me',
    reversed: false,
    scaleMin: 1,
    scaleMax: 7,
  },
  {
    id: 'bpns_12',
    instrument: 'bpns',
    subscale: 'relatedness',
    text: 'People I interact with on a daily basis tend to take my feelings into consideration',
    reversed: false,
    scaleMin: 1,
    scaleMax: 7,
  },
];

// ---------------------------------------------------------------------------
// MEQ-SA Chronotype (Horne & Ostberg) — 3 items, categorical
// ---------------------------------------------------------------------------

const CHRONOTYPE_ITEMS: PsychometricItem[] = [
  {
    id: 'chrono_1',
    instrument: 'chronotype',
    subscale: 'chronotype',
    text: 'If you were entirely free to plan your day, what time would you get up?',
    reversed: false,
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'chrono_2',
    instrument: 'chronotype',
    subscale: 'chronotype',
    text: 'During the first half hour after waking, how alert do you feel?',
    reversed: false,
    scaleMin: 1,
    scaleMax: 4,
  },
  {
    id: 'chrono_3',
    instrument: 'chronotype',
    subscale: 'chronotype',
    text: 'At what time of day do you feel your best?',
    reversed: false,
    scaleMin: 1,
    scaleMax: 5,
  },
];

// ---------------------------------------------------------------------------
// PSQI Short Form — Sleep Quality — 4 items, 0-3 scale
// ---------------------------------------------------------------------------

const SLEEP_QUALITY_ITEMS: PsychometricItem[] = [
  {
    id: 'sleep_1',
    instrument: 'sleep',
    subscale: 'sleepQuality',
    text: 'During the past month, how would you rate your overall sleep quality?',
    reversed: false,
    scaleMin: 0,
    scaleMax: 3,
  },
  {
    id: 'sleep_2',
    instrument: 'sleep',
    subscale: 'sleepQuality',
    text: 'How often have you had trouble sleeping because you could not get to sleep within 30 minutes?',
    reversed: false,
    scaleMin: 0,
    scaleMax: 3,
  },
  {
    id: 'sleep_3',
    instrument: 'sleep',
    subscale: 'sleepQuality',
    text: 'How often have you had trouble staying asleep during the night?',
    reversed: false,
    scaleMin: 0,
    scaleMax: 3,
  },
  {
    id: 'sleep_4',
    instrument: 'sleep',
    subscale: 'sleepQuality',
    text: 'How often have you felt tired or had low energy during the day?',
    reversed: false,
    scaleMin: 0,
    scaleMax: 3,
  },
];

// ---------------------------------------------------------------------------
// PSS-4 Perceived Stress (Cohen) — 4 items, 0-4 scale
// ---------------------------------------------------------------------------

const STRESS_ITEMS: PsychometricItem[] = [
  {
    id: 'stress_1',
    instrument: 'stress',
    subscale: 'stress',
    text: 'In the last month, how often have you felt that you were unable to control the important things in your life?',
    reversed: false,
    scaleMin: 0,
    scaleMax: 4,
  },
  {
    id: 'stress_2',
    instrument: 'stress',
    subscale: 'stress',
    text: 'In the last month, how often have you felt confident about your ability to handle your personal problems?',
    reversed: true,
    scaleMin: 0,
    scaleMax: 4,
  },
  {
    id: 'stress_3',
    instrument: 'stress',
    subscale: 'stress',
    text: 'In the last month, how often have you felt that things were going your way?',
    reversed: true,
    scaleMin: 0,
    scaleMax: 4,
  },
  {
    id: 'stress_4',
    instrument: 'stress',
    subscale: 'stress',
    text: 'In the last month, how often have you felt difficulties were piling up so high that you could not overcome them?',
    reversed: false,
    scaleMin: 0,
    scaleMax: 4,
  },
];

// ---------------------------------------------------------------------------
// SCS-SF Self-Compassion (Neff) — 6 items, 1-5 scale
// ---------------------------------------------------------------------------

const SELF_COMPASSION_ITEMS: PsychometricItem[] = [
  {
    id: 'sc_1',
    instrument: 'selfCompassion',
    subscale: 'selfKindness',
    text: 'When I fail at something important to me, I try to keep things in perspective.',
    reversed: false,
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'sc_2',
    instrument: 'selfCompassion',
    subscale: 'selfJudgment',
    text: "When I'm going through a hard time, I'm tough on myself.",
    reversed: true,
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'sc_3',
    instrument: 'selfCompassion',
    subscale: 'commonHumanity',
    text: "When something painful happens, I try to see it as part of everyone's experience.",
    reversed: false,
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'sc_4',
    instrument: 'selfCompassion',
    subscale: 'isolation',
    text: "When I fail, I feel like I'm the only one who struggles.",
    reversed: true,
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'sc_5',
    instrument: 'selfCompassion',
    subscale: 'mindfulness',
    text: 'When something upsets me, I try to observe my feelings without judging them.',
    reversed: false,
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'sc_6',
    instrument: 'selfCompassion',
    subscale: 'overIdentification',
    text: "When I'm feeling down, I get carried away by negative feelings.",
    reversed: true,
    scaleMin: 1,
    scaleMax: 5,
  },
];

// ---------------------------------------------------------------------------
// Brief IPC Locus of Control (Levenson) — 3 items, 1-6 scale
// ---------------------------------------------------------------------------

const LOCUS_OF_CONTROL_ITEMS: PsychometricItem[] = [
  {
    id: 'loc_1',
    instrument: 'locusOfControl',
    subscale: 'internal',
    text: 'My life is determined by my own actions.',
    reversed: false,
    scaleMin: 1,
    scaleMax: 6,
  },
  {
    id: 'loc_2',
    instrument: 'locusOfControl',
    subscale: 'powerfulOthers',
    text: 'Other people have a lot of influence over what happens in my life.',
    reversed: false,
    scaleMin: 1,
    scaleMax: 6,
  },
  {
    id: 'loc_3',
    instrument: 'locusOfControl',
    subscale: 'chance',
    text: 'To a great extent, my life is controlled by accidental happenings.',
    reversed: false,
    scaleMin: 1,
    scaleMax: 6,
  },
];

export const BASELINE_ITEMS: PsychometricItem[] = [
  ...CHRONOTYPE_ITEMS,
  ...SLEEP_QUALITY_ITEMS,
  ...STRESS_ITEMS,
  ...SELF_COMPASSION_ITEMS,
  ...LOCUS_OF_CONTROL_ITEMS,
];

// ---------------------------------------------------------------------------
// Combined export of all instrument items
// ---------------------------------------------------------------------------

export const PSYCHOMETRIC_ITEMS: PsychometricItem[] = [
  ...PERMA_ITEMS,
  ...TIPI_ITEMS,
  ...GRIT_ITEMS,
  ...SWLS_ITEMS,
  ...BPNS_ITEMS,
  ...BASELINE_ITEMS,
];

// ---------------------------------------------------------------------------
// Section metadata compatible with the onboarding wizard SectionMeta format
// ---------------------------------------------------------------------------

export const PSYCHOMETRIC_SECTIONS = [
  { id: 'wellbeing',    label: 'Your Wellbeing',    instrument: 'perma',          questionCount: 15 },
  { id: 'baseline',     label: 'Your Baseline',     instrument: 'chronotype',     questionCount: 20, instruments: ['chronotype', 'sleep', 'stress', 'selfCompassion', 'locusOfControl'] as const },
  { id: 'personality',  label: 'Your Personality',  instrument: 'tipi',           questionCount: 10 },
  { id: 'drive',        label: 'Your Drive',        instrument: 'grit',           questionCount: 8  },
  { id: 'satisfaction', label: 'Life Satisfaction',  instrument: 'swls',           questionCount: 5  },
  { id: 'needs',        label: 'Your Needs',        instrument: 'bpns',           questionCount: 12 },
] as const;
