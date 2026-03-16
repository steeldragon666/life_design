'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { DIMENSION_LABELS, type Dimension, computeTrend } from '@life-design/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button, Badge, dimensionPalettes } from '@life-design/ui';
import { Plus, Check, Warning } from '@phosphor-icons/react';

// ---------------------------------------------------------------------------
// Types & config
// ---------------------------------------------------------------------------

type GoalWithRelations = {
  id: string;
  title: string;
  horizon: string;
  status: string;
  tracking_type: string;
  target_date: string;
  metric_target: number | null;
  metric_current: number | null;
  metric_unit: string | null;
  goal_dimensions: Array<{ dimension: string }>;
  goal_milestones?: Array<{ id: string; completed: boolean }>;
};

interface GoalsClientProps {
  goals: GoalWithRelations[];
}

type HorizonTab = 'all' | 'short' | 'medium' | 'long';

const HORIZON_TABS: { id: HorizonTab; label: string }[] = [
  { id: 'all', label: 'All Goals' },
  { id: 'short', label: 'Short-term' },
  { id: 'medium', label: 'Medium-term' },
  { id: 'long', label: 'Long-term' },
];

// Map dimensions to palette keys — fall back to health palette for unknowns
function getDimensionPalette(dimension: string) {
  const key = dimension.toLowerCase() as Dimension;
  return dimensionPalettes[key] ?? dimensionPalettes.health;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getProgress(goal: GoalWithRelations): number {
  if (goal.status === 'completed') return 100;

  if (goal.tracking_type === 'metric' && goal.metric_target) {
    const current = goal.metric_current ?? 0;
    return Math.min(100, Math.round((current / goal.metric_target) * 100));
  }

  if (goal.goal_milestones && goal.goal_milestones.length > 0) {
    const done = goal.goal_milestones.filter((m) => m.completed).length;
    return Math.round((done / goal.goal_milestones.length) * 100);
  }

  return 0;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GoalsClient({ goals }: GoalsClientProps) {
  const [activeTab, setActiveTab] = useState<HorizonTab>('all');

  const recentCheckIns = useLiveQuery(() =>
    db.checkIns.orderBy('date').reverse().limit(7).toArray()
  );

  function getMomentum(dimension: string): { slope: number; label: string; color: string } {
    const scores = recentCheckIns
      ?.map(ci => ci.dimensionScores[dimension as Dimension])
      .filter((s): s is number => s !== undefined)
      .reverse() ?? []; // reverse to chronological order
    if (scores.length < 3) return { slope: 0, label: 'New', color: '#A8A198' };
    const slope = computeTrend(scores);
    if (slope > 0.05) return { slope, label: 'Rising', color: '#5A7F5A' };
    if (slope < -0.05) return { slope, label: 'Falling', color: '#D4864A' };
    return { slope, label: 'Stable', color: '#A8A198' };
  }

  const filtered = useMemo(() => {
    if (activeTab === 'all') return goals;
    return goals.filter((g) => g.horizon === activeTab);
  }, [goals, activeTab]);

  // Sort: active first, then completed
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      return 0;
    });
  }, [filtered]);

  const activeCount = sorted.filter((g) => g.status === 'active').length;
  const completedCount = sorted.filter((g) => g.status === 'completed').length;
  const totalProgress = sorted.length > 0
    ? Math.round(sorted.reduce((acc, g) => acc + getProgress(g), 0) / sorted.length)
    : 0;

  return (
    <div className="px-5 lg:px-10 py-6 lg:py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl lg:text-4xl text-stone-900">Goals</h1>
          <p className="text-sm text-stone-500 mt-1">Track your progress across every time horizon</p>
        </div>
        <Link
          href="/goals/new"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[8px] text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200 hover:bg-stone-200/60 transition-all"
        >
          <Plus weight="regular" className="w-4 h-4" />
          Add Goal
        </Link>
      </div>

      {/* Horizon Tabs */}
      <div className="flex gap-1 p-1 bg-stone-100 rounded-2xl mb-8 overflow-x-auto">
        {HORIZON_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[80px] px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap
              ${activeTab === tab.id
                ? 'bg-white text-stone-800 shadow-sm'
                : 'text-stone-500 hover:text-stone-600'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-2xl bg-white border border-stone-200/60 text-center">
          <p className="text-2xl font-serif text-sage-500">{totalProgress}%</p>
          <p className="text-[11px] text-stone-500 uppercase tracking-wider mt-1">Overall Progress</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-stone-200/60 text-center">
          <p className="text-2xl font-serif text-stone-800">{activeCount}</p>
          <p className="text-[11px] text-stone-500 uppercase tracking-wider mt-1">Active Goals</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-stone-200/60 text-center">
          <p className="text-2xl font-serif text-warm-500">{completedCount}</p>
          <p className="text-[11px] text-stone-500 uppercase tracking-wider mt-1">Completed</p>
        </div>
      </div>

      {/* Goals List */}
      {sorted.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-white p-16 text-center">
          <p className="text-stone-500 text-lg mb-4 font-serif italic">
            No goals found. Start designing your future.
          </p>
          <Link
            href="/goals/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-[13px] font-semibold bg-sage-600 text-white shadow-[0_2px_8px_rgba(90,127,90,0.3)] hover:bg-sage-600/90 transition-all"
          >
            <Plus weight="regular" className="w-4 h-4" />
            Create your first goal
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((goal) => {
            const progress = getProgress(goal);
            const isCompleted = goal.status === 'completed';
            const dimension = goal.goal_dimensions?.[0]?.dimension;
            const dimLabel = dimension
              ? (DIMENSION_LABELS[dimension as Dimension] ?? dimension)
              : goal.horizon.charAt(0).toUpperCase() + goal.horizon.slice(1);
            const palette = dimension
              ? getDimensionPalette(dimension)
              : dimensionPalettes.growth;

            return (
              <Link
                key={goal.id}
                href={`/goals/${goal.id}`}
                className={`block p-5 rounded-2xl bg-white border border-stone-200/60 hover:border-sage-200/50 transition-all group ${isCompleted ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-4">
                  {/* Circular checkbox */}
                  <div
                    className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      isCompleted
                        ? 'bg-sage-300 border-sage-300'
                        : 'border-stone-300 group-hover:border-sage-300'
                    }`}
                  >
                    {isCompleted && <Check weight="bold" className="w-3 h-3 text-white" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-sm font-medium ${isCompleted ? 'line-through text-stone-500' : 'text-stone-800'}`}>
                        {goal.title}
                      </p>
                      <span
                        className="text-xs font-medium ml-3"
                        style={{ color: palette.text }}
                      >
                        {progress}%
                      </span>
                    </div>

                    {/* Category badge + target date + momentum indicator */}
                    <div className="flex items-center gap-3">
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full font-medium capitalize"
                        style={{ backgroundColor: palette.bg, color: palette.text }}
                      >
                        {dimLabel}
                      </span>
                      {goal.target_date && (
                        <span className="text-[11px] text-stone-500">
                          Due {new Date(goal.target_date).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      {dimension && (() => {
                        const momentum = getMomentum(dimension);
                        return (
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: momentum.color + '15', color: momentum.color }}>
                            {momentum.slope > 0.05 ? '↑' : momentum.slope < -0.05 ? '↓' : '→'} {momentum.label}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${progress}%`, backgroundColor: palette.accent }}
                      />
                    </div>

                    {/* Timeline risk warning */}
                    {goal.target_date && dimension && (() => {
                      const now = new Date();
                      const end = new Date(goal.target_date);
                      const timeLeft = end.getTime() - now.getTime();
                      const totalDays = 90; // approximate goal duration
                      const daysLeft = timeLeft / (1000 * 60 * 60 * 24);
                      const momentum = getMomentum(dimension);
                      if (daysLeft > 0 && daysLeft < totalDays * 0.3 && progress < 70 && momentum.slope <= 0) {
                        return (
                          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-warm-500 font-medium">
                            <Warning weight="regular" className="w-3 h-3" /> Timeline risk — momentum stalling
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
