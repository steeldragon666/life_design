'use client';

import { useCallback, useRef, useState } from 'react';
import type { Dimension } from '@life-design/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GhostSliderProps {
  dimension: Dimension;
  predictedScore: number;
  confidence: number;
  value: number | null;
  onChange: (value: number) => void;
  label: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN = 1;
const MAX = 5;
const TRACK_HEIGHT = 6;
const HANDLE_SIZE = 24;
const GHOST_SIZE = 20;
const HIGH_CONFIDENCE_THRESHOLD = 0.5;

// Design tokens (CSS variables from @theme)
const SAGE = 'var(--color-sage-500)';
const SAGE_LIGHT = 'color-mix(in srgb, var(--color-sage-500) 25%, transparent)';
const SAGE_GLOW = 'color-mix(in srgb, var(--color-sage-500) 38%, transparent)';
const MUTED = '#7D756A';
const BORDER = 'var(--color-stone-200)';
const BG = 'var(--color-stone-100)';
const DARK = 'var(--color-stone-900)';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a score (1-5) to a percentage (0-100) for positioning. */
function scoreToPercent(score: number): number {
  return ((Math.min(MAX, Math.max(MIN, score)) - MIN) / (MAX - MIN)) * 100;
}

// ---------------------------------------------------------------------------
// GhostSlider
// ---------------------------------------------------------------------------

export default function GhostSlider({
  dimension,
  predictedScore,
  confidence,
  value,
  onChange,
  label,
}: GhostSliderProps) {
  const [hasInteracted, setHasInteracted] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const isHighConfidence = confidence >= HIGH_CONFIDENCE_THRESHOLD;
  const ghostPercent = scoreToPercent(predictedScore);
  const userPercent = value !== null ? scoreToPercent(value) : null;

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Number(e.target.value);
      if (!hasInteracted) setHasInteracted(true);
      onChange(newValue);
    },
    [hasInteracted, onChange],
  );

  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      const score = Math.round(MIN + percent * (MAX - MIN));
      if (!hasInteracted) setHasInteracted(true);
      onChange(score);
    },
    [hasInteracted, onChange],
  );

  return (
    <div className="space-y-2" data-dimension={dimension}>
      {/* Label row */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: DARK }}>
          {label}
        </span>
        <span className="text-xs font-mono tabular-nums" style={{ color: MUTED }}>
          {value !== null ? value : '--'} / {MAX}
        </span>
      </div>

      {/* Track container */}
      <div
        ref={trackRef}
        className="relative cursor-pointer select-none"
        style={{ height: HANDLE_SIZE + 8, paddingTop: (HANDLE_SIZE + 8 - TRACK_HEIGHT) / 2 }}
        onClick={handleTrackClick}
      >
        {/* Track background */}
        <div
          className="absolute left-0 right-0 rounded-full"
          style={{
            height: TRACK_HEIGHT,
            backgroundColor: BG,
            border: `1px solid ${BORDER}`,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        />

        {/* Active fill (only when user has set a value) */}
        {value !== null && (
          <div
            className="absolute left-0 rounded-full transition-all duration-200"
            style={{
              height: TRACK_HEIGHT,
              width: `${userPercent}%`,
              backgroundColor: SAGE_LIGHT,
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          />
        )}

        {/* Ghost handle (AI prediction) */}
        <div
          className="absolute transition-all duration-300"
          style={{
            width: GHOST_SIZE,
            height: GHOST_SIZE,
            left: `calc(${ghostPercent}% - ${GHOST_SIZE / 2}px)`,
            top: '50%',
            transform: 'translateY(-50%)',
            borderRadius: '50%',
            backgroundColor: isHighConfidence ? SAGE_LIGHT : 'transparent',
            border: isHighConfidence
              ? `2px solid ${SAGE}80`
              : `2px dashed ${MUTED}60`,
            boxShadow: isHighConfidence
              ? `0 0 8px ${SAGE_GLOW}`
              : 'none',
            pointerEvents: 'none',
            zIndex: 1,
          }}
          title={`AI prediction: ${Math.round(predictedScore)} (${Math.round(confidence * 100)}% confident)`}
        >
          {/* Inner dot for ghost */}
          <div
            className="absolute"
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: isHighConfidence ? SAGE : `${MUTED}80`,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
        </div>

        {/* User handle (solid, appears on interaction) */}
        {value !== null && (
          <div
            className="absolute transition-all duration-200"
            style={{
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              left: `calc(${userPercent}% - ${HANDLE_SIZE / 2}px)`,
              top: '50%',
              transform: 'translateY(-50%)',
              borderRadius: '50%',
              backgroundColor: SAGE,
              border: '3px solid white',
              boxShadow: `0 2px 6px ${SAGE}40`,
              zIndex: 2,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Invisible range input for accessibility + drag */}
        <span id={`${dimension}-prediction`} className="sr-only">
          AI prediction: {Math.round(predictedScore)} out of {MAX} ({Math.round(confidence * 100)}% confidence)
        </span>
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={1}
          value={value ?? Math.round(predictedScore)}
          onChange={handleSliderChange}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ height: HANDLE_SIZE + 8, zIndex: 3, margin: 0 }}
          aria-label={`${label} score`}
          aria-describedby={`${dimension}-prediction`}
          aria-valuemin={MIN}
          aria-valuemax={MAX}
          aria-valuenow={value ?? undefined}
        />
      </div>

      {/* Scale labels */}
      <div className="flex justify-between px-0.5">
        <span className="text-[10px]" style={{ color: MUTED }}>
          {MIN}
        </span>
        <span className="text-[10px]" style={{ color: MUTED }}>
          {MAX}
        </span>
      </div>
    </div>
  );
}
