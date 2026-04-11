'use client';

import { useState } from 'react';
import type { FeatureWeight, NormalisedMLFeatures } from '@/lib/ml/types';

// ---------------------------------------------------------------------------
// Human-readable feature labels
// ---------------------------------------------------------------------------

const FEATURE_LABELS: Record<string, string> = {
  sleep_duration_score: 'sleep duration',
  sleep_quality_score: 'sleep quality',
  physical_strain: 'physical activity',
  recovery_status: 'recovery',
  meeting_load: 'meeting load',
  context_switching_penalty: 'context switching',
  deep_work_opportunity: 'deep work time',
  after_hours_work: 'after-hours work',
  digital_fatigue: 'screen time',
  doomscroll_index: 'doomscrolling',
  audio_valence: 'music mood',
  audio_energy: 'music energy',
};

// Design tokens (CSS variables from @theme)
const SAGE = 'var(--color-sage-500)';
const MUTED = '#7D756A';
const BG = 'var(--color-stone-100)';
const BORDER = 'var(--color-stone-200)';
const DARK = 'var(--color-stone-900)';

// ---------------------------------------------------------------------------
// SHAP contribution type
// ---------------------------------------------------------------------------

export interface ShapContribution {
  feature: string;
  value: number;
  shap_value: number;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ExplainabilityTooltipProps {
  weights: FeatureWeight[];
  /** Optional SHAP explanations — when provided, shown as a plain-language summary. */
  shapContributions?: ShapContribution[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function humanLabel(featureKey: string): string {
  return FEATURE_LABELS[featureKey] || featureKey.replace(/_/g, ' ');
}

/** Build a plain-language sentence from the top SHAP contributors. */
function buildShapSummary(contributions: ShapContribution[]): string {
  const top = [...contributions]
    .sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value))
    .slice(0, 3);

  if (top.length === 0) return '';

  const boosters = top.filter((c) => c.shap_value > 0);
  const draggers = top.filter((c) => c.shap_value < 0);

  const parts: string[] = [];

  if (boosters.length > 0) {
    const labels = boosters.map(
      (c) => `${humanLabel(c.feature)} (+${c.shap_value.toFixed(1)})`,
    );
    parts.push(
      `Your ${labels.join(' and ')} ${boosters.length === 1 ? 'is' : 'are'} boosting your predicted score`,
    );
  }

  if (draggers.length > 0) {
    const labels = draggers.map(
      (c) => `${humanLabel(c.feature)} (${c.shap_value.toFixed(1)})`,
    );
    parts.push(
      `${humanLabel(draggers[0].feature) === labels[0] ? 'Your ' : ''}${labels.join(' and ')} ${draggers.length === 1 ? 'is' : 'are'} pulling it down`,
    );
  }

  return parts.join(', while ') + '.';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ExplainabilityTooltip({
  weights,
  shapContributions,
}: ExplainabilityTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Show top 3 weights sorted by absolute magnitude
  const topWeights = [...weights]
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, 3);

  if (topWeights.length === 0 && (!shapContributions || shapContributions.length === 0)) {
    return null;
  }

  const shapSummary = shapContributions ? buildShapSummary(shapContributions) : '';

  // Top 3 SHAP contributions for the detailed list
  const topShap = shapContributions
    ? [...shapContributions]
        .sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value))
        .slice(0, 3)
    : [];

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onBlur={() => setIsOpen(false)}
        onKeyDown={(e) => { if (e.key === 'Escape') setIsOpen(false); }}
        className="inline-flex items-center justify-center rounded-full transition-colors"
        style={{
          width: 18,
          height: 18,
          fontSize: 11,
          fontWeight: 600,
          backgroundColor: BG,
          color: MUTED,
          border: `1px solid ${BORDER}`,
        }}
        aria-label="Why this prediction?"
        aria-describedby="explainability-tooltip-panel"
        title="Why this prediction?"
      >
        ?
      </button>

      {isOpen && (
        <div
          id="explainability-tooltip-panel"
          role="tooltip"
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-xl p-3 shadow-lg"
          style={{
            backgroundColor: 'white',
            border: `1px solid ${BORDER}`,
          }}
        >
          {/* SHAP plain-language summary */}
          {shapSummary && (
            <p
              className="text-xs leading-relaxed mb-2"
              style={{ color: DARK }}
            >
              {shapSummary}
            </p>
          )}

          {/* SHAP detailed contributions */}
          {topShap.length > 0 && (
            <>
              <p
                className="text-[10px] uppercase tracking-wider font-medium mb-2"
                style={{ color: MUTED }}
              >
                Top factors
              </p>
              <ul className="space-y-1.5 mb-2">
                {topShap.map((c) => {
                  const isPositive = c.shap_value > 0;
                  return (
                    <li
                      key={c.feature}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: isPositive
                            ? SAGE
                            : 'var(--color-warm-400)',
                        }}
                      />
                      <span style={{ color: DARK }}>
                        {humanLabel(c.feature)}
                      </span>
                      <span
                        className="ml-auto font-mono text-[10px]"
                        style={{
                          color: isPositive ? SAGE : 'var(--color-warm-400)',
                        }}
                      >
                        {isPositive ? '+' : ''}
                        {c.shap_value.toFixed(1)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {/* Original weight-based influences (shown when no SHAP data or as fallback) */}
          {topWeights.length > 0 && topShap.length === 0 && (
            <>
              <p
                className="text-[10px] uppercase tracking-wider font-medium mb-2"
                style={{ color: MUTED }}
              >
                Top influences
              </p>
              <ul className="space-y-1.5">
                {topWeights.map((w) => {
                  const featureKey = w.feature as string;
                  const label =
                    w.humanLabel ||
                    FEATURE_LABELS[featureKey] ||
                    featureKey.replace(/_/g, ' ');
                  const isPositive = w.weight > 0;

                  return (
                    <li
                      key={featureKey}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: isPositive
                            ? SAGE
                            : 'var(--color-warm-400)',
                        }}
                      />
                      <span style={{ color: DARK }}>{label}</span>
                      <span
                        className="ml-auto font-mono text-[10px]"
                        style={{
                          color: isPositive ? SAGE : 'var(--color-warm-400)',
                        }}
                      >
                        {isPositive ? '+' : ''}
                        {(w.weight * 100).toFixed(0)}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {/* Arrow */}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `6px solid ${BORDER}`,
            }}
          />
        </div>
      )}
    </div>
  );
}
