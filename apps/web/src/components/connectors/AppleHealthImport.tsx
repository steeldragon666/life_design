'use client';

/**
 * AppleHealthImport.tsx
 *
 * Web-based fallback for importing Apple Health data when HealthKit native APIs
 * are not available (i.e. when the user is on the web dashboard rather than the
 * iOS app).
 *
 * Flow:
 *  1. User drags or selects their Apple Health export.xml file.
 *  2. The component parses the XML with parseAppleHealthExport.
 *  3. A preview shows record counts per type and the date range found.
 *  4. On confirmation, features are extracted and stored via Supabase.
 *  5. A success summary is displayed.
 *
 * Supported file types:
 *  - export.xml  — the raw XML file extracted from Apple's export.zip
 *
 * Note: Apple Health export.zip files are often 500 MB+. To avoid browser
 * memory pressure we accept the extracted export.xml directly rather than
 * attempting to decompress zip archives in-browser.
 */

import { useState, useCallback, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  parseAppleHealthExport,
  DEFAULT_READ_TYPES,
  extractAppleHealthFeatures,
  storeFeatures,
} from '@life-design/core';
import type {
  AppleHealthExport,
  AppleHealthData,
} from '@life-design/core';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ImportStep = 'idle' | 'parsing' | 'preview' | 'importing' | 'done' | 'error';

interface RecordTypeSummary {
  type: string;
  /** Short display label derived from the HealthKit type identifier. */
  label: string;
  count: number;
}

interface ParsedPreview {
  exportDate: Date;
  recordTypes: RecordTypeSummary[];
  earliestDate: Date;
  latestDate: Date;
  totalRecords: number;
}

