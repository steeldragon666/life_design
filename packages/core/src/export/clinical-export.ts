import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClinicalExportOptions {
  includePhq9: boolean;
  includeGad7: boolean;
  includeMoodTrends: boolean;
  includeSleepQuality: boolean;
  includeJournalAnalysis: boolean;
  includeHrvMetrics: boolean;
  dateRange?: { from: string; to: string };
}

export interface ClinicalExportData {
  exportedAt: string;
  patientId: string;
  dateRange: { from: string; to: string };
  sections: ClinicalSection[];
}

export interface ClinicalSection {
  title: string;
  type: 'screening' | 'mood' | 'sleep' | 'journal' | 'physiological';
  summary: Record<string, unknown>;
  records: Record<string, unknown>[];
}

export interface ScreeningRecord {
  id: string;
  instrument: string;
  total_score: number;
  severity: string;
  responses: Record<string, unknown>;
  administered_at: string;
}

export interface MoodRecord {
  id: string;
  mood_score: number;
  energy_level: number;
  stress_level: number;
  created_at: string;
}

export interface SleepRecord {
  id: string;
  sleep_quality: number;
  sleep_hours: number;
  created_at: string;
}

export interface JournalRecord {
  id: string;
  sentiment_score: number;
  word_count: number;
  themes: string[];
  created_at: string;
}

export interface HrvRecord {
  id: string;
  rmssd: number;
  sdnn: number;
  stress_index: number;
  recorded_at: string;
}

