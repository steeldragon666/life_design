import { describe, it, expect, vi } from 'vitest';
import {
  buildClinicalExport,
  formatClinicalJSON,
  formatClinicalCSV,
  anonymizeUserId,
  isShareTokenValid,
  generateShareToken,
  type ClinicalExportOptions,
  type ClinicalExportData,
  type ClinicalSection,
  type ClinicalRawData,
} from '../clinical-export';

// ---------------------------------------------------------------------------
// anonymizeUserId
// ---------------------------------------------------------------------------

describe('anonymizeUserId', () => {
  it('returns first 8 chars of a UUID', () => {
    expect(anonymizeUserId('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe('a1b2c3d4');
  });

  it('handles short input gracefully', () => {
    expect(anonymizeUserId('abc')).toBe('abc');
  });

  it('handles empty string', () => {
    expect(anonymizeUserId('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// isShareTokenValid
// ---------------------------------------------------------------------------

describe('isShareTokenValid', () => {
  it('returns true for a future date', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(isShareTokenValid(future)).toBe(true);
  });

  it('returns false for a past date', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(isShareTokenValid(past)).toBe(false);
  });

  it('returns false for an invalid date string', () => {
    expect(isShareTokenValid('not-a-date')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// generateShareToken
// ---------------------------------------------------------------------------

describe('generateShareToken', () => {
  it('produces a UUID-like token', () => {
    const { token } = generateShareToken();
    // UUID v4 pattern
    expect(token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('produces an expiry roughly 7 days in the future', () => {
    const before = Date.now();
    const { expiresAt } = generateShareToken();
    const after = Date.now();

    const expiry = new Date(expiresAt).getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expiry).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expiry).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });
});

// ---------------------------------------------------------------------------
// buildClinicalExport
// ---------------------------------------------------------------------------

describe('buildClinicalExport', () => {
  const baseOptions: ClinicalExportOptions = {
    includePhq9: false,
    includeGad7: false,
    includeMoodTrends: false,
    includeSleepQuality: false,
    includeJournalAnalysis: false,
    includeHrvMetrics: false,
  };

  const sampleData: ClinicalRawData = {
    userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    phq9: [
      { id: '1', instrument: 'phq9', total_score: 12, severity: 'moderate', responses: {}, administered_at: '2026-01-15T10:00:00Z' },
      { id: '2', instrument: 'phq9', total_score: 8, severity: 'mild', responses: {}, administered_at: '2026-02-15T10:00:00Z' },
    ],
    gad7: [
      { id: '3', instrument: 'gad7', total_score: 10, severity: 'moderate', responses: {}, administered_at: '2026-01-20T10:00:00Z' },
    ],
    mood: [
      { id: 'm1', mood_score: 7, energy_level: 6, stress_level: 3, created_at: '2026-01-10T08:00:00Z' },
    ],
    sleep: [
      { id: 's1', sleep_quality: 4, sleep_hours: 7.5, created_at: '2026-01-10T22:00:00Z' },
    ],
    journal: [
      { id: 'j1', sentiment_score: 0.6, word_count: 250, themes: ['anxiety', 'work'], created_at: '2026-01-12T09:00:00Z' },
    ],
    hrv: [
      { id: 'h1', rmssd: 42.5, sdnn: 55.0, stress_index: 3.2, recorded_at: '2026-01-11T07:00:00Z' },
    ],
  };

  it('includes only requested sections', () => {
    const options: ClinicalExportOptions = { ...baseOptions, includePhq9: true, includeGad7: true };
    const result = buildClinicalExport(options, sampleData);

    const titles = result.sections.map((s) => s.title);
    expect(titles).toContain('PHQ-9 Depression Screening');
    expect(titles).toContain('GAD-7 Anxiety Screening');
    expect(titles).not.toContain('Mood Trends');
    expect(titles).not.toContain('Sleep Quality');
  });

  it('handles empty data gracefully', () => {
    const options: ClinicalExportOptions = { ...baseOptions, includePhq9: true };
    const emptyData: ClinicalRawData = {
      userId: 'a1b2c3d4-xxxx',
      phq9: [],
      gad7: [],
      mood: [],
      sleep: [],
      journal: [],
      hrv: [],
    };
    const result = buildClinicalExport(options, emptyData);

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].records).toHaveLength(0);
    expect(result.sections[0].summary).toHaveProperty('totalAssessments', 0);
  });

  it('anonymizes user ID in output', () => {
    const options: ClinicalExportOptions = { ...baseOptions, includePhq9: true };
    const result = buildClinicalExport(options, sampleData);
    expect(result.patientId).toBe('a1b2c3d4');
    expect(result.patientId).not.toContain('-');
  });

  it('filters by dateRange when provided', () => {
    const options: ClinicalExportOptions = {
      ...baseOptions,
      includePhq9: true,
      dateRange: { from: '2026-02-01', to: '2026-03-01' },
    };
    const result = buildClinicalExport(options, sampleData);

    // Only the Feb record should be included
    expect(result.sections[0].records).toHaveLength(1);
    expect((result.sections[0].records[0] as { total_score: number }).total_score).toBe(8);
  });

  it('includes journal analysis section when requested', () => {
    const options: ClinicalExportOptions = { ...baseOptions, includeJournalAnalysis: true };
    const result = buildClinicalExport(options, sampleData);

    const titles = result.sections.map((s) => s.title);
    expect(titles).toContain('Journal Linguistic Analysis');
    expect(result.sections[0].type).toBe('journal');
  });

  it('includes HRV metrics section when requested', () => {
    const options: ClinicalExportOptions = { ...baseOptions, includeHrvMetrics: true };
    const result = buildClinicalExport(options, sampleData);

    const titles = result.sections.map((s) => s.title);
    expect(titles).toContain('Heart Rate Variability');
    expect(result.sections[0].type).toBe('physiological');
  });

  it('sets correct dateRange in output', () => {
    const options: ClinicalExportOptions = { ...baseOptions, includePhq9: true };
    const result = buildClinicalExport(options, sampleData);
    expect(result.dateRange).toBeDefined();
    expect(result.dateRange.from).toBeDefined();
    expect(result.dateRange.to).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// formatClinicalJSON
// ---------------------------------------------------------------------------

describe('formatClinicalJSON', () => {
  const exportData: ClinicalExportData = {
    exportedAt: '2026-04-01T00:00:00Z',
    patientId: 'a1b2c3d4',
    dateRange: { from: '2026-01-01', to: '2026-04-01' },
    sections: [
      {
        title: 'PHQ-9 Depression Screening',
        type: 'screening',
        summary: { totalAssessments: 1 },
        records: [{ score: 12 }],
      },
    ],
  };

  it('produces valid JSON', () => {
    const json = formatClinicalJSON(exportData);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('includes metadata header fields', () => {
    const json = formatClinicalJSON(exportData);
    const parsed = JSON.parse(json);
    expect(parsed._metadata).toBeDefined();
    expect(parsed._metadata.format).toBe('clinical_export');
    expect(parsed._metadata.version).toBe('1.0');
    expect(parsed._metadata.generatedAt).toBe(exportData.exportedAt);
  });

  it('includes the export data', () => {
    const json = formatClinicalJSON(exportData);
    const parsed = JSON.parse(json);
    expect(parsed.patientId).toBe('a1b2c3d4');
    expect(parsed.sections).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// formatClinicalCSV
// ---------------------------------------------------------------------------

describe('formatClinicalCSV', () => {
  const exportData: ClinicalExportData = {
    exportedAt: '2026-04-01T00:00:00Z',
    patientId: 'a1b2c3d4',
    dateRange: { from: '2026-01-01', to: '2026-04-01' },
    sections: [
      {
        title: 'PHQ-9 Depression Screening',
        type: 'screening',
        summary: { totalAssessments: 2 },
        records: [
          { date: '2026-01-15', score: 12, severity: 'moderate' },
          { date: '2026-02-15', score: 8, severity: 'mild' },
        ],
      },
      {
        title: 'Mood Trends',
        type: 'mood',
        summary: { totalEntries: 1 },
        records: [
          { date: '2026-01-10', mood_score: 7, energy_level: 6 },
        ],
      },
    ],
  };

  it('produces valid CSV with headers', () => {
    const csv = formatClinicalCSV(exportData);
    const lines = csv.split('\n').filter((l) => l.trim().length > 0);
    // Should have section headers, column headers, and data rows
    expect(lines.length).toBeGreaterThan(0);
    // First non-empty line should be a section header
    expect(lines[0]).toContain('PHQ-9 Depression Screening');
  });

  it('handles multiple sections with separators', () => {
    const csv = formatClinicalCSV(exportData);
    expect(csv).toContain('PHQ-9 Depression Screening');
    expect(csv).toContain('Mood Trends');
  });

  it('handles empty sections', () => {
    const emptyData: ClinicalExportData = {
      exportedAt: '2026-04-01T00:00:00Z',
      patientId: 'test1234',
      dateRange: { from: '2026-01-01', to: '2026-04-01' },
      sections: [
        {
          title: 'Empty Section',
          type: 'screening',
          summary: {},
          records: [],
        },
      ],
    };
    const csv = formatClinicalCSV(emptyData);
    expect(csv).toContain('Empty Section');
    // Should not throw
  });
});