interface ImportSummary {
  featuresStored: number;
  daysImported: number;
  durationMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Strips the HKQuantityTypeIdentifier / HKCategoryTypeIdentifier prefix for display. */
function humaniseType(type: string): string {
  return type
    .replace(/^HKQuantityTypeIdentifier/, '')
    .replace(/^HKCategoryTypeIdentifier/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2');
}

/**
 * Converts a parsed AppleHealthExport into a daily-aggregated list of
 * AppleHealthData snapshots suitable for feature extraction.
 *
 * Each record's startDate is used as the day key.
 * Cumulative metrics (steps, active energy) are summed.
 * Instantaneous metrics (HR, HRV, SpO2, respiratory rate) are averaged.
 * Sleep records are summed into total hours.
 */
function aggregateExportByDay(exportData: AppleHealthExport): AppleHealthData[] {
  type DayAccumulator = {
    restingHrSum: number; restingHrCount: number;
    hrvSum: number; hrvCount: number;
    sleepHours: number;
    steps: number;
    activeEnergy: number;
    respiratorySum: number; respiratoryCount: number;
    bloodOxygenSum: number; bloodOxygenCount: number;
    date: string;
  };

  const byDay = new Map<string, DayAccumulator>();

  function getDay(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  function ensureDay(day: string): DayAccumulator {
    if (!byDay.has(day)) {
      byDay.set(day, {
        restingHrSum: 0, restingHrCount: 0,
        hrvSum: 0, hrvCount: 0,
        sleepHours: 0,
        steps: 0,
        activeEnergy: 0,
        respiratorySum: 0, respiratoryCount: 0,
        bloodOxygenSum: 0, bloodOxygenCount: 0,
        date: day,
      });
    }
    return byDay.get(day)!;
  }

  for (const rec of exportData.records) {
    const day = getDay(rec.startDate);
    const acc = ensureDay(day);

    switch (rec.type) {
      case 'HKQuantityTypeIdentifierRestingHeartRate':
        acc.restingHrSum += rec.value;
        acc.restingHrCount += 1;
        break;
      case 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN':
        acc.hrvSum += rec.value;
        acc.hrvCount += 1;
        break;
      case 'HKCategoryTypeIdentifierSleepAnalysis': {
        const durationHours =
          Math.max(0, rec.endDate.getTime() - rec.startDate.getTime()) / 3_600_000;
        acc.sleepHours += durationHours;
        break;
      }
      case 'HKQuantityTypeIdentifierStepCount':
        acc.steps += rec.value;
        break;
      case 'HKQuantityTypeIdentifierActiveEnergyBurned':
        acc.activeEnergy += rec.value;
        break;
      case 'HKQuantityTypeIdentifierRespiratoryRate':
        acc.respiratorySum += rec.value;
        acc.respiratoryCount += 1;
        break;
      case 'HKQuantityTypeIdentifierOxygenSaturation': {
        // Normalise 0-1 fraction to 0-100 percentage.
        const pct = rec.value <= 1 ? rec.value * 100 : rec.value;
        acc.bloodOxygenSum += pct;
        acc.bloodOxygenCount += 1;
        break;
      }
    }
  }

  return Array.from(byDay.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((acc) => {
      const snapshot: AppleHealthData = {
        recordedAt: new Date(`${acc.date}T23:59:59.000Z`),
      };
      if (acc.restingHrCount > 0) snapshot.restingHeartRate = acc.restingHrSum / acc.restingHrCount;
      if (acc.hrvCount > 0) snapshot.hrvMs = acc.hrvSum / acc.hrvCount;
      if (acc.sleepHours > 0) snapshot.sleepHours = acc.sleepHours;
      if (acc.steps > 0) snapshot.steps = acc.steps;
      if (acc.activeEnergy > 0) snapshot.activeEnergyKcal = acc.activeEnergy;
      if (acc.respiratoryCount > 0) snapshot.respiratoryRate = acc.respiratorySum / acc.respiratoryCount;
      if (acc.bloodOxygenCount > 0) snapshot.bloodOxygen = acc.bloodOxygenSum / acc.bloodOxygenCount;
      return snapshot;
    });
}

/** Builds the preview summary from a parsed export. */
function buildPreview(exportData: AppleHealthExport): ParsedPreview {
  const typeCounts = new Map<string, number>();
  let earliest = new Date(8_640_000_000_000_000);
  let latest = new Date(0);

  for (const rec of exportData.records) {
    typeCounts.set(rec.type, (typeCounts.get(rec.type) ?? 0) + 1);
    if (rec.startDate < earliest) earliest = rec.startDate;
    if (rec.startDate > latest) latest = rec.startDate;
  }

  const recognisedSet = new Set(DEFAULT_READ_TYPES as string[]);
  const recordTypes: RecordTypeSummary[] = Array.from(typeCounts.entries())
    .filter(([type]) => recognisedSet.has(type))
    .map(([type, count]) => ({ type, label: humaniseType(type), count }))
    .sort((a, b) => b.count - a.count);

  return {
    exportDate: exportData.exportDate,
    recordTypes,
    earliestDate: exportData.records.length > 0 ? earliest : new Date(),
    latestDate: exportData.records.length > 0 ? latest : new Date(),
    totalRecords: exportData.records.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface AppleHealthImportProps {
  /** UUID of the currently authenticated user. */
  userId: string;
  /** Optional callback fired after a successful import. */
  onImportComplete?: (summary: ImportSummary) => void;
}

/**
 * AppleHealthImport
 *
 * A drag-and-drop file import panel for Apple Health export.xml files.
 * Designed for the web dashboard as a fallback when HealthKit native APIs
 * are unavailable. Styled with Tailwind using the app's dark theme palette
 * (bg-slate-900 base, indigo accents).
 *
 * @param props.userId            - Authenticated user UUID for feature storage.
 * @param props.onImportComplete  - Optional callback called with summary on success.
 */
export default function AppleHealthImport({ userId, onImportComplete }: AppleHealthImportProps) {
  const [step, setStep] = useState<ImportStep>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [preview, setPreview] = useState<ParsedPreview | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsedExport, setParsedExport] = useState<AppleHealthExport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialise the Supabase browser client lazily so it is only created once.
  const supabaseRef = useRef<ReturnType<typeof createBrowserClient> | null>(null);
  function getSupabase() {
    if (!supabaseRef.current) {
      supabaseRef.current = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
    }
    return supabaseRef.current;
  }

  // ── File processing ────────────────────────────────────────────────────────

  const processFile = useCallback(async (file: File) => {
    // Validate file type.
    if (!file.name.endsWith('.xml') && file.type !== 'text/xml' && file.type !== 'application/xml') {
      setErrorMessage('Please select the export.xml file extracted from your Apple Health export.zip.');
      setStep('error');
      return;
    }

    setStep('parsing');
    setParseProgress(10);
    setErrorMessage(null);

    try {
      // Read file contents.
      const text = await file.text();
      setParseProgress(40);

      // Parse the XML export.
      const exportData = parseAppleHealthExport(text);
      setParseProgress(80);

      // Build the preview summary.
      const previewData = buildPreview(exportData);
      setParseProgress(100);

      setParsedExport(exportData);
      setPreview(previewData);
      setStep('preview');
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to parse the Apple Health export file.',
      );
      setStep('error');
    }
  }, []);

  // ── Drag and drop handlers ─────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) void processFile(file);
    },
    [processFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void processFile(file);
    },
    [processFile],
  );

  // ── Import handler ─────────────────────────────────────────────────────────

  const handleImport = useCallback(async () => {
    if (!parsedExport) return;

    setStep('importing');
    const startMs = Date.now();

    try {
      const dailySnapshots = aggregateExportByDay(parsedExport);
      const supabase = getSupabase();

      let totalFeatures = 0;

      // Process days in batches of 30 to avoid holding an enormous features
      // array in memory for very long export periods.
      const BATCH_SIZE = 30;
      for (let i = 0; i < dailySnapshots.length; i += BATCH_SIZE) {
        const batch = dailySnapshots.slice(i, i + BATCH_SIZE);
        const batchFeatures = batch.flatMap((snapshot) =>
          extractAppleHealthFeatures(snapshot),
        );
        await storeFeatures(supabase, userId, batchFeatures);
        totalFeatures += batchFeatures.length;
      }

      const importSummary: ImportSummary = {
        featuresStored: totalFeatures,
        daysImported: dailySnapshots.length,
        durationMs: Date.now() - startMs,
      };

      setSummary(importSummary);
      setStep('done');
      onImportComplete?.(importSummary);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to store features. Please try again.',
      );
      setStep('error');
    }
  }, [parsedExport, userId, onImportComplete]);

  // ── Reset ──────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setStep('idle');
    setPreview(null);
    setSummary(null);
    setErrorMessage(null);
    setParsedExport(null);
    setParseProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────────────────

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' });

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white">Import Apple Health Data</h2>
        <p className="mt-1 text-sm text-slate-400">
          Export your data from the Health app on iPhone, then upload the{' '}
          <code className="text-indigo-400">export.xml</code> file below.
        </p>
      </div>

      {/* Step: idle — drop zone */}
      {(step === 'idle' || step === 'error') && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Drop zone for Apple Health export.xml file"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          className={[
            'relative flex flex-col items-center justify-center gap-3',
            'rounded-xl border-2 border-dashed p-10 text-center cursor-pointer',
            'transition-colors duration-150',
            isDragging
              ? 'border-indigo-500 bg-indigo-950/40'
              : 'border-slate-700 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800',
          ].join(' ')}
        >
          {/* Upload icon */}
          <svg
            className="h-10 w-10 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>

