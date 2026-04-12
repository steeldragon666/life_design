import {
  createDefaultSemanticMemory,
  mergeSemanticUpdate,
  formatSemanticForPrompt,
} from '../semantic';
import type { SemanticMemory } from '../../types';
import { TherapeuticModality } from '../../types';

describe('createDefaultSemanticMemory', () => {
  it('returns a valid SemanticMemory shape', () => {
    const memory = createDefaultSemanticMemory('user-42');
    expect(memory.userId).toBe('user-42');
    expect(memory.lifeContext).toBeDefined();
    expect(memory.psychologicalProfile).toBeDefined();
    expect(memory.therapeuticPreferences).toBeDefined();
    expect(memory.lastUpdated).toBeInstanceOf(Date);
  });

  it('includes all required lifeContext fields', () => {
    const { lifeContext } = createDefaultSemanticMemory('u1');
    expect(Array.isArray(lifeContext.relationships)).toBe(true);
    expect(Array.isArray(lifeContext.healthConditions)).toBe(true);
    expect(Array.isArray(lifeContext.medications)).toBe(true);
    expect(Array.isArray(lifeContext.goals)).toBe(true);
    expect(Array.isArray(lifeContext.values)).toBe(true);
    expect(Array.isArray(lifeContext.interests)).toBe(true);
    expect(lifeContext.work).toBeNull();
    expect(lifeContext.culturalBackground).toBeNull();
    expect(lifeContext.spiritualOrientation).toBeNull();
  });

  it('includes all required psychologicalProfile fields', () => {
    const { psychologicalProfile } = createDefaultSemanticMemory('u2');
    expect(psychologicalProfile.attachmentStyle).toBeNull();
    expect(Array.isArray(psychologicalProfile.commonDistortions)).toBe(true);
    expect(Array.isArray(psychologicalProfile.copingStrengths)).toBe(true);
    expect(Array.isArray(psychologicalProfile.copingGaps)).toBe(true);
    expect(typeof psychologicalProfile.personalityTraits).toBe('object');
    expect(psychologicalProfile.gritScore).toBeNull();
    expect(psychologicalProfile.selfCompassionLevel).toBeNull();
    expect(psychologicalProfile.locusOfControl).toBeNull();
  });

  it('includes all required therapeuticPreferences fields', () => {
    const { therapeuticPreferences } = createDefaultSemanticMemory('u3');
    expect(Array.isArray(therapeuticPreferences.preferredModalities)).toBe(true);
    expect(therapeuticPreferences.depthPreference).toBe('medium');
    expect(therapeuticPreferences.metaphorPreference).toBe('mixed');
    expect(therapeuticPreferences.pacingPreference).toBe('mixed');
    expect(therapeuticPreferences.communicationStyle).toBeNull();
    expect(therapeuticPreferences.culturalContext).toBeNull();
  });
});

describe('mergeSemanticUpdate', () => {
  function defaultMemory(): SemanticMemory {
    return createDefaultSemanticMemory('user-merge');
  }

  it('deep merges lifeContext fields (existing + patch)', () => {
    const current = defaultMemory();
    const patch: Partial<SemanticMemory> = {
      lifeContext: {
        ...current.lifeContext,
        work: 'Software engineer',
        goals: ['run a marathon'],
      },
    };

    const merged = mergeSemanticUpdate(current, patch);
    expect(merged.lifeContext.work).toBe('Software engineer');
    expect(merged.lifeContext.goals).toEqual(['run a marathon']);
    // Other fields preserved
    expect(Array.isArray(merged.lifeContext.relationships)).toBe(true);
  });

  it('does not overwrite existing data with undefined', () => {
    const current = {
      ...defaultMemory(),
      lifeContext: {
        ...defaultMemory().lifeContext,
        work: 'Existing job',
      },
    };

    // Patch has no lifeContext → should leave it unchanged
    const merged = mergeSemanticUpdate(current, {});
    expect(merged.lifeContext.work).toBe('Existing job');
  });

  it('merges personalityTraits (deep merge of nested object)', () => {
    const current = {
      ...defaultMemory(),
      psychologicalProfile: {
        ...defaultMemory().psychologicalProfile,
        personalityTraits: { openness: 0.7, conscientiousness: 0.6 },
      },
    };

    const patch: Partial<SemanticMemory> = {
      psychologicalProfile: {
        ...current.psychologicalProfile,
        personalityTraits: { neuroticism: 0.4 },
      },
    };

    const merged = mergeSemanticUpdate(current, patch);
    // Should retain existing traits and add the new one
    expect(merged.psychologicalProfile.personalityTraits['openness']).toBe(0.7);
    expect(merged.psychologicalProfile.personalityTraits['neuroticism']).toBe(0.4);
  });

  it('preserves userId across merge', () => {
    const current = defaultMemory();
    const merged = mergeSemanticUpdate(current, {});
    expect(merged.userId).toBe('user-merge');
  });

  it('updates lastUpdated to a recent timestamp', () => {
    const current = defaultMemory();
    const before = Date.now();
    const merged = mergeSemanticUpdate(current, {});
    const after = Date.now();
    expect(merged.lastUpdated.getTime()).toBeGreaterThanOrEqual(before);
    expect(merged.lastUpdated.getTime()).toBeLessThanOrEqual(after);
  });

  it('merges therapeuticPreferences shallowly', () => {
    const current = defaultMemory();
    const patch: Partial<SemanticMemory> = {
      therapeuticPreferences: {
        ...current.therapeuticPreferences,
        preferredModalities: [TherapeuticModality.CBT, TherapeuticModality.ACT],
        depthPreference: 'deep',
      },
    };
    const merged = mergeSemanticUpdate(current, patch);
    expect(merged.therapeuticPreferences.preferredModalities).toContain(TherapeuticModality.CBT);
    expect(merged.therapeuticPreferences.depthPreference).toBe('deep');
  });
});

describe('formatSemanticForPrompt', () => {
  it('produces readable text containing section headers', () => {
    const memory = {
      ...createDefaultSemanticMemory('user-fmt'),
      lifeContext: {
        ...createDefaultSemanticMemory('u').lifeContext,
        work: 'Graphic designer',
        goals: ['improve mental health'],
      },
    };

    const output = formatSemanticForPrompt(memory);
    expect(typeof output).toBe('string');
    expect(output.length).toBeGreaterThan(0);
    expect(output).toContain('## Life Context');
    expect(output).toContain('## Psychological Profile');
    expect(output).toContain('## Therapeutic Preferences');
  });

  it('includes work when set', () => {
    const memory = {
      ...createDefaultSemanticMemory('u'),
      lifeContext: {
        ...createDefaultSemanticMemory('u').lifeContext,
        work: 'Teacher',
      },
    };

    const output = formatSemanticForPrompt(memory);
    expect(output).toContain('Teacher');
  });

  it('includes attachment style when set', () => {
    const base = createDefaultSemanticMemory('u');
    const memory: SemanticMemory = {
      ...base,
      psychologicalProfile: {
        ...base.psychologicalProfile,
        attachmentStyle: 'anxious-preoccupied',
      },
    };
    const output = formatSemanticForPrompt(memory);
    expect(output).toContain('anxious-preoccupied');
  });
});
