import Link from 'next/link';
import { DIMENSION_LABELS, type Dimension } from '@life-design/core';

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

const HORIZON_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  short: { bg: 'bg-green-100', text: 'text-green-800', label: 'Short-term' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Medium-term' },
  long: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Long-term' },
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-gray-100 text-gray-600',
  paused: 'bg-yellow-100 text-yellow-700',
  abandoned: 'bg-red-100 text-red-600',
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
  const horizon = HORIZON_STYLES[goal.horizon] ?? HORIZON_STYLES.short;
  const statusStyle = STATUS_STYLES[goal.status] ?? STATUS_STYLES.active;
  const days = daysRemaining(goal.target_date);
  const progress = getProgress(goal);

  return (
    <Link
      href={`/goals/${goal.id}`}
      className="block rounded-lg border p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm leading-tight">{goal.title}</h3>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${horizon.bg} ${horizon.text}`}>
          {horizon.label}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {goal.goal_dimensions.map((d) => (
          <span key={d.dimension} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 capitalize">
            {DIMENSION_LABELS[d.dimension as Dimension] ?? d.dimension}
          </span>
        ))}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>{progress.label}</span>
          <span>{progress.percent}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-gray-200">
          <div
            className="h-1.5 rounded-full bg-indigo-500 transition-all"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyle}`}>
          {goal.status}
        </span>
        <span className={`text-xs ${days < 7 ? 'text-red-500 font-medium' : days < 30 ? 'text-amber-500' : 'text-gray-400'}`}>
          {days > 0 ? `${days}d remaining` : days === 0 ? 'Due today' : `${Math.abs(days)}d overdue`}
        </span>
      </div>
    </Link>
  );
}
