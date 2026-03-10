'use client';

import { Dimension, DIMENSION_LABELS, ALL_DIMENSIONS } from '@life-design/core';
import WheelOfLife from '@/components/dashboard/wheel-of-life';
import TrendSparkline from '@/components/dashboard/trend-sparkline';
import StreakCounter from '@/components/dashboard/streak-counter';

interface DashboardClientProps {
  latestScores: { dimension: string; score: number }[];
  overallScore: number;
  streak: number;
  dimensionTrends: Record<string, { date: string; score: number }[]>;
}

export default function DashboardClient({
  latestScores,
  overallScore,
  streak,
  dimensionTrends,
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
