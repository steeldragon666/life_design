import Link from 'next/link';
import { DIMENSION_LABELS, type Dimension } from '@life-design/core';
import { Badge } from '@life-design/ui';

interface GoalCardProps {
  goal: {
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
}

const HORIZON_VARIANTS: Record<string, { variant: 'sage' | 'warm' | 'stone'; label: string }> = {
  short: { variant: 'sage', label: 'Short-term' },
  medium: { variant: 'warm', label: 'Medium-term' },
  long: { variant: 'stone', label: 'Long-term' },
};

const STATUS_VARIANTS: Record<string, 'sage' | 'stone' | 'warm' | 'destructive'> = {
  active: 'sage',
  completed: 'stone',
  paused: 'warm',
  abandoned: 'destructive',
};

function daysRemaining(targetDate: string): number {
  const target = new Date(targetDate);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getProgress(goal: GoalCardProps['goal']): { percent: number; label: string } {
  if (goal.tracking_type === 'metric' && goal.metric_target) {
    const current = goal.metric_current ?? 0;
    const percent = Math.min(100, Math.round((current / goal.metric_target) * 100));
    return { percent, label: `${current}/${goal.metric_target} ${goal.metric_unit ?? ''}`.trim() };
  }

  if (goal.tracking_type === 'milestone' && goal.goal_milestones) {
    const total = goal.goal_milestones.length;
    if (total === 0) return { percent: 0, label: 'No milestones' };
    const done = goal.goal_milestones.filter((m) => m.completed).length;
    return { percent: Math.round((done / total) * 100), label: `${done}/${total} milestones` };
  }

  return { percent: 0, label: '' };
}

export default function GoalCard({ goal }: GoalCardProps) {
  const horizon = HORIZON_VARIANTS[goal.horizon] ?? HORIZON_VARIANTS.short;
  const statusVariant = STATUS_VARIANTS[goal.status] ?? STATUS_VARIANTS.active;
  const days = daysRemaining(goal.target_date);
  const progress = getProgress(goal);

  return (
    <Link
      href={`/goals/${goal.id}`}
      className="block rounded-2xl border border-stone-200 p-4 bg-white hover:border-sage-200 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm leading-tight text-stone-800">{goal.title}</h3>
        <Badge variant={horizon.variant} className="shrink-0">
          {horizon.label}
        </Badge>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {goal.goal_dimensions.map((d) => (
          <Badge key={d.dimension} variant="stone" className="capitalize">
            {DIMENSION_LABELS[d.dimension as Dimension] ?? d.dimension}
          </Badge>
        ))}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
          <span>{progress.label}</span>
          <span>{progress.percent}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-stone-100">
          <div
            className="h-1.5 rounded-full bg-sage-500 transition-all"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <Badge variant={statusVariant} className="capitalize">
          {goal.status}
        </Badge>
        <span className={`text-xs ${days < 7 ? 'text-red-500 font-medium' : days < 30 ? 'text-amber-500' : 'text-stone-500'}`}>
          {days > 0 ? `${days}d remaining` : days === 0 ? 'Due today' : `${Math.abs(days)}d overdue`}
        </span>
      </div>
    </Link>
  );
}
