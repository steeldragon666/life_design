'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { DIMENSION_LABELS, type Dimension, computeTrend } from '@life-design/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

// ---------------------------------------------------------------------------
// Inline SVG icons
// ---------------------------------------------------------------------------

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

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

const CATEGORY_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  health: { bg: '#F4F7F4', text: '#5A7F5A', bar: '#9BB89B' },
  career: { bg: '#F0F6FA', text: '#5E9BC4', bar: '#85B8D8' },
  relationships: { bg: '#FEF7F0', text: '#D4864A', bar: '#E8A46D' },
  growth: { bg: '#F5F0FA', text: '#8B7BA8', bar: '#C4B8D8' },
  spirituality: { bg: '#F0F6FA', text: '#5E9BC4', bar: '#85B8D8' },
  finance: { bg: '#FEF7F0', text: '#B86E3A', bar: '#D4864A' },
  creativity: { bg: '#F4F7F4', text: '#5A7F5A', bar: '#9BB89B' },
  environment: { bg: '#F9F7F3', text: '#A89B7B', bar: '#C4B8A0' },
};

function getCategoryColor(dimension: string) {
  return CATEGORY_COLORS[dimension.toLowerCase()] ?? CATEGORY_COLORS.health;
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
          <h1 className="font-['Instrument_Serif'] text-3xl lg:text-4xl text-[#1A1816]">Goals</h1>
          <p className="text-sm text-[#A8A198] mt-1">Track your progress across every time horizon</p>
        </div>
        <Link
          href="/goals/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-[#E8E4DD] text-sm font-medium text-[#5A7F5A] hover:bg-[#F4F7F4] transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Add Goal
        </Link>
      </div>

      {/* Horizon Tabs */}
      <div className="flex gap-1 p-1 bg-[#F5F3EF] rounded-2xl mb-8 overflow-x-auto">
        {HORIZON_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[80px] px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap
              ${activeTab === tab.id
                ? 'bg-white text-[#2A2623] shadow-sm'
                : 'text-[#A8A198] hover:text-[#7D756A]'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-2xl bg-white border border-[#E8E4DD]/60 text-center">
          <p className="text-2xl font-['Instrument_Serif'] text-[#5A7F5A]">{totalProgress}%</p>
          <p className="text-[10px] text-[#A8A198] uppercase tracking-wider mt-1">Overall Progress</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#E8E4DD]/60 text-center">
          <p className="text-2xl font-['Instrument_Serif'] text-[#2A2623]">{activeCount}</p>
          <p className="text-[10px] text-[#A8A198] uppercase tracking-wider mt-1">Active Goals</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#E8E4DD]/60 text-center">
          <p className="text-2xl font-['Instrument_Serif'] text-[#D4864A]">{completedCount}</p>
          <p className="text-[10px] text-[#A8A198] uppercase tracking-wider mt-1">Completed</p>
        </div>
      </div>

      {/* Goals List */}
      {sorted.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#E8E4DD] bg-white p-16 text-center">
          <p className="text-[#A8A198] text-lg mb-4 font-['Instrument_Serif'] italic">
            No goals found. Start designing your future.
          </p>
          <Link
            href="/goals/new"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#5A7F5A] to-[#476447] px-6 py-3 text-sm font-medium text-white shadow-lg shadow-[#5A7F5A]/20 hover:shadow-[#5A7F5A]/30 transition-all"
          >
            <PlusIcon className="w-4 h-4" />
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
            const colors = dimension
              ? getCategoryColor(dimension)
              : CATEGORY_COLORS.growth;

            return (
              <Link
                key={goal.id}
                href={`/goals/${goal.id}`}
                className={`block p-5 rounded-2xl bg-white border border-[#E8E4DD]/60 hover:border-[#C4D5C4]/50 transition-all group ${isCompleted ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-4">
                  {/* Circular checkbox */}
                  <div
                    className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      isCompleted
                        ? 'bg-[#9BB89B] border-[#9BB89B]'
                        : 'border-[#D4CFC5] group-hover:border-[#9BB89B]'
                    }`}
                  >
                    {isCompleted && <CheckIcon className="w-3 h-3 text-white" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-sm font-medium ${isCompleted ? 'line-through text-[#A8A198]' : 'text-[#2A2623]'}`}>
                        {goal.title}
                      </p>
                      <span
                        className="text-xs font-['DM_Mono'] font-medium ml-3"
                        style={{ color: colors.text }}
                      >
                        {progress}%
                      </span>
                    </div>

                    {/* Category badge + target date + momentum indicator */}
                    <div className="flex items-center gap-3">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        {dimLabel}
                      </span>
                      {goal.target_date && (
                        <span className="text-[10px] text-[#A8A198]">
                          Due {new Date(goal.target_date).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      {dimension && (() => {
                        const momentum = getMomentum(dimension);
                        return (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: momentum.color + '15', color: momentum.color }}>
                            {momentum.slope > 0.05 ? '↑' : momentum.slope < -0.05 ? '↓' : '→'} {momentum.label}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 h-1.5 bg-[#F5F3EF] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${progress}%`, backgroundColor: colors.bar }}
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
                          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#D4864A] font-medium">
                            <AlertTriangleIcon className="w-3 h-3" /> Timeline risk — momentum stalling
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
