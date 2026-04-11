'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import GoalProgress from '@/components/goals/goal-progress';
import { DIMENSION_LABELS, GOAL_HORIZON_LABELS, GoalStatus, type Dimension, type GoalHorizon } from '@life-design/core';
import { Button, Badge, Select, Card } from '@life-design/ui';
import { ArrowLeft } from 'lucide-react';
import {
  updateGoalAction,
  deleteGoalAction,
  addMilestoneAction,
  toggleMilestoneAction,
  logProgressAction,
} from '../actions';

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
  currentScores?: Record<string, number>;
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Resume' },
  { value: 'paused', label: 'Pause' },
  { value: 'completed', label: 'Complete' },
  { value: 'abandoned', label: 'Abandon' },
];

export default function GoalDetailClient({ goal, pathways, currentScores = {} }: GoalDetailClientProps) {
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

  async function handleToggleMilestone(milestoneId: string, completed: boolean) {
    await toggleMilestoneAction(milestoneId, completed, goal.id);
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
          <h1 className="text-2xl font-bold text-stone-900">{goal.title}</h1>
          {goal.description && (
            <p className="mt-1 text-stone-600">{goal.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={goal.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Meta badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="sage">
          {GOAL_HORIZON_LABELS[goal.horizon as GoalHorizon]}
        </Badge>
        {goal.goal_dimensions.map((d) => (
          <Badge key={d.dimension} variant="stone" className="capitalize">
            {DIMENSION_LABELS[d.dimension as Dimension] ?? d.dimension}
          </Badge>
        ))}
        <Badge
          variant={
            daysRemaining < 7 ? 'destructive' :
            daysRemaining < 30 ? 'warm' :
            'stone'
          }
        >
          {daysRemaining > 0 ? `${daysRemaining} days remaining` :
           daysRemaining === 0 ? 'Due today' :
           `${Math.abs(daysRemaining)} days overdue`}
        </Badge>
      </div>

      {/* Progress section */}
      <Card className="p-4">
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
      </Card>

      {/* Back link */}
      <button
        onClick={() => router.push('/goals')}
        className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 hover:underline transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to all goals
      </button>
    </div>
  );
}
