import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  scorePHQ9Screening,
  scoreGAD7Screening,
  type ScreeningResult,
} from '@life-design/core';

// ---------------------------------------------------------------------------
// POST /api/screening — Save a screening result
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { instrument, answers } = body as {
    instrument: string;
    answers: number[];
  };

  if (!instrument || !Array.isArray(answers)) {
    return NextResponse.json(
      { error: 'instrument (string) and answers (number[]) are required' },
      { status: 400 },
    );
  }

  // Score using the appropriate function
  let result: ScreeningResult;
  try {
    switch (instrument) {
      case 'phq9':
        result = scorePHQ9Screening(answers);
        break;
      case 'gad7':
        result = scoreGAD7Screening(answers);
        break;
      default:
        return NextResponse.json(
          { error: `Unsupported instrument: ${instrument}` },
          { status: 400 },
        );
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Scoring error' },
      { status: 400 },
    );
  }

  // Build critical flags (PHQ-9 item 9 = suicidal ideation)
  const criticalFlags: Record<string, unknown> = {};
  if (instrument === 'phq9' && answers.length >= 9 && answers[8] > 0) {
    criticalFlags.phq9_item9 = answers[8];
  }

  // Save to clinical_screenings table
  const { data, error } = await supabase
    .from('clinical_screenings')
    .insert({
      user_id: user.id,
      instrument,
      responses: { answers: result.answers },
      total_score: result.total,
      severity: result.severity,
      critical_flags: Object.keys(criticalFlags).length > 0 ? criticalFlags : {},
      context: 'routine',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: { ...result, id: data.id } }, { status: 201 });
}

// ---------------------------------------------------------------------------
// GET /api/screening — Get screening history
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const instrument = request.nextUrl.searchParams.get('instrument');

  let query = supabase
    .from('clinical_screenings')
    .select('*')
    .eq('user_id', user.id)
    .order('administered_at', { ascending: false })
    .limit(12);

  if (instrument) {
    query = query.eq('instrument', instrument);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map DB rows to ScreeningResult shape
  const results = (data ?? []).map((row) => ({
    id: row.id,
    instrument: row.instrument as ScreeningResult['instrument'],
    answers: (row.responses as { answers?: number[] })?.answers ?? [],
    total: row.total_score,
    severity: row.severity,
    administeredAt: row.administered_at,
  }));

  return NextResponse.json({ data: results });
}
