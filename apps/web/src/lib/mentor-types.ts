import type { MentorArchetype } from './mentor-archetypes';

export interface PersonaBlend {
  therapist: number;
  coach: number;
  sage: number;
}

export type MentorAvatarState = 'idle' | 'thinking' | 'speaking';

export function getDominantArchetype(blend: PersonaBlend): MentorArchetype {
  const entries = Object.entries(blend) as [MentorArchetype, number][];
  return entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}
