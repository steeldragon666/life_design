'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DurationType } from '@life-design/core';
import CheckInForm from '@/components/checkin/checkin-form';
import type { CheckInFormData } from '@/components/checkin/checkin-form';
import { submitCheckIn } from './actions';

interface CheckInClientProps {
  date: string;
}

export default function CheckInClient({ date }: CheckInClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(data: CheckInFormData) {
    setLoading(true);
    setError(null);

    const result = await submitCheckIn({
      date,
      mood: data.mood,
      durationType: data.durationType ?? DurationType.Quick,
      scores: data.scores,
      journalEntry: data.journalEntry,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  }

  return (
    <>
      {error && (
        <p className="text-sm text-red-600 mb-4">{error}</p>
      )}
      <CheckInForm onSubmit={handleSubmit} loading={loading} />
    </>
  );
}
