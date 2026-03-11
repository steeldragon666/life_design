'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import GoalProgress from '@/components/goals/goal-progress';
import PathwayCard from '@/components/goals/pathway-card';
import PathwayBuilder from '@/components/goals/pathway-builder';
import { DIMENSION_LABELS, GOAL_HORIZON_LABELS, GoalStatus, type Dimension, type GoalHorizon } from '@life-design/core';
import {
  updateGoalAction,
  deleteGoalAction,
  addMilestoneAction,
  toggleMilestoneAction,
  logProgressAction,
} from '../actions';
import {
  generatePathwayAction,
  toggleStepAction,
  deletePathwayAction,
} from './pathway-actions';

interface GoalDetailData {
  id: string;
  title: string;
  description: string | null;
  horizon: string;
  status: string;
  tracking_type: string;
  target_date: string;
  metric_target: number | null;
  metric_current: number | null;
  metric_unit: string | null;
  created_at: string;
  goal_dimensions: Array<{ dimension: string }>;
  goal_milestones: Array<{
    id: string;
    title: string;
    position: number;
    completed: boolean;
    completed_at: string | null;
  }>;
  goal_progress: Array<{
    id: string;
    metric_value: number | null;
    note: string | null;
    recorded_at: string;
  }>;
}

interface PathwayData {
  id: string;
  title: string;
  description: string | null;
  ai_generated: boolean;
  dimension_impacts: Array<{ dimension: string; impact: number; explanation: string }>;
  pathway_steps: Array<{
    id: string;
    title: string;
    description: string | null;
    position: number;
    completed: boolean;
  }>;
}

interface GoalDetailClientProps {
  goal: GoalDetailData;
  pathways: PathwayData[];
}

const STATUS_ACTIONS = [
  { value: 'active', label: 'Resume' },
  { value: 'paused', label: 'Pause' },
  { value: 'completed', label: 'Complete' },
  { value: 'abandoned', label: 'Abandon' },
];

export default function GoalDetailClient({ goal, pathways }: GoalDetailClientProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleStatusChange(newStatus: string) {
    await updateGoalAction(goal.id, { status: newStatus as GoalStatus });
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    setDeleting(true);
    await deleteGoalAction(goal.id);
    router.push('/goals');
  }

  async function handleToggleMilestone(milestoneId: string) {
    await toggleMilestoneAction(milestoneId, goal.id);
  }

  async function handleAddMilestone(title: string) {
    await addMilestoneAction(goal.id, title);
  }

  async function handleLogProgress(value: number, note?: string) {
    await logProgressAction(goal.id, value, note);
  }

  const daysRemaining = Math.ceil(
    (new Date(goal.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{goal.title}</h1>
          {goal.description && (
            <p className="mt-1 text-gray-600">{goal.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={goal.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-lg border px-2 py-1 text-sm"
          >
            {STATUS_ACTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Meta badges */}
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
          {GOAL_HORIZON_LABELS[goal.horizon as GoalHorizon]}
        </span>
        {goal.goal_dimensions.map((d) => (
          <span key={d.dimension} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 capitalize">
            {DIMENSION_LABELS[d.dimension as Dimension] ?? d.dimension}
          </span>
        ))}
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${
          daysRemaining < 7 ? 'bg-red-100 text-red-700' :
          daysRemaining < 30 ? 'bg-amber-100 text-amber-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {daysRemaining > 0 ? `${daysRemaining} days remaining` :
           daysRemaining === 0 ? 'Due today' :
           `${Math.abs(daysRemaining)} days overdue`}
        </span>
      </div>

      {/* Progress section */}
      <div className="rounded-lg border p-4">
        <GoalProgress
          trackingType={goal.tracking_type as 'milestone' | 'metric'}
          milestones={goal.goal_milestones}
          progressEntries={goal.goal_progress}
          metricTarget={goal.metric_target}
          metricCurrent={goal.metric_current}
          metricUnit={goal.metric_unit}
          onToggleMilestone={handleToggleMilestone}
          onAddMilestone={handleAddMilestone}
          onLogProgress={goal.tracking_type === 'metric' ? handleLogProgress : undefined}
        />
      </div>

      {/* Pathways section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Pathways</h2>

        {pathways.map((pw) => (
          <PathwayCard
            key={pw.id}
            pathway={pw}
            onToggleStep={(stepId) => toggleStepAction(stepId, goal.id)}
            onDelete={(pathwayId) => {
              if (confirm('Remove this pathway?')) {
                deletePathwayAction(pathwayId, goal.id);
              }
            }}
          />
        ))}

        <PathwayBuilder
          goalId={goal.id}
          onGenerate={generatePathwayAction}
        />
      </div>

      {/* Back link */}
      <button
        onClick={() => router.push('/goals')}
        className="text-sm text-gray-500 hover:underline"
      >
        &larr; Back to all goals
      </button>
    </div>
  );
}
