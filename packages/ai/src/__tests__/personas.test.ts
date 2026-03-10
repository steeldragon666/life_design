import { describe, it, expect } from 'vitest';
import { MentorType } from '@life-design/core';
import { buildSystemPrompt, PERSONA_CONFIGS } from '../personas';

describe('PERSONA_CONFIGS', () => {
  it('has a config for every MentorType', () => {
    for (const type of Object.values(MentorType)) {
      expect(PERSONA_CONFIGS[type]).toBeDefined();
      expect(PERSONA_CONFIGS[type].name).toBeTruthy();
      expect(PERSONA_CONFIGS[type].basePrompt).toBeTruthy();
    }
  });

  it('Stoic persona has philosophy-themed prompt', () => {
    expect(PERSONA_CONFIGS[MentorType.Stoic].basePrompt).toMatch(/stoic|philosophy|wisdom/i);
  });

  it('Coach persona has motivation-themed prompt', () => {
    expect(PERSONA_CONFIGS[MentorType.Coach].basePrompt).toMatch(/coach|goal|action/i);
  });

  it('Scientist persona has data-themed prompt', () => {
    expect(PERSONA_CONFIGS[MentorType.Scientist].basePrompt).toMatch(/data|evidence|pattern/i);
  });
});

describe('buildSystemPrompt', () => {
  it('returns the base prompt when no context is provided', () => {
    const prompt = buildSystemPrompt(MentorType.Stoic);
    expect(prompt).toContain(PERSONA_CONFIGS[MentorType.Stoic].basePrompt);
  });

  it('includes user context when provided', () => {
    const prompt = buildSystemPrompt(MentorType.Coach, {
      recentMood: 7,
      topDimension: 'career',
      lowDimension: 'fitness',
      streak: 5,
    });
    expect(prompt).toContain('career');
    expect(prompt).toContain('fitness');
    expect(prompt).toContain('7');
    expect(prompt).toContain('5');
  });

  it('works without optional context', () => {
    const prompt = buildSystemPrompt(MentorType.Scientist);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(50);
  });
});
