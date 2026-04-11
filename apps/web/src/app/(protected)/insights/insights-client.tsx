'use client';

import { useRouter } from 'next/navigation';
import { Lightbulb, Lock } from 'lucide-react';
import { EmptyState } from '@life-design/ui';
import { OptInTier, isFeatureAvailable } from '@life-design/core';
import InsightCard from '@/components/insights/insight-card';
import PopulationInsights from './population-insights';
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
  userTier?: OptInTier;
}

function LockedPopulationInsights() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-stone-200 bg-stone-50 p-6">
      {/* Blurred preview overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-stone-50/80 backdrop-blur-[2px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-200">
            <Lock size={18} className="text-stone-500" />
          </div>
          <h3 className="text-base font-semibold text-stone-800">
            Population Insights
          </h3>
          <p className="max-w-sm text-sm text-stone-500">
            See how your patterns compare to anonymised community trends.
            Available with the Full data-sharing tier.
          </p>
          <a
            href="/settings"
            className="mt-1 inline-flex items-center gap-1 rounded-lg bg-sage-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sage-600"
          >
            Upgrade tier
          </a>
        </div>
      </div>

      {/* Placeholder content behind blur */}
      <div className="pointer-events-none select-none opacity-40" aria-hidden="true">
        <div className="mb-3 h-5 w-36 rounded bg-stone-200" />
        <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-stone-200 bg-white p-4">
              <div className="mb-2 h-3 w-20 rounded bg-stone-200" />
              <div className="mb-1 h-5 w-28 rounded bg-stone-200" />
              <div className="h-3 w-36 rounded bg-stone-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function InsightsClient({ insights, userTier }: InsightsClientProps) {
  const router = useRouter();
  const hasFullAccess = userTier
    ? isFeatureAvailable(userTier, OptInTier.Full)
    : false;

  async function handleDismiss(id: string) {
    await dismissInsightAction(id);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {/* Population insights — gated on Full tier */}
      {hasFullAccess ? <PopulationInsights /> : <LockedPopulationInsights />}

      {/* Personal insights */}
      {insights.length === 0 ? (
        <EmptyState
          icon={<Lightbulb size={32} />}
          heading="No insights yet"
          description="Keep checking in to get personalized analysis."
        />
      ) : (
        <div className="space-y-4">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} onDismiss={handleDismiss} />
          ))}
        </div>
      )}
    </div>
  );
}
