'use client';

import { useGuest } from '@/lib/guest-context';
import GoalsClient from './goals-client';

export default function GoalsPage() {
  const { goals } = useGuest();
  
  // Transform guest goals to match GoalsClient expectations
  const transformedGoals = goals.map(goal => ({
    id: goal.id,
    title: goal.title,
    horizon: goal.horizon,
    status: goal.status,
    tracking_type: 'simple' as const,
    target_date: goal.target_date,
    metric_target: null,
    metric_current: null,
    metric_unit: null,
    goal_dimensions: [],
    goal_milestones: [],
  }));

  return <GoalsClient goals={transformedGoals} />;
}
