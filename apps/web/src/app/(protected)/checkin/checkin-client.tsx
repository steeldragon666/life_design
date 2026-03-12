'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGuest } from '@/lib/guest-context';
import { DurationType } from '@life-design/core';
import CheckInForm from '@/components/checkin/checkin-form';
import type { CheckInFormData } from '@/components/checkin/checkin-form';

interface CheckInClientProps {
  date: string;
}

export default function CheckInClient({ date }: CheckInClientProps) {
  const router = useRouter();
  const { addCheckin } = useGuest();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(data: CheckInFormData) {
    setLoading(true);
    setError(null);

    try {
      // Validate scores
      if (data.mood < 1 || data.mood > 10) {
        setError('Mood must be between 1 and 10');
        setLoading(false);
        return;
      }

      const invalidScores = data.scores.some((s) => s.score < 1 || s.score > 10);
      if (invalidScores) {
        setError('All dimension scores must be between 1 and 10');
        setLoading(false);
        return;
      }

      // Save to guest context
      addCheckin({
        id: `checkin-${Date.now()}`,
        date,
        mood: data.mood,
        duration_type: data.durationType ?? DurationType.Quick,
        journal_entry: data.journalEntry,
        dimension_scores: data.scores.map(s => ({
          dimension: s.dimension,
          score: s.score,
        })),
      });

      // Navigate to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError('Failed to save check-in. Please try again.');
      setLoading(false);
    }
  }

  return (
    <>
      {error && (
        <div className="glass-card p-4 mb-4 border-l-4 border-red-500">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      <CheckInForm onSubmit={handleSubmit} loading={loading} />
    </>
  );
}