export interface ClinicalRawData {
  userId: string;
  phq9: ScreeningRecord[];
  gad7: ScreeningRecord[];
  mood: MoodRecord[];
  sleep: SleepRecord[];
  journal: JournalRecord[];
  hrv: HrvRecord[];
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/** Returns the first 8 characters of a user ID for anonymization. */
export function anonymizeUserId(userId: string): string {
  return userId.slice(0, 8);
}

/** Returns true if the share token expiry is in the future. */
export function isShareTokenValid(expiresAt: string): boolean {
  const expiry = new Date(expiresAt).getTime();
  if (isNaN(expiry)) return false;
  return expiry > Date.now();
}

/** Generate a UUID share token with a 7-day expiry. */
export function generateShareToken(): { token: string; expiresAt: string } {
  return {
    token: randomUUID(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Date filtering helper
// ---------------------------------------------------------------------------

function isInDateRange(
  dateStr: string,
  range?: { from: string; to: string },
): boolean {
  if (!range) return true;
  const d = new Date(dateStr).getTime();
  const from = new Date(range.from).getTime();
  const to = new Date(range.to).getTime();
  return d >= from && d <= to;
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

function buildScreeningSection(
  title: string,
  records: ScreeningRecord[],
  dateRange?: { from: string; to: string },
): ClinicalSection {
  const filtered = records.filter((r) => isInDateRange(r.administered_at, dateRange));
  const summary: Record<string, unknown> = {
    totalAssessments: filtered.length,
  };

  if (filtered.length > 0) {
    const scores = filtered.map((r) => r.total_score);
    summary.latestScore = filtered[filtered.length - 1].total_score;
    summary.latestSeverity = filtered[filtered.length - 1].severity;
    summary.scoreRange = {
      min: Math.min(...scores),
      max: Math.max(...scores),
    };
  }

  return {
    title,
    type: 'screening',
    summary,
    records: filtered as unknown as Record<string, unknown>[],
  };
}

function buildMoodSection(
  records: MoodRecord[],
  dateRange?: { from: string; to: string },
): ClinicalSection {
  const filtered = records.filter((r) => isInDateRange(r.created_at, dateRange));
  const summary: Record<string, unknown> = {
    totalEntries: filtered.length,
  };

  if (filtered.length > 0) {
    const scores = filtered.map((r) => r.mood_score);
    summary.averageMood = +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
    summary.moodRange = { min: Math.min(...scores), max: Math.max(...scores) };
  }

  return {
    title: 'Mood Trends',
    type: 'mood',
    summary,
    records: filtered as unknown as Record<string, unknown>[],
  };
}

function buildSleepSection(
  records: SleepRecord[],
  dateRange?: { from: string; to: string },
): ClinicalSection {
  const filtered = records.filter((r) => isInDateRange(r.created_at, dateRange));
  const summary: Record<string, unknown> = {
    totalEntries: filtered.length,
  };

  if (filtered.length > 0) {
    const hours = filtered.map((r) => r.sleep_hours);
    summary.averageSleepHours = +(hours.reduce((a, b) => a + b, 0) / hours.length).toFixed(2);
  }

  return {
    title: 'Sleep Quality',
    type: 'sleep',
    summary,
    records: filtered as unknown as Record<string, unknown>[],
  };
}

function buildJournalSection(
  records: JournalRecord[],
  dateRange?: { from: string; to: string },
): ClinicalSection {
  const filtered = records.filter((r) => isInDateRange(r.created_at, dateRange));
  const summary: Record<string, unknown> = {
    totalEntries: filtered.length,
  };

  if (filtered.length > 0) {
    const sentiments = filtered.map((r) => r.sentiment_score);
    summary.averageSentiment = +(sentiments.reduce((a, b) => a + b, 0) / sentiments.length).toFixed(3);
    // Aggregate themes
    const themeCounts: Record<string, number> = {};
    for (const rec of filtered) {
      for (const theme of rec.themes) {
        themeCounts[theme] = (themeCounts[theme] ?? 0) + 1;
      }
    }
    summary.topThemes = Object.entries(themeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme, count]) => ({ theme, count }));
  }

  return {
    title: 'Journal Linguistic Analysis',
    type: 'journal',
    summary,
    records: filtered as unknown as Record<string, unknown>[],
  };
}

function buildHrvSection(
  records: HrvRecord[],
  dateRange?: { from: string; to: string },
): ClinicalSection {
  const filtered = records.filter((r) => isInDateRange(r.recorded_at, dateRange));
  const summary: Record<string, unknown> = {
    totalReadings: filtered.length,
  };

  if (filtered.length > 0) {
    const rmssd = filtered.map((r) => r.rmssd);
    summary.averageRmssd = +(rmssd.reduce((a, b) => a + b, 0) / rmssd.length).toFixed(2);
    const stress = filtered.map((r) => r.stress_index);
    summary.averageStressIndex = +(stress.reduce((a, b) => a + b, 0) / stress.length).toFixed(2);
  }

  return {
    title: 'Heart Rate Variability',
    type: 'physiological',
    summary,
    records: filtered as unknown as Record<string, unknown>[],
  };
}

// ---------------------------------------------------------------------------
// Main export builder
// ---------------------------------------------------------------------------

/** Assemble a clinical export from raw data based on selected options. */
export function buildClinicalExport(
  options: ClinicalExportOptions,
  data: ClinicalRawData,
): ClinicalExportData {
  const sections: ClinicalSection[] = [];
  const dr = options.dateRange;

  if (options.includePhq9) {
    sections.push(buildScreeningSection('PHQ-9 Depression Screening', data.phq9, dr));
  }
  if (options.includeGad7) {
    sections.push(buildScreeningSection('GAD-7 Anxiety Screening', data.gad7, dr));
  }
  if (options.includeMoodTrends) {
    sections.push(buildMoodSection(data.mood, dr));
  }
  if (options.includeSleepQuality) {
    sections.push(buildSleepSection(data.sleep, dr));
  }
  if (options.includeJournalAnalysis) {
    sections.push(buildJournalSection(data.journal, dr));
  }
  if (options.includeHrvMetrics) {
    sections.push(buildHrvSection(data.hrv, dr));
  }

  // Compute overall date range from all records if not provided
  const allDates: string[] = [];
  for (const section of sections) {
    for (const rec of section.records) {
      const d = (rec as Record<string, unknown>).administered_at
        ?? (rec as Record<string, unknown>).created_at
        ?? (rec as Record<string, unknown>).recorded_at;
      if (typeof d === 'string') allDates.push(d);
    }
  }
  allDates.sort();

  const dateRange = dr
    ? { from: dr.from, to: dr.to }
    : {
        from: allDates[0] ?? new Date().toISOString(),
        to: allDates[allDates.length - 1] ?? new Date().toISOString(),
      };

  return {
    exportedAt: new Date().toISOString(),
    patientId: anonymizeUserId(data.userId),
    dateRange,
    sections,
  };
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

/** Pretty-printed JSON with clinical metadata header. */
export function formatClinicalJSON(exportData: ClinicalExportData): string {
  const output = {
    _metadata: {
      format: 'clinical_export',
      version: '1.0',
      generatedAt: exportData.exportedAt,
      disclaimer:
        'This export contains clinical screening data for review by a licensed healthcare provider. It is not a diagnostic tool.',
    },
    patientId: exportData.patientId,
    dateRange: exportData.dateRange,
    sections: exportData.sections,
  };

  return JSON.stringify(output, null, 2);
}

/** Multi-section CSV with section headers and blank-line separators. */
export function formatClinicalCSV(exportData: ClinicalExportData): string {
  const parts: string[] = [];

  for (const section of exportData.sections) {
    // Section header comment
    parts.push(`# ${section.title}`);
    parts.push(`# Type: ${section.type}`);

    if (section.records.length === 0) {
      parts.push('# No records');
      parts.push('');
      continue;
    }

    // Column headers from first record
    const headers = Object.keys(section.records[0]);
    parts.push(headers.join(','));

    // Data rows
    for (const record of section.records) {
      const row = headers.map((h) => {
        const val = record[h];
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
        return `"${str.replace(/"/g, '""')}"`;
      });
      parts.push(row.join(','));
    }

    parts.push(''); // blank line between sections
  }

  return parts.join('\n');
}
