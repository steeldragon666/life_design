'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowRight, Orbit, Loader2 } from 'lucide-react';
import { GlassCard } from '@life-design/ui';
import type { LifeOrbDimension } from './life-orb';

/**
 * Dynamically import LifeOrb (Three.js) — defers the ~500 KB three.js bundle
 * until the component is actually rendered, keeping the initial dashboard
 * bundle lean. SSR is disabled because Three.js requires a browser canvas.
 */
const LifeOrb = dynamic(() => import('./life-orb'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[200px] w-[200px]">
      <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
    </div>
  ),
});

interface OrbWidgetProps {
  /** Enhanced format with trend data */
  dimensions?: LifeOrbDimension[];
  /** Legacy format – backwards compat */
  scores?: Array<{ dimension: string; score: number }>;
  overallScore: number;
  mood?: number;
}

/**
 * Dashboard-sized Life Orb widget.
 * Renders the orb at 'md' size inside a glass card.
 * Clicking navigates to the full-screen /orb page.
 */
export default function OrbWidget({
  dimensions,
  scores,
  overallScore,
  mood,
}: OrbWidgetProps) {
  return (
    <GlassCard className="relative overflow-hidden group/orb p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
            <Orbit className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Life Orb</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Dynamic Balance
            </p>
          </div>
        </div>

        <Link
          href="/orb"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass
                     text-[10px] font-bold text-slate-400 uppercase tracking-wider
                     hover:text-indigo-300 hover:border-indigo-500/30 transition-all
                     border border-white/10"
        >
          Expand
          <ArrowRight className="h-3 w-3 group-hover/orb:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Orb — centred, click area routes to full view */}
      <Link href="/orb" className="block" tabIndex={-1} aria-label="Open Life Orb full view">
        <div className="flex justify-center px-4 pb-4">
          <LifeOrb
            dimensions={dimensions}
            scores={scores}
            overallScore={overallScore}
            mood={mood}
            size="md"
            interactive={false}
          />
        </div>
      </Link>

      {/* Score strip */}
      <div
        className="flex items-center justify-between px-5 py-3
                   border-t border-white/5 bg-white/[0.02]"
      >
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Harmony Index
        </p>
        <p
          className="text-lg font-black text-white"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          {Math.round(overallScore)}
          <span className="text-xs text-indigo-400 ml-0.5">%</span>
        </p>
      </div>
    </GlassCard>
  );
}
