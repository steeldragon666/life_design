'use client';

import { useRouter } from 'next/navigation';
import { useGuest } from '@/lib/guest-context';
import GoalForm from '@/components/goals/goal-form';
import type { GoalFormData } from '@/components/goals/goal-form';

export default function NewGoalPage() {
  const router = useRouter();
  const { addGoal } = useGuest();

  async function handleSubmit(formData: GoalFormData) {
    try {
      // Save to guest context
      addGoal({
        id: `goal-${Date.now()}`,
        title: formData.title,
        description: formData.description,
        horizon: formData.horizon as 'short' | 'medium' | 'long',
        status: 'active',
        target_date: formData.targetDate,
      });

      // Navigate to goals page
      router.push('/goals');
      return { error: null };
    } catch (err) {
      return { error: 'Failed to create goal. Please try again.' };
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Create a New Goal</h1>
        <p className="text-slate-400">Define what you want to achieve</p>
      </div>
      <GoalForm onSubmit={handleSubmit} />
    </div>
  );
}
