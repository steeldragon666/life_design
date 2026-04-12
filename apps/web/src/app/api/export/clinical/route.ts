import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  buildClinicalExport,
  formatClinicalJSON,
  formatClinicalCSV,
  generateShareToken,
  isShareTokenValid,
  type ClinicalExportOptions,
  type ClinicalRawData,
} from '@life-design/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExportRequestBody {
  format: 'clinical_json' | 'clinical_csv' | 'clinical_pdf';
  include: {
    phq9?: boolean;
    gad7?: boolean;
    moodTrends?: boolean;
    sleepQuality?: boolean;
    journalAnalysis?: boolean;
    hrvMetrics?: boolean;
  };
  dateRange?: { from: string; to: string };
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
// GET /api/export/clinical?token=<share_token>
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { error: 'Missing token query parameter' },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // Look up the share token in the audit log (no auth required — token IS the auth)
  const { data: auditRow, error: lookupError } = await supabase
    .from('export_audit_log')
    .select('*')
    .eq('share_token', token)
    .single();

  if (lookupError || !auditRow) {
    return NextResponse.json(
      { error: 'Invalid or unknown share token' },
      { status: 404 },
    );
  }

  // Validate expiry
  if (!isShareTokenValid(auditRow.share_expires_at)) {
    return NextResponse.json(
      { error: 'Share token has expired' },
      { status: 410 },
    );
  }

  // Reconstruct the data based on audit log metadata
  const userId = auditRow.user_id;
  const dataIncluded: string[] = auditRow.data_included ?? [];

  const rawData = await fetchRawData(supabase, userId, dataIncluded);

  const options: ClinicalExportOptions = {
    includePhq9: dataIncluded.includes('phq9'),
    includeGad7: dataIncluded.includes('gad7'),
    includeMoodTrends: dataIncluded.includes('mood_trends'),
    includeSleepQuality: dataIncluded.includes('sleep_quality'),
    includeJournalAnalysis: dataIncluded.includes('journal_analysis'),
    includeHrvMetrics: dataIncluded.includes('hrv_metrics'),
  };

  const exportData = buildClinicalExport(options, rawData);

  // Update downloaded_at timestamp
  await supabase
    .from('export_audit_log')
    .update({ downloaded_at: new Date().toISOString() })
    .eq('id', auditRow.id);

  return NextResponse.json({
    data: {
      ...exportData,
      shareToken: token,
      shareExpiresAt: auditRow.share_expires_at,
    },
  });
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

  const validFormats = ['clinical_json', 'clinical_csv', 'clinical_pdf'] as const;
  if (!body.format || !validFormats.includes(body.format as typeof validFormats[number])) {
    return NextResponse.json(
      { error: 'Invalid format. Must be clinical_json, clinical_csv, or clinical_pdf.' },
      { status: 400 },
    );
  }

  const include = body.include ?? {};
  const dataIncluded: string[] = [];

  if (include.phq9) dataIncluded.push('phq9');
  if (include.gad7) dataIncluded.push('gad7');
  if (include.moodTrends) dataIncluded.push('mood_trends');
  if (include.sleepQuality) dataIncluded.push('sleep_quality');
  if (include.journalAnalysis) dataIncluded.push('journal_analysis');
  if (include.hrvMetrics) dataIncluded.push('hrv_metrics');

  // -----------------------------------------------------------------------
  // Fetch raw data
  // -----------------------------------------------------------------------

  const rawData = await fetchRawData(supabase, user.id, dataIncluded);

  // -----------------------------------------------------------------------
  // Build structured export using core module
  // -----------------------------------------------------------------------

  const options: ClinicalExportOptions = {
    includePhq9: !!include.phq9,
    includeGad7: !!include.gad7,
    includeMoodTrends: !!include.moodTrends,
    includeSleepQuality: !!include.sleepQuality,
    includeJournalAnalysis: !!include.journalAnalysis,
    includeHrvMetrics: !!include.hrvMetrics,
    dateRange: body.dateRange,
  };

  const exportData = buildClinicalExport(options, rawData);

  // -----------------------------------------------------------------------
  // Generate share token
  // -----------------------------------------------------------------------

  const { token: shareToken, expiresAt: shareExpiresAt } = generateShareToken();

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
  // Return response based on format
  // -----------------------------------------------------------------------

  if (body.format === 'clinical_csv') {
    const csv = formatClinicalCSV(exportData);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="clinical-export-${new Date().toISOString().slice(0, 10)}.csv"`,
        'X-Share-Token': shareToken,
        'X-Share-Expires-At': shareExpiresAt,
      },
    });
  }

  if (body.format === 'clinical_pdf') {
    // Return structured JSON with pdf_ready flag for frontend PDF renderer
    return NextResponse.json({
      format: 'pdf_ready',
      data: exportData,
      shareToken,
      shareExpiresAt,
    });
  }

  // clinical_json (default)
  const json = formatClinicalJSON(exportData);
  return new NextResponse(json, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="clinical-export-${new Date().toISOString().slice(0, 10)}.json"`,
      'X-Share-Token': shareToken,
      'X-Share-Expires-At': shareExpiresAt,
    },
  });
}

// ---------------------------------------------------------------------------
// Shared data fetching helper
// ---------------------------------------------------------------------------

async function fetchRawData(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, dataIncluded: string[]): Promise<ClinicalRawData> {
  const rawData: ClinicalRawData = {
    userId,
    phq9: [],
    gad7: [],
    mood: [],
    sleep: [],
    journal: [],
    hrv: [],
  };

  if (dataIncluded.includes('phq9')) {
    const { data } = await supabase
      .from('clinical_screenings')
      .select('id, instrument, total_score, severity, responses, administered_at')
      .eq('user_id', userId)
      .eq('instrument', 'phq9')
      .order('administered_at', { ascending: true });
    rawData.phq9 = (data ?? []) as ScreeningRecord[];
  }

  if (dataIncluded.includes('gad7')) {
    const { data } = await supabase
      .from('clinical_screenings')
      .select('id, instrument, total_score, severity, responses, administered_at')
      .eq('user_id', userId)
      .eq('instrument', 'gad7')
      .order('administered_at', { ascending: true });
    rawData.gad7 = (data ?? []) as ScreeningRecord[];
  }

  if (dataIncluded.includes('mood_trends')) {
    const { data } = await supabase
      .from('checkins')
      .select('id, mood_score, energy_level, stress_level, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(500);
    rawData.mood = (data ?? []) as ClinicalRawData['mood'];
  }

  if (dataIncluded.includes('sleep_quality')) {
    const { data } = await supabase
      .from('checkins')
      .select('id, sleep_quality, sleep_hours, created_at')
      .eq('user_id', userId)
      .not('sleep_quality', 'is', null)
      .order('created_at', { ascending: true })
      .limit(500);
    rawData.sleep = (data ?? []) as ClinicalRawData['sleep'];
  }

  if (dataIncluded.includes('journal_analysis')) {
    const { data } = await supabase
      .from('journal_entries')
      .select('id, sentiment_score, word_count, themes, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(500);
    rawData.journal = (data ?? []) as ClinicalRawData['journal'];
  }

  if (dataIncluded.includes('hrv_metrics')) {
    const { data } = await supabase
      .from('hrv_readings')
      .select('id, rmssd, sdnn, stress_index, recorded_at')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: true })
      .limit(500);
    rawData.hrv = (data ?? []) as ClinicalRawData['hrv'];
  }

  return rawData;
}
