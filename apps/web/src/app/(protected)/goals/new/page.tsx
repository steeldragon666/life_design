'use client';

import { useRouter } from 'next/navigation';
import GoalForm from '@/components/goals/goal-form';
import { createGoalAction } from '../actions';
import type { GoalFormData } from '@/components/goals/goal-form';

export default function NewGoalPage() {
  const router = useRouter();

  async function handleSubmit(data: GoalFormData) {
    const result = await createGoalAction({
      title: data.title,
      description: data.description || undefined,
      horizon: data.horizon,
      trackingType: data.trackingType,
      targetDate: data.targetDate,
      metricTarget: data.metricTarget,
      metricUnit: data.metricUnit,
      dimensions: data.dimensions,
      milestones: data.milestones.length > 0 ? data.milestones : undefined,
    });

    if (result.error) return { error: result.error };

    if (result.data?.id) {
      router.push(`/goals/${result.data.id}`);
    } else {
      router.push('/goals');
    }
    return { error: null };
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Create a New Goal</h1>
      <GoalForm onSubmit={handleSubmit} />
    </div>
  );
}
