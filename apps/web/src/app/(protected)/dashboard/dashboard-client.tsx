'use client';

import Link from 'next/link';
import { Dimension, DIMENSION_LABELS, ALL_DIMENSIONS } from '@life-design/core';
import WheelOfLife from '@/components/dashboard/wheel-of-life';
import TrendSparkline from '@/components/dashboard/trend-sparkline';
import StreakCounter from '@/components/dashboard/streak-counter';
import InsightCard from '@/components/insights/insight-card';

interface InsightData {
  id: string;
  type: 'trend' | 'correlation' | 'suggestion';
  title: string;
  body: string;
  dimension: string | null;
}

interface DashboardClientProps {
  latestScores: { dimension: string; score: number }[];
  overallScore: number;
  streak: number;
  dimensionTrends: Record<string, { date: string; score: number }[]>;
  recentInsights: InsightData[];
}

export default function DashboardClient({
  latestScores,
  overallScore,
  streak,
  dimensionTrends,
  recentInsights,
}: DashboardClientProps) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold">{overallScore.toFixed(1)}</p>
            <p className="text-xs text-gray-500">Overall</p>
          </div>
          <StreakCounter streak={streak} />
        </div>
      </div>

      <WheelOfLife scores={latestScores as { dimension: Dimension; score: number }[]} />

      {recentInsights.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Insights</h2>
            <Link href="/insights" className="text-sm text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          {recentInsights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} onDismiss={() => {}} />
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Trends (30 days)</h2>
        {ALL_DIMENSIONS.map((dim) => (
          <TrendSparkline
            key={dim}
            label={DIMENSION_LABELS[dim]}
            data={dimensionTrends[dim] ?? []}
          />
        ))}
      </div>
    </div>
  );
}
