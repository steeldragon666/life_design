import type { MentorProfile } from '@/lib/guest-context';
import { ARCHETYPE_CONFIGS, type MentorArchetype } from '@/lib/mentor-archetypes';

export const KEY_PROMPT_HEADERS = ['Archetype:', 'Style:', 'Session intent:', 'Behavior rules:'] as const;

export const SAFETY_RAIL_LINES = [
  '- Never diagnose, prescribe, or claim medical treatment.',
  '- If distress is mentioned, respond supportively and encourage professional support where appropriate.',
] as const;

export const MOOD_ADAPTATION_EXPECTATIONS = {
  default:
    'Use a calm, grounded, supportive tone. Keep pacing steady and gently invitational.',
  low: 'Use extra warmth and emotional safety. Slow pacing, validate feelings, reduce pressure, and suggest one small next step.',
  high:
    'Reflect positive momentum while staying grounded. Keep guidance focused, clear, and channel energy into concrete actions.',
} as const;

export const MEMORY_SNAPSHOT_HEADER = 'Memory snapshot:';
export const NO_MEMORY_FALLBACK = 'No conversation memory captured yet.';

export function buildMentorProfile(archetype: MentorArchetype): MentorProfile {
  const config = ARCHETYPE_CONFIGS.find((item) => item.id === archetype);
  if (!config) {
    throw new Error(`Missing archetype config for "${archetype}"`);
  }

  return {
    archetype,
    characterName: config.characterName,
    voiceId: config.preferredVoices[0],
    style: {
      opening: config.openingStyle,
      affirmation: config.affirmationStyle,
      promptStyle: config.promptStyle,
    },
  };
}
