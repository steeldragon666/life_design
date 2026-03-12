'use client';

import type { ReactNode } from 'react';
import LifeOrb from '@/components/dashboard/life-orb';
import ResilientErrorBoundary, { GlassErrorFallbackCard } from '@/components/error/resilient-error-boundary';

interface ProjectionVisualProps {
  latestScores: Array<{ dimension: string; score: number }>;
  currentHarmony: number;
  targetHarmony: number;
  activeGoalsCount: number;
  recentCheckinsCount: number;
}

const ErrorBoundary = ResilientErrorBoundary as unknown as (props: {
  children: ReactNode;
  fallback?: ReactNode;
  resetKeys?: unknown[];
}) => any;

function SoftProjectionFallback({ targetHarmony }: { targetHarmony: number }) {
  return (
    <div className="glass-card h-[320px] w-full relative overflow-hidden p-6 flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-purple-500/10" />
      <div className="absolute h-56 w-56 rounded-full bg-cyan-300/15 blur-3xl animate-pulse" />
      <div className="absolute h-44 w-44 rounded-full border border-cyan-300/30 shadow-[0_0_40px_rgba(56,189,248,0.25)]" />
      <div className="relative text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Future Projection</p>
        <p className="text-4xl font-black text-white mt-2">{targetHarmony}%</p>
        <p className="text-xs text-cyan-300 uppercase tracking-wider mt-1">Target Harmony</p>
      </div>
    </div>
  );
}

export default function ProjectionVisual({
  latestScores,
  currentHarmony,
  targetHarmony,
  activeGoalsCount,
  recentCheckinsCount,
}: ProjectionVisualProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white tracking-tight">Future Projection</h2>
          <p className="text-sm text-slate-400">Visualizing your likely harmony trajectory.</p>
        </div>
        <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
          Target {targetHarmony}%
        </span>
      </div>

      {latestScores.length > 0 ? (
        <ErrorBoundary
          fallback={
            <GlassErrorFallbackCard
              title="Projection visual unavailable"
              description="Your narrative remains available while the visual recovers."
              className="h-[320px]"
            />
          }
          resetKeys={[latestScores.length, currentHarmony]}
        >
          <div className="h-[320px]">
            <LifeOrb scores={latestScores} overallScore={currentHarmony / 10} />
          </div>
        </ErrorBoundary>
      ) : (
        <SoftProjectionFallback targetHarmony={targetHarmony} />
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Current</p>
          <p className="text-lg font-semibold text-white">{currentHarmony}%</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Active Goals</p>
          <p className="text-lg font-semibold text-white">{activeGoalsCount}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Recent Rituals</p>
          <p className="text-lg font-semibold text-white">{recentCheckinsCount}</p>
        </div>
      </div>
    </div>
  );
}
