'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import GoalCard from '@/components/goals/goal-card';
import { Target, Plus } from 'lucide-react';

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
    <div className="space-y-8">
      {/* Hero Header with Pathway Illustration */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/50 via-slate-800/30 to-amber-500/10 border border-white/5 p-8">
        <div className="absolute top-0 right-0 w-80 h-80 opacity-70">
          <Image
            src="/images/goals-pathway-illustration.png"
            alt="Goals Pathway"
            width={320}
            height={320}
            className="object-contain"
            priority
          />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-amber-500/10">
                <Target className="h-6 w-6 text-amber-400" />
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                Goals
              </h1>
            </div>
            <p className="text-slate-400 font-medium max-w-md">
              Define your path. Every milestone brings you closer to the life you design.
            </p>
          </div>
          
          <Link
            href="/goals/new"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-105 transition-all"
          >
            <Plus className="h-4 w-4" />
            New Goal
          </Link>
        </div>
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
        <div className="rounded-3xl border-2 border-dashed border-white/10 bg-slate-900/30 p-16 text-center">
          <div className="w-48 h-48 mx-auto mb-6 opacity-80">
            <Image
              src="/images/empty-state-illustration.png"
              alt="No goals yet"
              width={192}
              height={192}
              className="object-contain"
            />
          </div>
          <p className="text-slate-400 text-lg mb-4">No goals found. Start designing your future.</p>
          <Link 
            href="/goals/new" 
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-105 transition-all"
          >
            <Plus className="h-4 w-4" />
            Create your first goal
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
}
