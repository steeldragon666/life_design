'use client';

import { useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExportFormat = 'clinical_json' | 'clinical_csv';

interface DataInclusion {
  phq9: boolean;
  gad7: boolean;
  moodTrends: boolean;
  sleepQuality: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DATA_OPTIONS: { key: keyof DataInclusion; label: string; description: string }[] = [
  { key: 'phq9', label: 'PHQ-9 Depression Screening', description: 'Patient Health Questionnaire scores and trends' },
  { key: 'gad7', label: 'GAD-7 Anxiety Screening', description: 'Generalised Anxiety Disorder assessment scores' },
  { key: 'moodTrends', label: 'Mood Trends', description: 'Daily mood, energy, and stress levels over time' },
  { key: 'sleepQuality', label: 'Sleep Quality', description: 'Sleep hours and quality ratings' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ClinicalExport() {
  const [include, setInclude] = useState<DataInclusion>({
    phq9: true,
    gad7: true,
    moodTrends: false,
    sleepQuality: false,
  });
  const [format, setFormat] = useState<ExportFormat>('clinical_json');
  const [isExporting, setIsExporting] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareExpiresAt, setShareExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasSelection = Object.values(include).some(Boolean);

  const handleToggle = useCallback((key: keyof DataInclusion) => {
    setInclude((prev) => ({ ...prev, [key]: !prev[key] }));
    // Clear previous share link when selections change
    setShareToken(null);
    setShareExpiresAt(null);
    setError(null);
  }, []);

  const handleExport = useCallback(async () => {
    if (!hasSelection) return;

    setIsExporting(true);
    setError(null);
    setShareToken(null);

    try {
      const res = await fetch('/api/export/clinical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, include }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error ?? 'Export failed');
      }

      if (format === 'clinical_csv') {
        // Download the CSV file
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clinical-export-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const token = res.headers.get('X-Share-Token');
        const expires = res.headers.get('X-Share-Expires-At');
        if (token) setShareToken(token);
        if (expires) setShareExpiresAt(expires);
      } else {
        const result = await res.json();
        // Download JSON
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clinical-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (result.shareToken) setShareToken(result.shareToken);
        if (result.shareExpiresAt) setShareExpiresAt(result.shareExpiresAt);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [format, include, hasSelection]);

  const shareUrl = shareToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/shared/clinical/${shareToken}`
    : null;

  const handleCopyLink = useCallback(() => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
    }
  }, [shareUrl]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-stone-900">
          Clinical Data Export
        </h3>
        <p className="mt-1 text-sm text-stone-500">
          Export your clinical screening data for sharing with your therapist or
          healthcare provider. Your data is encrypted and only accessible via the
          shareable link you generate.
        </p>
      </div>

      {/* Privacy notice */}
      <div className="rounded-lg border border-sage-200 bg-sage-50 p-4">
        <div className="flex items-start gap-3">
          <svg
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-sage-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-sage-800">
              Your privacy is protected
            </p>
            <p className="mt-1 text-sm text-sage-600">
              You control exactly which data to include. Shareable links expire
              after 7 days. Only you can generate exports of your data.
            </p>
          </div>
        </div>
      </div>

      {/* Data selection */}
      <fieldset>
        <legend className="mb-3 text-sm font-medium text-stone-700">
          Select data to include
        </legend>
        <div className="space-y-3">
          {DATA_OPTIONS.map((option) => (
            <label
              key={option.key}
              className={[
                'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all',
                include[option.key]
                  ? 'border-sage-300 bg-sage-50/50'
                  : 'border-stone-200 bg-white hover:border-stone-300',
              ].join(' ')}
            >
              <input
                type="checkbox"
                checked={include[option.key]}
                onChange={() => handleToggle(option.key)}
                className="mt-0.5 h-4 w-4 rounded border-stone-300 text-sage-600 focus:ring-sage-500"
              />
              <div>
                <span className="text-sm font-medium text-stone-900">
                  {option.label}
                </span>
                <p className="text-sm text-stone-500">{option.description}</p>
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Format selector */}
      <div>
        <label
          htmlFor="export-format"
          className="mb-2 block text-sm font-medium text-stone-700"
        >
          Export format
        </label>
        <select
          id="export-format"
          value={format}
          onChange={(e) => setFormat(e.target.value as ExportFormat)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500"
        >
          <option value="clinical_json">JSON (structured data)</option>
          <option value="clinical_csv">CSV (spreadsheet-compatible)</option>
        </select>
      </div>

      {/* Export button */}
      <button
        onClick={handleExport}
        disabled={!hasSelection || isExporting}
        className={[
          'w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
          hasSelection && !isExporting
            ? 'bg-sage-600 text-white hover:bg-sage-700 active:bg-sage-800'
            : 'cursor-not-allowed bg-stone-200 text-stone-400',
        ].join(' ')}
      >
        {isExporting ? 'Exporting...' : 'Export Clinical Data'}
      </button>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Shareable link */}
      {shareUrl && (
        <div className="rounded-lg border border-sage-200 bg-sage-50 p-4">
          <h4 className="text-sm font-medium text-stone-900">
            Shareable link generated
          </h4>
          <p className="mt-1 text-xs text-stone-500">
            This link expires on{' '}
            {shareExpiresAt
              ? new Date(shareExpiresAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : '7 days from now'}
            . Share it with your therapist to give them read-only access.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-700 focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="rounded-md bg-sage-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sage-700"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
