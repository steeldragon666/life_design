'use client';

import { useRouter } from 'next/navigation';
import InsightCard from '@/components/insights/insight-card';
import { dismissInsightAction } from './actions';

interface InsightData {
  id: string;
  type: 'trend' | 'correlation' | 'suggestion';
  title: string;
  body: string;
  dimension: string | null;
}

interface InsightsClientProps {
  insights: InsightData[];
}

export default function InsightsClient({ insights }: InsightsClientProps) {
  const router = useRouter();

  async function handleDismiss(id: string) {
    await dismissInsightAction(id);
    router.refresh();
  }

  if (insights.length === 0) {
    return (
      <p className="py-12 text-center text-stone-500">
        No insights yet. Keep checking in to get personalized analysis.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {insights.map((insight) => (
        <InsightCard key={insight.id} insight={insight} onDismiss={handleDismiss} />
      ))}
    </div>
  );
}
