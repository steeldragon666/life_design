'use client';

import { useState, useMemo, useCallback } from 'react';
import { useGuest } from '@/lib/guest-context';
import { Dimension } from '@life-design/core';
import { dimensionPalettes, colors, semantic } from '@life-design/ui';
import { Flask, ArrowRight, ArrowCounterClockwise, Lightning, TrendUp, TrendDown, Equals } from '@phosphor-icons/react';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Dimension metadata (label only — colors sourced from dimensionPalettes)
// ---------------------------------------------------------------------------

const ALL_DIMENSIONS: Dimension[] = [
  'career', 'finance', 'health', 'fitness',
  'family', 'social', 'romance', 'growth',
] as Dimension[];

const DIMENSION_LABELS: Record<string, string> = {
  career:  'Career',
  finance: 'Finance',
  health:  'Health',
  fitness: 'Fitness',
  family:  'Family',
  social:  'Social',
  romance: 'Romance',
  growth:  'Growth',
};

// ---------------------------------------------------------------------------
// Correlation model: approximate cross-dimension effects
// ---------------------------------------------------------------------------

const CORRELATION_WEIGHTS: Record<string, Record<string, number>> = {
  career:  { finance: 0.5, growth: 0.4, health: -0.2, social: 0.15, family: -0.15, fitness: -0.1 },
  finance: { career: 0.4, family: 0.2, romance: 0.15, health: 0.1 },
  health:  { fitness: 0.6, romance: 0.2, family: 0.15, growth: 0.2, career: 0.15 },
  fitness: { health: 0.6, growth: 0.2, social: 0.15, romance: 0.1 },
  family:  { romance: 0.3, social: 0.3, health: 0.1 },
  social:  { romance: 0.3, family: 0.2, health: 0.1, growth: 0.15 },
  romance: { family: 0.3, social: 0.25, health: 0.15 },
  growth:  { career: 0.4, fitness: 0.15, health: 0.15, social: 0.1 },
};

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

interface Scenario {
  id: string;
  title: string;
  description: string;
  changes: Partial<Record<Dimension, number>>;
}

