import { MentorType } from '@life-design/core';

export type MentorArchetype = 'therapist' | 'coach' | 'sage';

export interface ArchetypeConfig {
  id: MentorArchetype;
  label: string;
  summary: string;
  characterName: string;
  preferredVoices: string[];
  openingStyle: string;
  affirmationStyle: string;
  promptStyle: string;
  meditationStyle: string;

  // Visual identity
  portraitBasePath: string;
  accentColor: string;
  accentColorMuted: string;

  // ElevenLabs voice
  elevenLabsVoiceId: string;
  elevenLabsModelId: string;
  voiceSettings: {
    stability: number;
    similarityBoost: number;
    style: number;
    useSpeakerBoost: boolean;
  };

  // Greeting for voice preview
  greetingText: string;
}

export const ARCHETYPE_CONFIGS: ArchetypeConfig[] = [
  {
    id: 'therapist',
    label: 'Compassionate Therapist',
    summary: 'Gentle, emotionally validating guidance with reflective questions.',
    characterName: 'Eleanor',
    preferredVoices: ['calm-british-female', 'soft-australian-female'],
    openingStyle: 'Slow, grounding, and reassuring.',
    affirmationStyle: 'Normalize feelings and create emotional safety.',
    promptStyle: 'Open-ended questions, reflective listening, short pauses.',
    meditationStyle: 'Body scan, breath awareness, and calming nervous-system reset.',
    portraitBasePath: '/images/mentors/therapist',
    accentColor: '#8b5cf6',
    accentColorMuted: 'rgba(139,92,246,0.2)',
    elevenLabsVoiceId: 'PLACEHOLDER',
    elevenLabsModelId: 'eleven_turbo_v2_5',
    voiceSettings: { stability: 0.75, similarityBoost: 0.8, style: 0.4, useSpeakerBoost: true },
    greetingText: "Hello, I'm Eleanor. Take a breath — there's no rush. I'm here whenever you're ready to talk.",
  },
  {
    id: 'coach',
    label: 'Focused Coach',
    summary: 'Warm accountability, practical clarity, and momentum-building prompts.',
    characterName: 'Theo',
    preferredVoices: ['warm-american-male', 'calm-british-female'],
    openingStyle: 'Grounded and energizing without pressure.',
    affirmationStyle: 'Reinforce agency, effort, and consistent action.',
    promptStyle: 'Goal-framing, concise reframing, specific next steps.',
    meditationStyle: 'Visualization, confidence priming, intention setting.',
    portraitBasePath: '/images/mentors/coach',
    accentColor: '#f59e0b',
    accentColorMuted: 'rgba(245,158,11,0.2)',
    elevenLabsVoiceId: 'PLACEHOLDER',
    elevenLabsModelId: 'eleven_turbo_v2_5',
    voiceSettings: { stability: 0.55, similarityBoost: 0.75, style: 0.65, useSpeakerBoost: true },
    greetingText: "Hey! I'm Theo. Let's figure out what matters most to you today and make it happen.",
  },
  {
    id: 'sage',
    label: 'Reflective Sage',
    summary: 'Contemplative, wise perspective to align identity, meaning, and direction.',
    characterName: 'Maya',
    preferredVoices: ['soft-australian-female', 'calm-british-female'],
    openingStyle: 'Spacious and poetic, inviting stillness.',
    affirmationStyle: 'Meaning-centered encouragement and self-trust.',
    promptStyle: 'Big-picture prompts, values alignment, future-self reflection.',
    meditationStyle: 'Open awareness, gratitude, and horizon reflection.',
    portraitBasePath: '/images/mentors/sage',
    accentColor: '#10b981',
    accentColorMuted: 'rgba(16,185,129,0.2)',
    elevenLabsVoiceId: 'PLACEHOLDER',
    elevenLabsModelId: 'eleven_turbo_v2_5',
    voiceSettings: { stability: 0.7, similarityBoost: 0.8, style: 0.5, useSpeakerBoost: true },
    greetingText: "Welcome. I'm Maya. Let's take a wider view of where you are and where you'd like to go.",
  },
];

export function getArchetypeConfig(archetype: MentorArchetype): ArchetypeConfig {
  return ARCHETYPE_CONFIGS.find((cfg) => cfg.id === archetype) ?? ARCHETYPE_CONFIGS[0];
}

export function getRecommendedVoiceForArchetype(archetype: MentorArchetype): string {
  return getArchetypeConfig(archetype).preferredVoices[0];
}

const MENTOR_TYPE_TO_ARCHETYPE: Record<MentorType, MentorArchetype> = {
  [MentorType.Stoic]: 'therapist',
  [MentorType.Coach]: 'coach',
  [MentorType.Scientist]: 'sage',
};

const ARCHETYPE_TO_MENTOR_TYPE: Record<MentorArchetype, MentorType> = {
  therapist: MentorType.Stoic,
  coach: MentorType.Coach,
  sage: MentorType.Scientist,
};

export function mentorTypeToArchetype(type: MentorType): MentorArchetype {
  return MENTOR_TYPE_TO_ARCHETYPE[type];
}

export function archetypeToMentorType(archetype: MentorArchetype): MentorType {
  return ARCHETYPE_TO_MENTOR_TYPE[archetype];
}
