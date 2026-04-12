/**
 * @module features/life-story
 *
 * Builds and maintains a narrative understanding of the user's life over time.
 * Uses Claude Opus to synthesise episodic and semantic memories into a structured
 * life story with chapters, themes, and growth arcs.
 */

import type {
  LifeStory,
  LifeChapter,
  GrowthArc,
  SemanticMemory,
  RelationalMilestone,
} from '../types.js';

// ── Prompt ───────────────────────────────────────────────────────────────────

export const LIFE_STORY_PROMPT: string = `You are a compassionate narrative therapist helping to construct a coherent, meaningful life story for a person engaged in therapeutic work.

You will be given:
- A semantic profile describing who the person is (values, relationships, work, psychological traits)
- A series of episodic memory summaries from their sessions
- Key relational milestones in their therapeutic journey

Your task is to synthesise this material into a structured life story. Focus on narrative continuity, growth patterns, and meaningful themes — not clinical diagnosis.

Guidelines:
- Identify 2–5 distinct life chapters based on natural turning points or thematic shifts
- Surface 3–7 overarching themes (e.g., "learning to ask for help", "reconciling identity and expectation")
- Detect 1–4 growth arcs — ongoing trajectories of change, whether emerging, active, resolved, or recurring
- Write with warmth and dignity. This person will eventually read this.
- Do NOT invent facts. Only synthesise what is present in the data.

Return your response as valid JSON matching this exact shape:
{
  "chapters": [
    {
      "title": "string — evocative chapter name",
      "period": "string — e.g. '2020–2022' or 'Early adulthood'",
      "summary": "string — 2–4 sentences describing this chapter",
      "keyEvents": ["string", ...],
      "emotionalTheme": "string — dominant emotional quality of this period"
    }
  ],
  "themes": ["string", ...],
  "growthArcs": [
    {
      "name": "string",
      "startDate": "ISO 8601 date string",
      "description": "string — 1–3 sentences",
      "status": "emerging" | "active" | "resolved" | "recurring"
    }
  ]
}

Return only the JSON object. No preamble, no markdown fences.`;

// ── Context Builder ──────────────────────────────────────────────────────────

export function buildLifeStoryContext(params: {
  semantic: SemanticMemory;
  episodicSummaries: string[];
  relationalMilestones: RelationalMilestone[];
}): string {
  const { semantic, episodicSummaries, relationalMilestones } = params;

  const { lifeContext, psychologicalProfile, therapeuticPreferences } = semantic;

  const profileLines: string[] = [
    '## Semantic Profile',
    '',
    '### Life Context',
    lifeContext.work ? `Work: ${lifeContext.work}` : 'Work: Not specified',
    `Relationships: ${lifeContext.relationships.length > 0 ? lifeContext.relationships.join(', ') : 'None noted'}`,
    `Goals: ${lifeContext.goals.length > 0 ? lifeContext.goals.join(', ') : 'None noted'}`,
    `Values: ${lifeContext.values.length > 0 ? lifeContext.values.join(', ') : 'None noted'}`,
    `Interests: ${lifeContext.interests.length > 0 ? lifeContext.interests.join(', ') : 'None noted'}`,
    lifeContext.culturalBackground ? `Cultural background: ${lifeContext.culturalBackground}` : '',
    lifeContext.spiritualOrientation ? `Spiritual orientation: ${lifeContext.spiritualOrientation}` : '',
    lifeContext.healthConditions.length > 0 ? `Health conditions: ${lifeContext.healthConditions.join(', ')}` : '',
    '',
    '### Psychological Profile',
    psychologicalProfile.attachmentStyle ? `Attachment style: ${psychologicalProfile.attachmentStyle}` : '',
    psychologicalProfile.copingStrengths.length > 0 ? `Coping strengths: ${psychologicalProfile.copingStrengths.join(', ')}` : '',
    psychologicalProfile.copingGaps.length > 0 ? `Coping gaps: ${psychologicalProfile.copingGaps.join(', ')}` : '',
    psychologicalProfile.commonDistortions.length > 0 ? `Common distortions: ${psychologicalProfile.commonDistortions.join(', ')}` : '',
    psychologicalProfile.selfCompassionLevel ? `Self-compassion: ${psychologicalProfile.selfCompassionLevel}` : '',
    psychologicalProfile.locusOfControl ? `Locus of control: ${psychologicalProfile.locusOfControl}` : '',
    '',
    '### Therapeutic Preferences',
    `Depth preference: ${therapeuticPreferences.depthPreference}`,
    `Communication style: ${therapeuticPreferences.communicationStyle ?? 'Not specified'}`,
  ].filter((line) => line !== '');

  const episodicSection =
    episodicSummaries.length > 0
      ? [
          '',
          '## Session Memory Summaries',
          ...episodicSummaries.map((summary, i) => `[Session ${i + 1}] ${summary}`),
        ]
      : ['', '## Session Memory Summaries', 'No session memories available yet.'];

  const milestonesSection =
    relationalMilestones.length > 0
      ? [
          '',
          '## Relational Milestones',
          ...relationalMilestones.map(
            (m) =>
              `- ${m.date.toISOString().split('T')[0]} (${m.significance}): ${m.event}`,
          ),
        ]
      : ['', '## Relational Milestones', 'No milestones recorded yet.'];

  return [...profileLines, ...episodicSection, ...milestonesSection].join('\n');
}