          <div>
            <p className="text-sm font-medium text-slate-200">
              {isDragging ? 'Drop your file here' : 'Drag and drop export.xml'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              or click to browse — XML files only
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xml,text/xml,application/xml"
            onChange={handleFileInput}
            className="sr-only"
            aria-hidden="true"
          />
        </div>
      )}

      {/* Error message */}
      {step === 'error' && errorMessage && (
        <div className="rounded-lg bg-red-950/50 border border-red-800 px-4 py-3 text-sm text-red-300">
          <span className="font-medium">Import failed:</span> {errorMessage}
        </div>
      )}

      {/* Step: parsing — progress bar */}
      {step === 'parsing' && (
        <div className="rounded-xl bg-slate-800 border border-slate-700 p-6 space-y-3">
          <p className="text-sm font-medium text-slate-200">Parsing export file...</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${parseProgress}%` }}
              role="progressbar"
              aria-valuenow={parseProgress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <p className="text-xs text-slate-500">
            This may take a moment for large export files.
          </p>
        </div>
      )}

      {/* Step: preview */}
      {step === 'preview' && preview && (
        <div className="rounded-xl bg-slate-800 border border-slate-700 divide-y divide-slate-700">
          {/* Summary header */}
          <div className="px-5 py-4 space-y-1">
            <h3 className="text-sm font-semibold text-white">Export Preview</h3>
            <p className="text-xs text-slate-400">
              Exported {formatDate(preview.exportDate)} &middot;{' '}
              {preview.totalRecords.toLocaleString()} records found
            </p>
            <p className="text-xs text-slate-400">
              Date range: {formatDate(preview.earliestDate)} &ndash;{' '}
              {formatDate(preview.latestDate)}
            </p>
          </div>

          {/* Record type breakdown */}
          {preview.recordTypes.length > 0 ? (
            <ul className="px-5 py-3 space-y-2">
              {preview.recordTypes.map(({ type, label, count }) => (
                <li key={type} className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{label}</span>
                  <span className="tabular-nums text-slate-400">
                    {count.toLocaleString()} records
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-3 text-sm text-slate-500">
              No supported health metrics found in this export.
            </p>
          )}

          {/* Actions */}
          <div className="px-5 py-4 flex gap-3">
            <button
              type="button"
              onClick={() => void handleImport()}
              disabled={preview.recordTypes.length === 0}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white
                         hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50
                         transition-colors duration-150"
            >
              Import {preview.totalRecords.toLocaleString()} records
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium
                         text-slate-300 hover:border-slate-500 hover:text-white
                         transition-colors duration-150"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Step: importing */}
      {step === 'importing' && (
        <div className="rounded-xl bg-slate-800 border border-slate-700 p-6 text-center space-y-3">
          {/* Spinner */}
          <svg
            className="mx-auto h-8 w-8 animate-spin text-indigo-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="text-sm font-medium text-slate-200">Extracting and storing features...</p>
          <p className="text-xs text-slate-500">Please keep this tab open.</p>
        </div>
      )}

      {/* Step: done — success summary */}
      {step === 'done' && summary && (
        <div className="rounded-xl bg-slate-800 border border-emerald-800/60 divide-y divide-slate-700">
          <div className="px-5 py-4 flex items-center gap-3">
            {/* Checkmark icon */}
            <div className="flex-shrink-0 rounded-full bg-emerald-900/60 p-2">
              <svg
                className="h-5 w-5 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Import complete</h3>
              <p className="text-xs text-slate-400">
                Your health data has been processed and stored.
              </p>
            </div>
          </div>

          <ul className="px-5 py-3 space-y-1 text-sm">
            <li className="flex justify-between">
              <span className="text-slate-400">Days imported</span>
              <span className="font-medium text-white">{summary.daysImported.toLocaleString()}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-400">Features stored</span>
              <span className="font-medium text-white">{summary.featuresStored.toLocaleString()}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-400">Processing time</span>
              <span className="font-medium text-white">
                {(summary.durationMs / 1000).toFixed(1)}s
              </span>
            </li>
          </ul>

          <div className="px-5 py-4">
            <button
              type="button"
              onClick={handleReset}
              className="w-full rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium
                         text-slate-300 hover:border-slate-500 hover:text-white
                         transition-colors duration-150"
            >
              Import another file
            </button>
          </div>
        </div>
      )}

      {/* How-to instructions */}
      {step === 'idle' && (
        <details className="rounded-lg bg-slate-800/40 border border-slate-700/50 text-sm">
          <summary className="cursor-pointer select-none px-4 py-3 text-slate-400 hover:text-slate-200 transition-colors">
            How to export from the Health app
          </summary>
          <ol className="px-4 pb-4 pt-1 space-y-1 text-slate-500 list-decimal list-inside marker:text-slate-600">
            <li>Open the Health app on your iPhone.</li>
            <li>Tap your profile picture in the top-right corner.</li>
            <li>Scroll down and tap <strong className="text-slate-400">Export All Health Data</strong>.</li>
            <li>
              Share the resulting <code className="text-indigo-400">export.zip</code> to your
              computer, then extract it.
            </li>
            <li>
              Upload the <code className="text-indigo-400">export.xml</code> file found inside
              the extracted folder.
            </li>
          </ol>
        </details>
      )}
    </div>
  );
}
