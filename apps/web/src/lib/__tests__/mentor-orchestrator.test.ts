import { describe, expect, it } from 'vitest';
import { ARCHETYPE_CONFIGS } from '@/lib/mentor-archetypes';
import {
  buildMentorSystemPrompt,
  type MentorSessionIntent,
} from '@/lib/mentor-orchestrator';
import {
  buildMentorProfile,
  KEY_PROMPT_HEADERS,
  MEMORY_SNAPSHOT_HEADER,
  MOOD_ADAPTATION_EXPECTATIONS,
  NO_MEMORY_FALLBACK,
  SAFETY_RAIL_LINES,
} from './fixtures/mentor-prompt-fixtures';
import type { ConversationMemoryEntry } from '@/lib/conversation-memory';
import type { MoodAdaptationResult } from '@/lib/mood-adapter';

const SESSION_INTENTS: MentorSessionIntent[] = [
  'onboarding',
  'goals',
  'checkin',
  'mentors',
  'meditation',
];

const ARCHETYPE_INTENT_CASES = ARCHETYPE_CONFIGS.flatMap((archetype) =>
  SESSION_INTENTS.map((intent) => ({ archetype: archetype.id, intent }))
);

describe('buildMentorSystemPrompt regression coverage', () => {
  it.each(ARCHETYPE_INTENT_CASES)(
    'builds stable key prompt sections for $archetype x $intent',
    ({ archetype, intent }) => {
      const prompt = buildMentorSystemPrompt(buildMentorProfile(archetype), intent);

      for (const sectionHeader of KEY_PROMPT_HEADERS) {
        expect(prompt).toContain(sectionHeader);
      }

      for (const rail of SAFETY_RAIL_LINES) {
        expect(prompt).toContain(rail);
      }

      expect(prompt).toContain(`Session intent: ${intent}`);
      expect(prompt).toContain('Mood adaptation:');
      expect(prompt).toContain('Mood level: neutral');
      expect(prompt).toContain(`Tone modifier: ${MOOD_ADAPTATION_EXPECTATIONS.default}`);
      expect(prompt).toContain(MEMORY_SNAPSHOT_HEADER);
      expect(prompt).toContain(NO_MEMORY_FALLBACK);
      expect(prompt).toMatchSnapshot();
    }
  );

  it('always includes core safety rails across all archetype-intent combinations', () => {
    for (const { archetype, intent } of ARCHETYPE_INTENT_CASES) {
      const prompt = buildMentorSystemPrompt(buildMentorProfile(archetype), intent);

      for (const rail of SAFETY_RAIL_LINES) {
        expect(prompt).toContain(rail);
      }
    }
  });

  it('inserts low mood adaptation text when low mood context is provided', () => {
    const lowMood: MoodAdaptationResult = {
      level: 'low',
      latestMood: 2,
      rollingMood: 3,
      modifier: MOOD_ADAPTATION_EXPECTATIONS.low,
    };
    const prompt = buildMentorSystemPrompt(buildMentorProfile('therapist'), 'checkin', {
      mood: lowMood,
    });

    expect(prompt).toContain('Mood adaptation:');
    expect(prompt).toContain('Mood level: low');
    expect(prompt).toContain('Latest mood: 2.0');
    expect(prompt).toContain('Rolling mood: 3.0');
    expect(prompt).toContain(MOOD_ADAPTATION_EXPECTATIONS.low);
  });

  it('uses default mood adaptation summary when mood context is absent', () => {
    const prompt = buildMentorSystemPrompt(buildMentorProfile('coach'), 'goals', {
      mood: undefined,
    });

    expect(prompt).toContain('Mood adaptation:');
    expect(prompt).toContain('Mood level: neutral');
    expect(prompt).toContain(`Tone modifier: ${MOOD_ADAPTATION_EXPECTATIONS.default}`);
  });

  it('inserts high mood adaptation text when high mood context is provided', () => {
    const highMood: MoodAdaptationResult = {
      level: 'high',
      latestMood: 9,
      rollingMood: 8.25,
      modifier: MOOD_ADAPTATION_EXPECTATIONS.high,
    };
    const prompt = buildMentorSystemPrompt(buildMentorProfile('sage'), 'mentors', {
      mood: highMood,
    });

    expect(prompt).toContain('Mood adaptation:');
    expect(prompt).toContain('Mood level: high');
    expect(prompt).toContain('Latest mood: 9.0');
    expect(prompt).toContain('Rolling mood: 8.3');
    expect(prompt).toContain(MOOD_ADAPTATION_EXPECTATIONS.high);
  });

  it('includes memory snapshot block when non-empty snapshot is provided', () => {
    const memorySnapshot: ConversationMemoryEntry[] = [
      {
        id: 'memory-1',
        kind: 'key-fact',
        content: 'Completed a major milestone last week.',
        source: 'checkin',
        createdAt: '2026-03-10T08:00:00.000Z',
      },
      {
        id: 'memory-2',
        kind: 'exchange-summary',
        content: 'Wants to preserve momentum with one clear next step.',
        createdAt: '2026-03-12T08:00:00.000Z',
      },
    ];
    const prompt = buildMentorSystemPrompt(buildMentorProfile('therapist'), 'goals', {
      memory: memorySnapshot,
    });

    expect(prompt).toContain(MEMORY_SNAPSHOT_HEADER);
    expect(prompt).toContain('- Fact (checkin): Completed a major milestone last week.');
    expect(prompt).toContain(
      '- Summary: Wants to preserve momentum with one clear next step.'
    );
  });

  it('uses fallback memory snapshot text when no memory entries are provided', () => {
    const prompt = buildMentorSystemPrompt(buildMentorProfile('therapist'), 'goals', {
      memory: [],
    });

    expect(prompt).toContain(MEMORY_SNAPSHOT_HEADER);
    expect(prompt).toContain(NO_MEMORY_FALLBACK);
  });
});
