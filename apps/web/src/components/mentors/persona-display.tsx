'use client';

import React from 'react';
import type { PersonaBlend } from '@/lib/mentor-types';

interface PersonaDisplayProps {
  blend: PersonaBlend;
  compact?: boolean;
  className?: string;
}

/** Persona metadata */
const PERSONAS = [
  {
    key: 'therapist' as keyof PersonaBlend,
    label: 'Therapist',
    color: '#8b5cf6',   // violet
    bgColor: 'rgba(139,92,246,0.15)',
    borderColor: 'rgba(139,92,246,0.35)',
    emoji: '💜',
  },
  {
    key: 'coach' as keyof PersonaBlend,
    label: 'Coach',
    color: '#f59e0b',   // amber
    bgColor: 'rgba(245,158,11,0.15)',
    borderColor: 'rgba(245,158,11,0.35)',
    emoji: '🏆',
  },
  {
    key: 'sage' as keyof PersonaBlend,
    label: 'Sage',
    color: '#10b981',   // emerald
    bgColor: 'rgba(16,185,129,0.15)',
    borderColor: 'rgba(16,185,129,0.35)',
    emoji: '🌿',
  },
] as const;

/** Derive a human-readable persona title from blend */
function derivePersonaTitle(blend: PersonaBlend): string {
  const sorted = [...PERSONAS].sort((a, b) => blend[b.key] - blend[a.key]);
  const top = sorted[0]!;
  const second = sorted[1]!;

  const dominantPct = blend[top.key];
  const adjectives: Record<keyof PersonaBlend, string> = {
    therapist: 'Compassionate',
    coach: 'Strategic',
    sage: 'Wise',
  };
  const nouns: Record<keyof PersonaBlend, string> = {
    therapist: 'Healer',
    coach: 'Coach',
    sage: 'Guide',
  };

  if (dominantPct >= 0.7) {
    return `${adjectives[top.key]} ${nouns[top.key]}`;
  }
  if (dominantPct >= 0.5) {
    return `${adjectives[top.key]} ${nouns[second.key]}`;
  }
  return 'Balanced Mentor';
}

/**
 * PersonaDisplay — compact header component showing current mentor persona blend.
 * Renders a tri-colour gradient bar + optional per-persona percentage bars.
 */
export default function PersonaDisplay({
  blend,
  compact = false,
  className = '',
}: PersonaDisplayProps) {
  const title = derivePersonaTitle(blend);

  /* Build gradient stops for the tri-colour bar */
  const therapistPct = Math.round(blend.therapist * 100);
  const coachPct = Math.round(blend.coach * 100);
  const sagePct = 100 - therapistPct - coachPct;
  const gradientBar = `linear-gradient(to right, #8b5cf6 0% ${therapistPct}%, #f59e0b ${therapistPct}% ${therapistPct + coachPct}%, #10b981 ${therapistPct + coachPct}% 100%)`;

  if (compact) {
    /* Compact mode: just the gradient bar + title chip */
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div
          className="h-2 w-16 rounded-full flex-shrink-0"
          style={{ background: gradientBar }}
          aria-hidden="true"
        />
        <span
          className="text-xs font-medium text-white/70 whitespace-nowrap"
          style={{ fontFamily: '"Cabinet Grotesk", system-ui, sans-serif' }}
        >
          {title}
        </span>
        <div className="flex items-center gap-1">
          {PERSONAS.map((p) => (
            <span
              key={p.key}
              className="text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums"
              style={{
                backgroundColor: p.bgColor,
                color: p.color,
                border: `1px solid ${p.borderColor}`,
                fontFamily: '"JetBrains Mono", monospace',
              }}
              title={`${p.label}: ${Math.round(blend[p.key] * 100)}%`}
            >
              {Math.round(blend[p.key] * 100)}%
            </span>
          ))}
        </div>
      </div>
    );
  }

  /* Full mode: gradient bar + individual persona tracks */
  return (
    <div
      className={`rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-4 ${className}`}
      role="region"
      aria-label="Mentor persona blend"
    >
      {/* Title */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p
            className="text-[10px] uppercase tracking-widest text-white/40 mb-0.5"
            style={{ fontFamily: '"Cabinet Grotesk", system-ui, sans-serif' }}
          >
            Persona Blend
          </p>
          <h4
            className="text-sm font-semibold text-white leading-none"
            style={{ fontFamily: '"Cabinet Grotesk", system-ui, sans-serif' }}
          >
            {title}
          </h4>
        </div>
        {/* Mini orb */}
        <div
          className="h-8 w-8 rounded-full shadow-lg"
          style={{
            background: `linear-gradient(135deg, #8b5cf6 ${therapistPct}%, #f59e0b ${therapistPct + coachPct}%, #10b981)`,
          }}
          aria-hidden="true"
        />
      </div>

      {/* Tri-colour gradient bar */}
      <div
        className="h-2 w-full rounded-full mb-3"
        style={{ background: gradientBar }}
        role="presentation"
        aria-label={`Blend: ${therapistPct}% therapist, ${coachPct}% coach, ${sagePct}% sage`}
      />

      {/* Per-persona read-only sliders */}
      <div className="space-y-2" role="list" aria-label="Persona percentages">
        {PERSONAS.map((p) => {
          const pct = Math.round(blend[p.key] * 100);
          return (
            <div key={p.key} className="flex items-center gap-2" role="listitem">
              <span className="text-sm" aria-hidden="true">{p.emoji}</span>
              <span
                className="text-[11px] text-white/60 w-16 flex-shrink-0"
                style={{ fontFamily: '"Cabinet Grotesk", system-ui, sans-serif' }}
              >
                {p.label}
              </span>
              {/* Read-only track */}
              <div
                className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden"
                role="presentation"
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: p.color }}
                />
              </div>
              <span
                className="text-[11px] w-8 text-right tabular-nums font-medium"
                style={{
                  color: p.color,
                  fontFamily: '"JetBrains Mono", monospace',
                }}
                aria-label={`${pct} percent`}
              >
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
