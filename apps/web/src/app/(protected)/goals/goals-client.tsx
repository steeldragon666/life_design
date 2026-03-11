'use client';

import { useState } from 'react';
import Link from 'next/link';
import GoalCard from '@/components/goals/goal-card';

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

const HORIZON_TABS = [
  { key: 'all', label: 'All' },
  { key: 'short', label: 'Short-term' },
  { key: 'medium', label: 'Medium-term' },
  { key: 'long', label: 'Long-term' },
] as const;

const STATUS_OPTIONS = ['all', 'active', 'completed', 'paused'] as const;

export default function GoalsClient({ goals }: GoalsClientProps) {
  const [horizonFilter, setHorizonFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = goals.filter((g) => {
    if (horizonFilter !== 'all' && g.horizon !== horizonFilter) return false;
    if (statusFilter !== 'all' && g.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Goals</h1>
        <Link
          href="/goals/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
        >
          New Goal
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex rounded-lg border">
          {HORIZON_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setHorizonFilter(tab.key)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                horizonFilter === tab.key
                  ? 'bg-indigo-600 text-white'
                  : 'hover:bg-gray-50'
              } ${tab.key === 'all' ? 'rounded-l-lg' : ''} ${tab.key === 'long' ? 'rounded-r-lg' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border px-3 py-1.5 text-sm"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Goals grid */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-12 text-center">
          <p className="text-gray-500">No goals found.</p>
          <Link href="/goals/new" className="mt-2 inline-block text-sm text-indigo-600 hover:underline">
            Create your first goal
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
}
