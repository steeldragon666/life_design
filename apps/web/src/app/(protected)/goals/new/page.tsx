'use client';

import { useRouter } from 'next/navigation';
import { useGuest } from '@/lib/guest-context';
import GoalForm from '@/components/goals/goal-form';
import type { GoalFormData } from '@/components/goals/goal-form';
import VoiceGoalCreator from '@/components/goals/voice-goal-creator';
import { Card } from '@life-design/ui';

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

  async function handleVoiceGoalCreate(goal: {
    title: string;
    description?: string;
    horizon: 'short' | 'medium' | 'long';
  }) {
    const targetDate = new Date();
    if (goal.horizon === 'short') targetDate.setMonth(targetDate.getMonth() + 3);
    if (goal.horizon === 'medium') targetDate.setMonth(targetDate.getMonth() + 12);
    if (goal.horizon === 'long') targetDate.setFullYear(targetDate.getFullYear() + 3);

    addGoal({
      id: `goal-${Date.now()}`,
      title: goal.title,
      description: goal.description,
      horizon: goal.horizon,
      status: 'active',
      target_date: targetDate.toISOString().slice(0, 10),
    });
    router.push('/goals');
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight mb-2">Create a New Goal</h1>
        <p className="text-stone-500">Voice-first guidance with your mentor</p>
      </div>
      <VoiceGoalCreator onCreateGoal={handleVoiceGoalCreate} />
      <Card className="p-6 space-y-3">
        <p className="text-sm text-stone-500">Prefer manual entry?</p>
        <GoalForm onSubmit={handleSubmit} />
      </Card>
    </div>
  );
}