// ── Response Parser ──────────────────────────────────────────────────────────

interface RawLifeStoryResponse {
  chapters: Array<{
    title: unknown;
    period: unknown;
    summary: unknown;
    keyEvents: unknown;
    emotionalTheme: unknown;
  }>;
  themes: unknown;
  growthArcs: Array<{
    name: unknown;
    startDate: unknown;
    description: unknown;
    status: unknown;
  }>;
}

function isRawLifeStoryResponse(value: unknown): value is RawLifeStoryResponse {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return Array.isArray(obj['chapters']) && Array.isArray(obj['themes']) && Array.isArray(obj['growthArcs']);
}

function parseChapter(raw: RawLifeStoryResponse['chapters'][number]): LifeChapter | null {
  if (
    typeof raw.title !== 'string' ||
    typeof raw.period !== 'string' ||
    typeof raw.summary !== 'string' ||
    typeof raw.emotionalTheme !== 'string' ||
    !Array.isArray(raw.keyEvents)
  ) {
    return null;
  }
  return {
    title: raw.title,
    period: raw.period,
    summary: raw.summary,
    keyEvents: raw.keyEvents.filter((e): e is string => typeof e === 'string'),
    emotionalTheme: raw.emotionalTheme,
  };
}

const VALID_ARC_STATUSES = new Set(['emerging', 'active', 'resolved', 'recurring']);

function parseGrowthArc(raw: RawLifeStoryResponse['growthArcs'][number]): GrowthArc | null {
  if (
    typeof raw.name !== 'string' ||
    typeof raw.startDate !== 'string' ||
    typeof raw.description !== 'string' ||
    typeof raw.status !== 'string' ||
    !VALID_ARC_STATUSES.has(raw.status)
  ) {
    return null;
  }
  const startDate = new Date(raw.startDate);
  if (isNaN(startDate.getTime())) return null;
  return {
    name: raw.name,
    startDate,
    description: raw.description,
    status: raw.status as GrowthArc['status'],
  };
}

export function parseLifeStoryResponse(response: string): LifeStory | null {
  try {
    const trimmed = response.trim();
    // Strip markdown fences if the model wrapped anyway
    const jsonText = trimmed.startsWith('```')
      ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
      : trimmed;

    const parsed: unknown = JSON.parse(jsonText);
    if (!isRawLifeStoryResponse(parsed)) return null;

    const chapters = parsed.chapters
      .map(parseChapter)
      .filter((c): c is LifeChapter => c !== null);

    const themes = Array.isArray(parsed.themes)
      ? parsed.themes.filter((t): t is string => typeof t === 'string')
      : [];

    const growthArcs = parsed.growthArcs
      .map(parseGrowthArc)
      .filter((a): a is GrowthArc => a !== null);

    // Return null if all arrays came back empty — indicates a bad response
    if (chapters.length === 0 && themes.length === 0 && growthArcs.length === 0) {
      return null;
    }

    return {
      userId: '', // Caller must set userId after parsing
      chapters,
      themes,
      growthArcs,
      lastUpdated: new Date(),
    };
  } catch {
    return null;
  }
}

// ── Default Scaffold ─────────────────────────────────────────────────────────

export function createDefaultLifeStory(userId: string): LifeStory {
  return {
    userId,
    chapters: [],
    themes: [],
    growthArcs: [],
    lastUpdated: new Date(),
  };
}
