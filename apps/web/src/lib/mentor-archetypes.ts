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
