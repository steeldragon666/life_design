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

// Design tokens
const SAGE = '#5A7F5A';
const MUTED = '#7D756A';
const BG = '#F5F3EF';
const BORDER = '#E8E4DD';
const DARK = '#1A1816';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ExplainabilityTooltipProps {
  weights: FeatureWeight[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ExplainabilityTooltip({ weights }: ExplainabilityTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Show top 3 weights sorted by absolute magnitude
  const topWeights = [...weights]
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, 3);

  if (topWeights.length === 0) return null;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
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
        title="Why this prediction?"
      >
        ?
      </button>

      {isOpen && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-xl p-3 shadow-lg"
          style={{
            backgroundColor: 'white',
            border: `1px solid ${BORDER}`,
          }}
        >
          <p
            className="text-[10px] uppercase tracking-wider font-medium mb-2"
            style={{ color: MUTED }}
          >
            Top influences
          </p>
          <ul className="space-y-1.5">
            {topWeights.map((w) => {
              const featureKey = w.feature as string;
              const humanLabel =
                w.humanLabel ||
                FEATURE_LABELS[featureKey] ||
                featureKey.replace(/_/g, ' ');
              const isPositive = w.weight > 0;

              return (
                <li key={featureKey} className="flex items-center gap-2 text-xs">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: isPositive ? SAGE : '#D4864A',
                    }}
                  />
                  <span style={{ color: DARK }}>{humanLabel}</span>
                  <span
                    className="ml-auto font-mono text-[10px]"
                    style={{ color: isPositive ? SAGE : '#D4864A' }}
                  >
                    {isPositive ? '+' : ''}
                    {(w.weight * 100).toFixed(0)}%
                  </span>
                </li>
              );
            })}
          </ul>
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
