'use client';

import { useRouter } from 'next/navigation';
import GoalForm from '@/components/goals/goal-form';
import { createGoalAction } from '../actions';
import type { GoalFormData } from '@/components/goals/goal-form';

export default function NewGoalPage() {
  const router = useRouter();

  async function handleSubmit(formData: GoalFormData) {
    const result = await createGoalAction({
      title: formData.title,
      description: formData.description || undefined,
      horizon: formData.horizon,
      trackingType: formData.trackingType,
      targetDate: formData.targetDate,
      metricTarget: formData.metricTarget,
      metricUnit: formData.metricUnit,
      dimensions: formData.dimensions,
      milestones: formData.milestones.length > 0 ? formData.milestones : undefined,
    });

    if (result.error) return { error: result.error };

    if (result.success && result.goal?.id) {
      router.push(`/goals/${result.goal.id}`);
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
