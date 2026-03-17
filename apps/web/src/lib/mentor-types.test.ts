import { describe, it, expect } from 'vitest';
import { getDominantArchetype } from './mentor-types';
import type { PersonaBlend } from './mentor-types';
import { mentorTypeToArchetype, archetypeToMentorType } from './mentor-archetypes';
import { MentorType } from '@life-design/core';

describe('getDominantArchetype', () => {
  it('returns therapist when therapist is dominant', () => {
    const blend: PersonaBlend = { therapist: 0.6, coach: 0.2, sage: 0.2 };
    expect(getDominantArchetype(blend)).toBe('therapist');
  });

  it('returns coach when coach is dominant', () => {
    const blend: PersonaBlend = { therapist: 0.2, coach: 0.5, sage: 0.3 };
    expect(getDominantArchetype(blend)).toBe('coach');
  });

  it('returns sage when sage is dominant', () => {
    const blend: PersonaBlend = { therapist: 0.1, coach: 0.2, sage: 0.7 };
    expect(getDominantArchetype(blend)).toBe('sage');
  });

  it('handles equal blend by returning first alphabetically', () => {
    const blend: PersonaBlend = { therapist: 0.34, coach: 0.33, sage: 0.33 };
    expect(getDominantArchetype(blend)).toBe('therapist');
  });
});

describe('mentorTypeToArchetype', () => {
  it('maps Stoic to therapist', () => {
    expect(mentorTypeToArchetype(MentorType.Stoic)).toBe('therapist');
  });

  it('maps Coach to coach', () => {
    expect(mentorTypeToArchetype(MentorType.Coach)).toBe('coach');
  });

  it('maps Scientist to sage', () => {
    expect(mentorTypeToArchetype(MentorType.Scientist)).toBe('sage');
  });
});

describe('archetypeToMentorType', () => {
  it('maps therapist to Stoic', () => {
    expect(archetypeToMentorType('therapist')).toBe(MentorType.Stoic);
  });

  it('maps coach to Coach', () => {
    expect(archetypeToMentorType('coach')).toBe(MentorType.Coach);
  });

  it('maps sage to Scientist', () => {
    expect(archetypeToMentorType('sage')).toBe(MentorType.Scientist);
  });
});
