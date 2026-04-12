/**
 * POST /api/companion/growth-narrative
 *
 * Generates a periodic growth narrative for the authenticated user by
 * aggregating episodic summaries, relational milestones, and clinical
 * screening trends, then calling Claude Opus with the DRM growth-narrative
 * prompt.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  GROWTH_NARRATIVE_PROMPT,
  buildGrowthNarrativeContext,
  parseGrowthNarrativeResponse,
} from '@life-design/drm/features';
import type { AssessmentTrend, RelationalMilestone } from '@life-design/drm';

// ── Supabase row shapes ───────────────────────────────────────────────────────

interface EpisodicMemoryRow {
  summary: string;
  timestamp: string;
}

interface RelationalMemoryRow {
  milestones: Array<{
    date: string;
    event: string;
    significance: 'minor' | 'moderate' | 'major';
  }>;
}

interface ClinicalScreeningRow {
  instrument: string;
  score: number;
  severity: string;
  administered_at: string;
}

interface GrowthNarrativeRow {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  narrative: string;
  milestones: RelationalMilestone[];
  assessment_trends: AssessmentTrend[];
  patterns_shifted: string[];
  areas_in_progress: string[];
  generated_at: string;
}

// ── Request body type ─────────────────────────────────────────────────────────

interface GrowthNarrativeRequestBody {
  periodMonths?: number;
}

// ── Assessment trend builder ──────────────────────────────────────────────────

function buildAssessmentTrends(
  screenings: ClinicalScreeningRow[],
  periodStart: Date,
): AssessmentTrend[] {
  // Group by instrument
  const byInstrument = new Map<string, ClinicalScreeningRow[]>();
  for (const row of screenings) {
    const existing = byInstrument.get(row.instrument) ?? [];
    existing.push(row);
    byInstrument.set(row.instrument, existing);
  }

  const trends: AssessmentTrend[] = [];

  for (const [instrument, rows] of byInstrument) {
    if (rows.length < 2) continue;

    // Sort ascending by date
    const sorted = [...rows].sort(
      (a, b) => new Date(a.administered_at).getTime() - new Date(b.administered_at).getTime(),
    );

    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    // Only include if we have a start score within the period
    if (new Date(first.administered_at) < periodStart) continue;
    if (!first || !last) continue;

    const direction: AssessmentTrend['direction'] =
      last.score < first.score
        ? 'improving'
        : last.score > first.score
          ? 'worsening'
          : 'stable';

    trends.push({
      instrument,
      startScore: first.score,
      endScore: last.score,
      startSeverity: first.severity,
      endSeverity: last.severity,
      direction,
    });
  }

  return trends;
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse body
    let body: GrowthNarrativeRequestBody = {};
    try {
      body = (await request.json()) as GrowthNarrativeRequestBody;
    } catch {
      // Body is optional; use defaults
    }

    const periodMonths = typeof body.periodMonths === 'number' ? body.periodMonths : 3;
    if (periodMonths < 1 || periodMonths > 24) {
      return NextResponse.json(
        { error: 'periodMonths must be between 1 and 24' },
        { status: 400 },
      );
    }

    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setMonth(periodStart.getMonth() - periodMonths);

    const serviceClient = createServiceRoleClient();

    // Fetch data in parallel
    const [episodicRes, relationalRes, screeningRes] = await Promise.allSettled([
      serviceClient
        .from('episodic_memory')
        .select('summary, timestamp')
        .eq('user_id', user.id)
        .gte('timestamp', periodStart.toISOString())
        .lte('timestamp', periodEnd.toISOString())
        .order('timestamp', { ascending: true })
        .returns<EpisodicMemoryRow[]>(),

      serviceClient
        .from('relational_memory')
        .select('milestones')
        .eq('user_id', user.id)
        .maybeSingle<RelationalMemoryRow>(),

      serviceClient
        .from('clinical_screenings')
        .select('instrument, score, severity, administered_at')
        .eq('user_id', user.id)
        .gte('administered_at', periodStart.toISOString())
        .lte('administered_at', periodEnd.toISOString())
        .order('administered_at', { ascending: true })
        .returns<ClinicalScreeningRow[]>(),
    ]);

    // Extract episodic summaries
    const episodicSummaries: string[] =
      episodicRes.status === 'fulfilled' && episodicRes.value.data
        ? episodicRes.value.data.map((r) => r.summary)
        : [];

    // Extract milestones within period
    let milestones: RelationalMilestone[] = [];
    if (relationalRes.status === 'fulfilled' && relationalRes.value.data) {
      milestones = relationalRes.value.data.milestones
        .map((m) => ({
          date: new Date(m.date),
          event: m.event,
          significance: m.significance,
        }))
        .filter(
          (m) => m.date >= periodStart && m.date <= periodEnd,
        );
    }

    // Build assessment trends
    const screeningRows: ClinicalScreeningRow[] =
      screeningRes.status === 'fulfilled' && screeningRes.value.data
        ? screeningRes.value.data
        : [];
    const assessmentTrends = buildAssessmentTrends(screeningRows, periodStart);

    // Build context for Claude
    const context = buildGrowthNarrativeContext({
      milestones,
      assessmentTrends,
      episodicSummaries,
      periodStart,
      periodEnd,
    });

    // Call Claude Opus
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY environment variable is not set' },
        { status: 500 },
      );
    }

    const anthropic = new Anthropic({ apiKey });

    let claudeText: string;
    try {
      const claudeResponse = await anthropic.messages.create({
        model: 'claude-opus-4-20250514',
        system: GROWTH_NARRATIVE_PROMPT,
        messages: [{ role: 'user', content: context }],
        max_tokens: 1024,
        temperature: 0.7,
      });

      const textBlock = claudeResponse.content.find(
        (block: Anthropic.ContentBlock): block is Anthropic.TextBlock => block.type === 'text',
      );
      if (!textBlock?.text) {
        return NextResponse.json(
          { error: 'No text content in Claude response' },
          { status: 500 },
        );
      }
      claudeText = textBlock.text;
    } catch (err) {
      console.error('[companion/growth-narrative] Claude API error:', err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Claude API call failed' },
        { status: 500 },
      );
    }

    // Parse Claude's JSON response
    const parsed = parseGrowthNarrativeResponse(
      claudeText,
      user.id,
      periodStart,
      periodEnd,
    );

    if (!parsed) {
      console.error('[companion/growth-narrative] Failed to parse Claude response:', claudeText);
      return NextResponse.json(
        { error: 'Failed to parse growth narrative from Claude response' },
        { status: 500 },
      );
    }

    // Hydrate milestones and assessment trends from what we fetched
    const fullNarrative = {
      ...parsed,
      milestones,
      assessmentTrends,
    };

    // Store in growth_narratives table (fire-and-forget so a DB error
    // does not prevent the user from receiving their narrative)
    serviceClient
      .from('growth_narratives')
      .insert({
        id: fullNarrative.id,
        user_id: user.id,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        narrative: fullNarrative.narrative,
        milestones: fullNarrative.milestones,
        assessment_trends: fullNarrative.assessmentTrends,
        patterns_shifted: fullNarrative.patternsShifted,
        areas_in_progress: fullNarrative.areasInProgress,
        generated_at: fullNarrative.generatedAt.toISOString(),
      } satisfies GrowthNarrativeRow)
      .then(({ error }) => {
        if (error) {
          console.error('[companion/growth-narrative] Failed to persist narrative:', error);
        }
      });

    return NextResponse.json({
      narrative: fullNarrative.narrative,
      milestones: fullNarrative.milestones,
      assessmentTrends: fullNarrative.assessmentTrends,
      patternsShifted: fullNarrative.patternsShifted,
      areasInProgress: fullNarrative.areasInProgress,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    });
  } catch (error) {
    console.error('[companion/growth-narrative] Unhandled error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
