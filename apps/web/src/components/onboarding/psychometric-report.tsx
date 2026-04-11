'use client';

import type { PsychometricProfile } from '@life-design/core';
import { CheckCircle } from '@phosphor-icons/react';

interface PsychometricReportProps {
  profile: PsychometricProfile;
  narrative: string;
  userName: string;
  onComplete: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Convert a value in [min, max] to a 0–100 percentage string for bar width. */
function toPercent(value: number, min: number, max: number): string {
  const pct = ((clamp(value, min, max) - min) / (max - min)) * 100;
  return `${pct.toFixed(1)}%`;
}

/** Round a score to one decimal place. */
function fmt(value: number): string {
  return value.toFixed(1);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SectionTitleProps {
  children: React.ReactNode;
}

function SectionTitle({ children }: SectionTitleProps) {
  return (
    <h2 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-4">
      {children}
    </h2>
  );
}

interface ScoreBarProps {
  label: string;
  value: number;
  min: number;
  max: number;
  colorClass: string;
}

function ScoreBar({ label, value, min, max, colorClass }: ScoreBarProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-stone-600">{label}</span>
        <span className="font-mono text-sm font-semibold text-stone-900">{fmt(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${colorClass}`}
          style={{ width: toPercent(value, min, max) }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SWLS band → friendly text
// ---------------------------------------------------------------------------

const SWLS_BAND_TEXT: Record<string, string> = {
  extremely_satisfied: "You're extremely satisfied with your life",
  satisfied: "You're feeling satisfied with your life",
  slightly_satisfied: "You're slightly satisfied with your life",
  neutral: "You feel neutral about your life satisfaction",
  slightly_dissatisfied: "You feel slightly dissatisfied with your life",
  dissatisfied: "You're feeling dissatisfied with your life",
  extremely_dissatisfied: "You're feeling very dissatisfied with your life",
};

function swlsBandText(band: string): string {
  return SWLS_BAND_TEXT[band] ?? "Your life satisfaction has been measured";
}

// ---------------------------------------------------------------------------
// Grit interpretation
// ---------------------------------------------------------------------------

function gritInterpretation(score: number): string {
  if (score >= 4) return 'High';
  if (score >= 3) return 'Moderate';
  return 'Developing';
}

function gritInterpretationColor(score: number): string {
  if (score >= 4) return 'text-sage-700';
  if (score >= 3) return 'text-warm-700';
  return 'text-stone-500';
}

// ---------------------------------------------------------------------------
// Grit ring — pure CSS/SVG circle
// ---------------------------------------------------------------------------

interface GritRingProps {
  score: number; // 1–5
}

function GritRing({ score }: GritRingProps) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const pct = (clamp(score, 1, 5) - 1) / 4; // map 1-5 → 0-1
  const strokeDashoffset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="104" height="104" viewBox="0 0 104 104" aria-label={`Grit score ${fmt(score)} out of 5`}>
        {/* Track */}
        <circle
          cx="52"
          cy="52"
          r={radius}
          fill="none"
          stroke="#e7e5e4"
          strokeWidth="10"
        />
        {/* Fill */}
        <circle
          cx="52"
          cy="52"
          r={radius}
          fill="none"
          stroke="#10b981"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 52 52)"
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
        <text
          x="52"
          y="52"
          dominantBaseline="middle"
          textAnchor="middle"
          className="font-mono font-bold"
          fontSize="22"
          fill="#1c1917"
        >
          {fmt(score)}
        </text>
        <text
          x="52"
          y="68"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize="10"
          fill="#78716c"
        >
          / 5
        </text>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PsychometricReport({
  profile,
  narrative,
  userName,
  onComplete,
}: PsychometricReportProps) {
  const { perma, tipi, grit, swls, bpns } = profile;

  return (
    <div className="min-h-screen px-4 py-8 md:px-8">
      <div className="max-w-lg mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="text-center mb-2">
          <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle weight="fill" size={32} color="#10b981" aria-hidden="true" />
          </div>
          <h1 className="font-serif text-3xl text-stone-900">Your Opt In Profile</h1>
          {userName && (
            <p className="text-stone-500 text-sm mt-2">
              Here's what we discovered about you, {userName}
            </p>
          )}
        </div>

        {/* ── AI Narrative ── */}
        {narrative && (
          <div className="rounded-2xl border border-sage-200 bg-sage-50 px-6 py-5">
            <p className="font-serif text-base italic text-stone-700 leading-relaxed">
              {narrative}
            </p>
          </div>
        )}

        {/* ── Wellbeing (PERMA) ── */}
        <div className="rounded-2xl border border-stone-200 bg-white px-6 py-5">
          <div className="flex items-baseline justify-between mb-4">
            <SectionTitle>Wellbeing (PERMA)</SectionTitle>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-2xl font-bold text-stone-900">{fmt(perma.overall)}</span>
              <span className="text-xs text-stone-400">/ 10</span>
            </div>
          </div>
          <div className="space-y-3">
            <ScoreBar label="Positive Emotion" value={perma.positiveEmotion} min={0} max={10} colorClass="bg-sage-500" />
            <ScoreBar label="Engagement"        value={perma.engagement}      min={0} max={10} colorClass="bg-sage-500" />
            <ScoreBar label="Relationships"     value={perma.relationships}   min={0} max={10} colorClass="bg-sage-500" />
            <ScoreBar label="Meaning"           value={perma.meaning}         min={0} max={10} colorClass="bg-sage-500" />
            <ScoreBar label="Accomplishment"    value={perma.accomplishment}  min={0} max={10} colorClass="bg-sage-500" />
          </div>
        </div>

        {/* ── Personality (Big Five via TIPI) ── */}
        <div className="rounded-2xl border border-stone-200 bg-white px-6 py-5">
          <SectionTitle>Personality (Big Five)</SectionTitle>
          <div className="space-y-3">
            <ScoreBar label="Extraversion"        value={tipi.extraversion}        min={1} max={7} colorClass="bg-accent-500" />
            <ScoreBar label="Agreeableness"       value={tipi.agreeableness}       min={1} max={7} colorClass="bg-sage-500" />
            <ScoreBar label="Conscientiousness"   value={tipi.conscientiousness}   min={1} max={7} colorClass="bg-warm-500" />
            <ScoreBar label="Emotional Stability" value={tipi.emotionalStability}  min={1} max={7} colorClass="bg-stone-400" />
            <ScoreBar label="Openness"            value={tipi.openness}            min={1} max={7} colorClass="bg-accent-400" />
          </div>
        </div>

        {/* ── Grit ── */}
        <div className="rounded-2xl border border-stone-200 bg-white px-6 py-5">
          <SectionTitle>Grit</SectionTitle>
          <div className="flex flex-col items-center gap-4 mb-4">
            <GritRing score={grit.overall} />
            <span className={`text-sm font-semibold ${gritInterpretationColor(grit.overall)}`}>
              {gritInterpretation(grit.overall)} Grit
            </span>
          </div>
          <div className="space-y-3">
            <ScoreBar label="Perseverance" value={grit.perseverance} min={1} max={5} colorClass="bg-sage-500" />
            <ScoreBar label="Consistency"  value={grit.consistency}  min={1} max={5} colorClass="bg-sage-400" />
          </div>
        </div>

        {/* ── Life Satisfaction (SWLS) ── */}
        <div className="rounded-2xl border border-stone-200 bg-white px-6 py-5">
          <SectionTitle>Life Satisfaction</SectionTitle>
          <div className="flex items-end gap-3 mb-3">
            <span className="font-mono text-2xl font-bold text-stone-900">{fmt(swls.score)}</span>
            <span className="text-xs text-stone-400 mb-1">/ 7</span>
          </div>
          <div className="h-2 rounded-full bg-stone-200 overflow-hidden mb-3">
            <div
              className="h-full rounded-full bg-warm-500 transition-all duration-700 ease-out"
              style={{ width: toPercent(swls.score, 1, 7) }}
            />
          </div>
          <p className="text-sm text-stone-600">{swlsBandText(swls.band)}</p>
        </div>

        {/* ── Psychological Needs (BPNS) ── */}
        <div className="rounded-2xl border border-stone-200 bg-white px-6 py-5">
          <SectionTitle>Psychological Needs</SectionTitle>
          <div className="space-y-3">
            <ScoreBar label="Autonomy"    value={bpns.autonomy}    min={1} max={7} colorClass="bg-warm-500" />
            <ScoreBar label="Competence"  value={bpns.competence}  min={1} max={7} colorClass="bg-sage-500" />
            <ScoreBar label="Relatedness" value={bpns.relatedness} min={1} max={7} colorClass="bg-accent-500" />
          </div>
        </div>

        {/* ── CTA ── */}
        <button
          onClick={onComplete}
          className="w-full py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-900/90 transition-colors"
        >
          Go to Dashboard
        </button>

      </div>
    </div>
  );
}
