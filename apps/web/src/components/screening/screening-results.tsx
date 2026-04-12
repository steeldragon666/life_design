'use client';

import type { SeverityLevel } from '@life-design/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScreeningResultRow {
  id?: string;
  instrument: string;
  total: number;
  severity: string;
  administeredAt?: string;
}

interface ScreeningResultsProps {
  results: ScreeningResultRow[];
}

// ---------------------------------------------------------------------------
// Severity badge styling
// ---------------------------------------------------------------------------

const SEVERITY_STYLES: Record<SeverityLevel, { bg: string; text: string; label: string }> = {
  minimal: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Minimal' },
  mild: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Mild' },
  moderate: { bg: 'bg-orange-50', text: 'text-orange-700', label: 'Moderate' },
  moderately_severe: { bg: 'bg-red-50', text: 'text-red-400', label: 'Moderately Severe' },
  severe: { bg: 'bg-red-100', text: 'text-red-600', label: 'Severe' },
};

function SeverityBadge({ severity }: { severity: string }) {
  const style = SEVERITY_STYLES[severity as SeverityLevel] ?? {
    bg: 'bg-stone-100',
    text: 'text-stone-600',
    label: severity,
  };

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  );
}

const INSTRUMENT_LABELS: Record<string, string> = {
  phq9: 'PHQ-9',
  gad7: 'GAD-7',
  who5: 'WHO-5',
};

const INSTRUMENT_MAX: Record<string, number> = {
  phq9: 27,
  gad7: 21,
  who5: 25,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScreeningResults({ results }: ScreeningResultsProps) {
  if (results.length === 0) {
    return (
      <p className="text-sm text-stone-400 italic">No screening results yet.</p>
    );
  }

  const latest = results[0];
  const history = results.slice(1);

  return (
    <div className="space-y-4">
      {/* Latest result — prominent */}
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-stone-400 uppercase tracking-wider font-medium">
            Latest {INSTRUMENT_LABELS[latest.instrument] ?? latest.instrument}
          </span>
          <SeverityBadge severity={latest.severity} />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-semibold text-stone-800">{latest.total}</span>
          <span className="text-sm text-stone-400">
            / {INSTRUMENT_MAX[latest.instrument] ?? '?'}
          </span>
        </div>
        {latest.administeredAt && (
          <p className="text-xs text-stone-400 mt-1">
            {new Date(latest.administeredAt).toLocaleDateString('en-AU', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        )}
      </div>

      {/* Trend — simple list */}
      {history.length > 0 && (
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wider font-medium mb-2">
            History
          </p>
          <div className="space-y-1.5">
            {history.map((r, i) => (
              <div
                key={r.id ?? i}
                className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-stone-700">
                    {r.total}
                    <span className="text-stone-400 font-normal">
                      /{INSTRUMENT_MAX[r.instrument] ?? '?'}
                    </span>
                  </span>
                  <SeverityBadge severity={r.severity} />
                </div>
                {r.administeredAt && (
                  <span className="text-xs text-stone-400 font-mono">
                    {new Date(r.administeredAt).toLocaleDateString('en-AU', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
