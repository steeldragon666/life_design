'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Dimension, DIMENSION_LABELS, ALL_DIMENSIONS } from '@life-design/core';
import { DimensionBadge, ScoreRing, dimensionColor } from '@life-design/ui';
import type { LifeOrbDimension } from '@/components/dashboard/life-orb';

/**
 * Dynamically import LifeOrb (Three.js) — defers the ~500 KB three.js bundle
 * until the component is actually rendered. SSR is disabled because Three.js
 * requires a browser canvas.
 */
const LifeOrb = dynamic(() => import('@/components/dashboard/life-orb'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[400px] w-[400px]">
      <Loader2 className="h-12 w-12 text-indigo-400 animate-spin" />
    </div>
  ),
});

interface OrbClientProps {
  dimensions: LifeOrbDimension[];
  overallScore: number;
  mood?: number;
}

/**
 * Full-screen immersive Life Orb view.
 * Dark indigo-950 background, hero-sized orb, dimension legend below.
 */
export default function OrbClient({ dimensions, overallScore, mood = 5 }: OrbClientProps) {
  const [activeDimension, setActiveDimension] = React.useState<string | null>(null);

  const handleDimensionClick = React.useCallback((dim: string) => {
    setActiveDimension((prev) => (prev === dim ? null : dim));
  }, []);

  return (
    <div className="relative min-h-screen bg-[#060614] flex flex-col overflow-hidden">
      {/* Atmospheric gradients */}
      <div className="fixed inset-0 pointer-events-none -z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[500px]
                        bg-indigo-500/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px]
                        bg-violet-500/6 rounded-full blur-[100px]" />
      </div>

      {/* Top navigation bar */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm font-bold text-slate-400
                     hover:text-white transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Dashboard
        </Link>

        <div className="flex flex-col items-center">
          <h1 className="text-sm font-black text-white tracking-tight uppercase">Life Orb</h1>
          <p className="text-[9px] font-bold text-indigo-400/70 uppercase tracking-[0.25em]">
            Dynamic Balance Visualisation
          </p>
        </div>

        {/* Overall score badge */}
        <div
          className="px-4 py-1.5 rounded-full border border-indigo-500/30
                     bg-indigo-500/10 backdrop-blur-sm"
        >
          <span
            className="text-base font-black text-white"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            {Math.round(overallScore)}
            <span className="text-xs text-indigo-400 ml-0.5">%</span>
          </span>
        </div>
      </header>

      {/* Hero Orb — fills available vertical space */}
      <main className="relative z-10 flex-1 flex items-center justify-center">
        <LifeOrb
          dimensions={dimensions}
          overallScore={overallScore}
          mood={mood}
          size="hero"
          interactive
          onDimensionClick={handleDimensionClick}
        />
      </main>

      {/* Bottom dimension legend */}
      <footer
        className="relative z-10 px-8 pb-8 pt-4
                   border-t border-white/5 bg-[#060614]/80 backdrop-blur-xl"
      >
        {/* Floating score display */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-baseline gap-2">
            <span
              className="text-5xl font-black text-white leading-none"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              {Math.round(overallScore)}
            </span>
            <span className="text-xl font-bold text-indigo-400">%</span>
          </div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">
            Overall Harmony Index
          </p>
        </div>

        {/* 8 dimension badges grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 max-w-5xl mx-auto">
          {dimensions.map((d) => {
            const key = String(d.dimension);
            const color = dimensionColor(key);
            const isActive = activeDimension === key;
            const label = DIMENSION_LABELS[d.dimension as Dimension] ?? key;

            return (
              <button
                key={key}
                onClick={() => handleDimensionClick(key)}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl border
                           transition-all duration-200 group/dim"
                style={{
                  background: isActive ? `${color}18` : 'rgba(255,255,255,0.03)',
                  borderColor: isActive ? `${color}50` : 'rgba(255,255,255,0.07)',
                }}
              >
                {/* Score ring */}
                <ScoreRing
                  score={d.score}
                  size={64}
                  strokeWidth={5}
                  animate={false}
                />

                {/* Badge */}
                <DimensionBadge
                  dimension={d.dimension}
                  size="sm"
                />

                {/* Trend indicator */}
                <span
                  className="text-[9px] font-bold uppercase tracking-wider"
                  style={{
                    color: d.trend > 0.05
                      ? '#10b981'
                      : d.trend < -0.05
                        ? '#ef4444'
                        : '#6b7280',
                  }}
                >
                  {d.trend > 0.05 ? 'Up' : d.trend < -0.05 ? 'Down' : 'Stable'}
                </span>
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
}
