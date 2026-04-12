/**
 * @module features/growth-narrative
 *
 * Generates periodic growth narratives — monthly or quarterly summaries of
 * a user's progress, articulating what has shifted and where energy is still
 * being invested.
 */

import type {
  GrowthNarrative,
  RelationalMilestone,
  AssessmentTrend,
} from '../types';

// ── Prompt ───────────────────────────────────────────────────────────────────

export const GROWTH_NARRATIVE_PROMPT: string = `You are a compassionate, narrative-focused therapeutic companion generating a periodic growth summary for a person you have been working with.

You will be given:
- The time period being reviewed (start and end dates)
- Relational milestones reached during the period
- Assessment trends (e.g. PHQ-9, GAD-7 scores at start vs end)
- Session memory summaries from the period

Your task is to produce both a human-readable narrative AND structured data capturing progress.

Guidelines for the narrative:
- Write in second person ("you have…", "this period saw you…")
- Be honest about difficulty; do not manufacture positivity where the data shows struggle
- Highlight specific, concrete shifts — not generic encouragement
- Keep the narrative to 200–400 words
- Close with one forward-facing sentence about what continues to be in motion

Return your response as valid JSON matching this exact shape:
{
  "narrative": "string — the full human-readable growth narrative",
  "patternsShifted": ["string — brief description of each pattern that changed"],
  "areasInProgress": ["string — brief description of each area still being worked on"]
}

Return only the JSON object. No preamble, no markdown fences.`;

// ── Context Builder ──────────────────────────────────────────────────────────

export function buildGrowthNarrativeContext(params: {
  milestones: RelationalMilestone[];
  assessmentTrends: AssessmentTrend[];
  episodicSummaries: string[];
  periodStart: Date;
  periodEnd: Date;
}): string {
  const { milestones, assessmentTrends, episodicSummaries, periodStart, periodEnd } = params;

  const periodLine = `Period: ${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}`;

  const milestonesSection =
    milestones.length > 0
      ? [
          '## Relational Milestones This Period',
          ...milestones.map(
            (m) => `- ${m.date.toISOString().split('T')[0]} (${m.significance}): ${m.event}`,
          ),
        ]
      : ['## Relational Milestones This Period', 'No milestones recorded for this period.'];

  const assessmentSection =
    assessmentTrends.length > 0
      ? [
          '',
          '## Assessment Trends',
          ...assessmentTrends.map(
            (t) =>
              `- ${t.instrument}: ${t.startScore} (${t.startSeverity}) → ${t.endScore} (${t.endSeverity}) [${t.direction}]`,
          ),
        ]
      : ['', '## Assessment Trends', 'No assessment data available for this period.'];

  const episodicSection =
    episodicSummaries.length > 0
      ? [
          '',
          '## Session Summaries',
          ...episodicSummaries.map((s, i) => `[Session ${i + 1}] ${s}`),
        ]
      : ['', '## Session Summaries', 'No session summaries available for this period.'];

  return [periodLine, '', ...milestonesSection, ...assessmentSection, ...episodicSection].join(
    '\n',
  );
}

// ── Response Parser ──────────────────────────────────────────────────────────

interface RawGrowthNarrativeResponse {
  narrative: unknown;
  patternsShifted: unknown;
  areasInProgress: unknown;
}

function isRawGrowthNarrativeResponse(value: unknown): value is RawGrowthNarrativeResponse {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    'narrative' in obj &&
    'patternsShifted' in obj &&
    'areasInProgress' in obj
  );
}

export function parseGrowthNarrativeResponse(
  response: string,
  userId: string,
  periodStart: Date,
  periodEnd: Date,
): GrowthNarrative | null {
  try {
    const trimmed = response.trim();
    const jsonText = trimmed.startsWith('```')
      ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
      : trimmed;

    const parsed: unknown = JSON.parse(jsonText);
    if (!isRawGrowthNarrativeResponse(parsed)) return null;

    if (typeof parsed.narrative !== 'string' || parsed.narrative.trim() === '') return null;

    const patternsShifted = Array.isArray(parsed.patternsShifted)
      ? parsed.patternsShifted.filter((p): p is string => typeof p === 'string')
      : [];

    const areasInProgress = Array.isArray(parsed.areasInProgress)
      ? parsed.areasInProgress.filter((a): a is string => typeof a === 'string')
      : [];

    const id = `narrative_${userId}_${periodStart.toISOString().split('T')[0]}`;

    return {
      id,
      userId,
      periodStart,
      periodEnd,
      narrative: parsed.narrative,
      milestones: [],   // Caller should hydrate from the params used to build context
      assessmentTrends: [], // Same — caller has these; we only parse what Claude returns
      patternsShifted,
      areasInProgress,
      generatedAt: new Date(),
    };
  } catch {
    return null;
  }
}

// ── Interval Guard ───────────────────────────────────────────────────────────

/** Returns true when enough time has elapsed since the last narrative was generated. */
export function shouldGenerateNarrative(
  lastGenerated: Date | null,
  intervalDays: number = 30,
): boolean {
  if (lastGenerated === null) return true;
  const msPerDay = 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - lastGenerated.getTime();
  return elapsed >= intervalDays * msPerDay;
}
