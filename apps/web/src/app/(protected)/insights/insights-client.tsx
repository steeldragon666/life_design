'use client';

import { useRouter } from 'next/navigation';
import { Lightbulb } from 'lucide-react';
import { EmptyState } from '@life-design/ui';
import InsightCard from '@/components/insights/insight-card';
import { dismissInsightAction } from './actions';

interface InsightData {
  id: string;
  type: 'trend' | 'correlation' | 'suggestion' | 'goal_progress' | 'goal_risk';
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
      <EmptyState
        icon={<Lightbulb size={32} />}
        heading="No insights yet"
        description="Keep checking in to get personalized analysis."
      />
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
