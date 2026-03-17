'use client';

import { useParams } from 'next/navigation';
import ActiveChallengeView from '@/components/challenges/ActiveChallengeView';

export default function ChallengePage() {
  const params = useParams();
  const id = Number(params.id);

  if (isNaN(id)) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-stone-500">Invalid challenge ID.</p>
      </div>
    );
  }

  return <ActiveChallengeView activeChallengeId={id} />;
}