const PRESET_SCENARIOS: Scenario[] = [
  {
    id: 'new-job',
    title: 'Start a New Job',
    description: 'Career boost with initial social and family trade-offs',
    changes: { career: 3, finance: 2, growth: 2, social: -1, family: -2, health: -1 } as Partial<Record<Dimension, number>>,
  },
  {
    id: 'gym-habit',
    title: 'Build a Gym Habit',
    description: 'Fitness gains that ripple into health and confidence',
    changes: { fitness: 3, health: 2, romance: 1, growth: 1 } as Partial<Record<Dimension, number>>,
  },
  {
    id: 'therapy',
    title: 'Start Therapy',
    description: 'Mental health investment with wide-reaching benefits',
    changes: { health: 3, romance: 2, family: 2, social: 1, growth: 2 } as Partial<Record<Dimension, number>>,
  },
  {
    id: 'side-hustle',
    title: 'Launch a Side Hustle',
    description: 'Financial and career growth at the cost of free time',
    changes: { finance: 2, career: 2, growth: 3, social: -2, family: -1, fitness: -1, health: -1 } as Partial<Record<Dimension, number>>,
  },
  {
    id: 'move-city',
    title: 'Move to a New City',
    description: 'Fresh start with social disruption',
    changes: { career: 1, growth: 3, social: -3, family: -2, romance: -1, finance: -1 } as Partial<Record<Dimension, number>>,
  },
  {
    id: 'digital-detox',
    title: 'Digital Detox',
    description: 'Reduce screen time, improve presence',
    changes: { health: 2, family: 2, social: 1, romance: 1, fitness: 1, growth: 1 } as Partial<Record<Dimension, number>>,
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function SimulatorPage() {
  const { checkins } = useGuest();

  // Get current dimension scores from latest check-in or defaults
  const baseScores = useMemo(() => {
    const defaults: Record<string, number> = {};
    ALL_DIMENSIONS.forEach(d => { defaults[d] = 5; });

    if (checkins.length > 0) {
      const latest = checkins[checkins.length - 1];
      const scores = latest.dimension_scores;
      if (scores && Array.isArray(scores)) {
        scores.forEach((s: { dimension: string; score: number }) => {
          defaults[s.dimension] = s.score;
        });
      } else if (scores && typeof scores === 'object') {
        Object.entries(scores).forEach(([d, v]) => {
          if (typeof v === 'number') defaults[d] = v;
        });
      }
    }
    return defaults;
  }, [checkins]);

  const [adjustments, setAdjustments] = useState<Record<string, number>>({});
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  const handleSliderChange = useCallback((dim: string, delta: number) => {
    setAdjustments(prev => ({ ...prev, [dim]: delta }));
    setActiveScenario(null);
  }, []);

  const applyScenario = useCallback((scenario: Scenario) => {
    const newAdj: Record<string, number> = {};
    ALL_DIMENSIONS.forEach(d => {
      newAdj[d] = (scenario.changes as Record<string, number>)[d] ?? 0;
    });
    setAdjustments(newAdj);
    setActiveScenario(scenario.id);
  }, []);

  const resetAll = useCallback(() => {
    setAdjustments({});
    setActiveScenario(null);
  }, []);

  // Compute projected scores with cascade effects
  const projected = useMemo(() => {
    const result: Record<string, number> = {};

    // First pass: direct adjustments
    ALL_DIMENSIONS.forEach(d => {
      result[d] = baseScores[d] + (adjustments[d] ?? 0);
    });

    // Second pass: cascade effects from correlations
    ALL_DIMENSIONS.forEach(sourceDim => {
      const delta = adjustments[sourceDim] ?? 0;
      if (delta === 0) return;

      const weights = CORRELATION_WEIGHTS[sourceDim] ?? {};
      Object.entries(weights).forEach(([targetDim, weight]) => {
        result[targetDim] += delta * weight * 0.5; // dampen cascade
      });
    });

    // Clamp all values to 1-10
    ALL_DIMENSIONS.forEach(d => {
      result[d] = Math.max(1, Math.min(10, Math.round(result[d] * 10) / 10));
    });

    return result;
  }, [baseScores, adjustments]);

  // Compute overall life score
  const currentLifeScore = useMemo(() => {
    const vals = ALL_DIMENSIONS.map(d => baseScores[d]);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [baseScores]);

  const projectedLifeScore = useMemo(() => {
    const vals = ALL_DIMENSIONS.map(d => projected[d]);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [projected]);

  const lifeScoreDelta = projectedLifeScore - currentLifeScore;
  const hasChanges = Object.values(adjustments).some(v => v !== 0);

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      <div className="max-w-4xl mx-auto px-4 pt-8 md:pt-10">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sage-100 to-sage-200 flex items-center justify-center">
              <Flask size={24} weight="regular" className="text-sage-600" />
            </div>
            <div>
              <h1 className="font-serif text-3xl text-stone-800">Life Simulator</h1>
              <p className="text-sm text-stone-500">
                Model &ldquo;What if?&rdquo; scenarios and see how changes cascade across dimensions.
              </p>
            </div>
          </div>
        </header>

        {/* Life Score Comparison */}
        <div className="bg-white border border-stone-200/60 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="text-center flex-1">
              <p className="text-xs text-stone-400 uppercase tracking-wider mb-1">Current</p>
              <p className="font-mono text-3xl font-bold text-stone-800">{currentLifeScore.toFixed(1)}</p>
              <p className="text-xs text-stone-400">Life Score</p>
            </div>
            {hasChanges && (
              <>
                <div className="flex items-center">
                  <ArrowRight size={20} className="text-stone-300" />
                </div>
                <div className="text-center flex-1">
                  <p className="text-xs text-stone-400 uppercase tracking-wider mb-1">Projected</p>
                  <p className={`font-mono text-3xl font-bold ${lifeScoreDelta > 0 ? 'text-sage-600' : lifeScoreDelta < 0 ? 'text-red-500' : 'text-stone-800'}`}>
                    {projectedLifeScore.toFixed(1)}
                  </p>
                  <p className={`text-xs font-medium ${lifeScoreDelta > 0 ? 'text-sage-500' : lifeScoreDelta < 0 ? 'text-red-400' : 'text-stone-400'}`}>
                    {lifeScoreDelta > 0 ? '+' : ''}{lifeScoreDelta.toFixed(1)} points
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Dimension Sliders */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-serif text-xl text-stone-800">Adjust Dimensions</h2>
              {hasChanges && (
                <button
                  onClick={resetAll}
                  className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors"
                >
                  <ArrowCounterClockwise size={14} />
                  Reset
                </button>
              )}
            </div>

            {ALL_DIMENSIONS.map(dim => {
              const palette = dimensionPalettes[dim];
              const label = DIMENSION_LABELS[dim];
              const base = baseScores[dim];
              const adj = adjustments[dim] ?? 0;
              const proj = projected[dim];
              const cascadeDelta = proj - base - adj;
              const totalDelta = proj - base;

              return (
                <div
                  key={dim}
                  className="p-4 rounded-xl border bg-white"
                  style={{ borderColor: palette.border, backgroundColor: palette.bg + '80' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: palette.text }}>{label}</span>
                      {Math.abs(cascadeDelta) > 0.05 && (
                        <span className="text-[10px] text-stone-400 flex items-center gap-0.5">
                          <Lightning size={10} />
                          cascade {cascadeDelta > 0 ? '+' : ''}{cascadeDelta.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-stone-400">{base.toFixed(1)}</span>
                      {totalDelta !== 0 && (
                        <>
                          <ArrowRight size={12} className="text-stone-300" />
                          <span className={`font-mono text-sm font-semibold ${totalDelta > 0 ? 'text-sage-600' : totalDelta < 0 ? 'text-red-500' : 'text-stone-600'}`}>
                            {proj.toFixed(1)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Slider */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-stone-300 w-4 text-center">-5</span>
                    <div className="flex-1 relative">
                      <input
                        type="range"
                        min={-5}
                        max={5}
                        step={1}
                        value={adj}
                        onChange={e => handleSliderChange(dim, Number(e.target.value))}
                        className="w-full h-1.5 bg-stone-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sage-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
                        aria-label={`${dim} adjustment`}
                      />
                      {/* Center tick */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 bg-stone-300 rounded-full pointer-events-none" />
                    </div>
                    <span className="text-[10px] text-stone-300 w-4 text-center">+5</span>
                  </div>

                  {/* Visual bar */}
                  <div className="mt-2 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(proj / 10) * 100}%`,
                        background: totalDelta > 0
                          ? `linear-gradient(90deg, ${colors.sage[500]}, ${colors.sage[300]})`
                          : totalDelta < 0
                          ? `linear-gradient(90deg, ${semantic.destructive}, #E88888)`
                          : `linear-gradient(90deg, ${colors.stone[400]}, ${colors.stone[300]})`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right sidebar: Scenarios + Impact Summary */}
          <div className="space-y-6">
            {/* Preset Scenarios */}
            <div>
              <h2 className="font-serif text-xl text-stone-800 mb-3">Quick Scenarios</h2>
              <div className="space-y-2">
                {PRESET_SCENARIOS.map(scenario => (
                  <button
                    key={scenario.id}
                    onClick={() => applyScenario(scenario)}
                    className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                      activeScenario === scenario.id
                        ? 'border-sage-300 bg-sage-50 shadow-sm'
                        : 'border-stone-200/60 bg-white hover:border-sage-200 hover:shadow-sm'
                    }`}
                  >
                    <p className="text-sm font-semibold text-stone-800">{scenario.title}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{scenario.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Impact Summary */}
            {hasChanges && (
              <div className="bg-white border border-stone-200/60 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-stone-700 mb-3">Impact Summary</h3>
                <div className="space-y-2">
                  {ALL_DIMENSIONS
                    .map(d => ({ dim: d, delta: projected[d] - baseScores[d] }))
                    .filter(({ delta }) => Math.abs(delta) >= 0.1)
                    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
                    .map(({ dim, delta }) => {
                      const palette = dimensionPalettes[dim];
                      return (
                        <div key={dim} className="flex items-center justify-between text-sm">
                          <span className="font-medium" style={{ color: palette.text }}>{DIMENSION_LABELS[dim]}</span>
                          <span className={`flex items-center gap-1 font-mono text-xs font-semibold ${delta > 0 ? 'text-sage-600' : 'text-red-500'}`}>
                            {delta > 0 ? <TrendUp size={14} /> : delta < 0 ? <TrendDown size={14} /> : <Equals size={14} />}
                            {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* No data hint */}
            {checkins.length === 0 && (
              <div className="bg-warm-50 border border-warm-200/40 rounded-2xl p-4 text-center">
                <p className="text-xs text-warm-500">
                  Using default scores. <Link href="/checkin" className="underline hover:text-warm-600">Complete a check-in</Link> to see projections based on your real data.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
