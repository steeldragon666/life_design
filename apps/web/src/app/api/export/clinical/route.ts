import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExportRequestBody {
  format: 'clinical_json' | 'clinical_csv';
  include: {
    phq9?: boolean;
    gad7?: boolean;
    moodTrends?: boolean;
    sleepQuality?: boolean;
  };
}

interface ScreeningRecord {
  id: string;
  instrument: string;
  total_score: number;
  severity: string;
  responses: Record<string, unknown>;
  administered_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
      return `"${str.replace(/"/g, '""')}"`;
    }).join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}

// ---------------------------------------------------------------------------
// POST /api/export/clinical
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse and validate body
  let body: ExportRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validFormats = ['clinical_json', 'clinical_csv'] as const;
  if (!body.format || !validFormats.includes(body.format as typeof validFormats[number])) {
    return NextResponse.json(
      { error: 'Invalid format. Must be clinical_json or clinical_csv.' },
      { status: 400 },
    );
  }

  const include = body.include ?? {};
  const dataIncluded: string[] = [];

  // -----------------------------------------------------------------------
  // Fetch clinical screenings
  // -----------------------------------------------------------------------

  let phq9Data: ScreeningRecord[] = [];
  let gad7Data: ScreeningRecord[] = [];

  if (include.phq9) {
    const { data, error } = await supabase
      .from('clinical_screenings')
      .select('id, instrument, total_score, severity, responses, administered_at')
      .eq('user_id', user.id)
      .eq('instrument', 'phq9')
      .order('administered_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch PHQ-9 data' }, { status: 500 });
    }
    phq9Data = (data ?? []) as ScreeningRecord[];
    dataIncluded.push('phq9');
  }

  if (include.gad7) {
    const { data, error } = await supabase
      .from('clinical_screenings')
      .select('id, instrument, total_score, severity, responses, administered_at')
      .eq('user_id', user.id)
      .eq('instrument', 'gad7')
      .order('administered_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch GAD-7 data' }, { status: 500 });
    }
    gad7Data = (data ?? []) as ScreeningRecord[];
    dataIncluded.push('gad7');
  }

  // -----------------------------------------------------------------------
  // Fetch mood trends (from checkins table if available)
  // -----------------------------------------------------------------------

  let moodData: Record<string, unknown>[] = [];
  if (include.moodTrends) {
    const { data, error } = await supabase
      .from('checkins')
      .select('id, mood_score, energy_level, stress_level, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(500);

    if (!error && data) {
      moodData = data;
    }
    dataIncluded.push('mood_trends');
  }

  // -----------------------------------------------------------------------
  // Fetch sleep quality
  // -----------------------------------------------------------------------

  let sleepData: Record<string, unknown>[] = [];
  if (include.sleepQuality) {
    const { data, error } = await supabase
      .from('checkins')
      .select('id, sleep_quality, sleep_hours, created_at')
      .eq('user_id', user.id)
      .not('sleep_quality', 'is', null)
      .order('created_at', { ascending: true })
      .limit(500);

    if (!error && data) {
      sleepData = data;
    }
    dataIncluded.push('sleep_quality');
  }

  // -----------------------------------------------------------------------
  // Build export payload
  // -----------------------------------------------------------------------

  const shareToken = randomUUID();
  const shareExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    userId: user.id,
    shareToken,
    shareExpiresAt,
    dataIncluded,
    phq9: phq9Data.length > 0 ? {
      records: phq9Data,
      summary: {
        totalAssessments: phq9Data.length,
        latestScore: phq9Data[phq9Data.length - 1]?.total_score,
        latestSeverity: phq9Data[phq9Data.length - 1]?.severity,
        scoreRange: {
          min: Math.min(...phq9Data.map((r) => r.total_score)),
          max: Math.max(...phq9Data.map((r) => r.total_score)),
        },
      },
    } : undefined,
    gad7: gad7Data.length > 0 ? {
      records: gad7Data,
      summary: {
        totalAssessments: gad7Data.length,
        latestScore: gad7Data[gad7Data.length - 1]?.total_score,
        latestSeverity: gad7Data[gad7Data.length - 1]?.severity,
        scoreRange: {
          min: Math.min(...gad7Data.map((r) => r.total_score)),
          max: Math.max(...gad7Data.map((r) => r.total_score)),
        },
      },
    } : undefined,
    moodTrends: moodData.length > 0 ? { records: moodData } : undefined,
    sleepQuality: sleepData.length > 0 ? { records: sleepData } : undefined,
  };

  // -----------------------------------------------------------------------
  // Create audit log entry
  // -----------------------------------------------------------------------

  const { error: auditError } = await supabase
    .from('export_audit_log')
    .insert({
      user_id: user.id,
      export_type: body.format,
      data_included: dataIncluded,
      share_token: shareToken,
      share_expires_at: shareExpiresAt,
    });

  if (auditError) {
    console.error('Failed to create export audit log:', auditError);
    // Non-fatal — still return the export
  }

  // -----------------------------------------------------------------------
  // Return response
  // -----------------------------------------------------------------------

  if (body.format === 'clinical_csv') {
    // Flatten screenings + mood + sleep into a single CSV
    const allRows: Record<string, unknown>[] = [
      ...phq9Data.map((r) => ({ type: 'phq9', date: r.administered_at, score: r.total_score, severity: r.severity })),
      ...gad7Data.map((r) => ({ type: 'gad7', date: r.administered_at, score: r.total_score, severity: r.severity })),
      ...moodData.map((r) => ({ type: 'mood', date: r.created_at, score: r.mood_score, severity: '' })),
      ...sleepData.map((r) => ({ type: 'sleep', date: r.created_at, score: r.sleep_quality, severity: '' })),
    ];

    return new NextResponse(formatCSV(allRows), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="clinical-export-${new Date().toISOString().slice(0, 10)}.csv"`,
        'X-Share-Token': shareToken,
        'X-Share-Expires-At': shareExpiresAt,
      },
    });
  }

  return NextResponse.json({
    data: exportPayload,
    shareToken,
    shareExpiresAt,
  });
}
