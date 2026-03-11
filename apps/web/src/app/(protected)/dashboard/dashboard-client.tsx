'use client';

import Link from 'next/link';
import { Dimension, DIMENSION_LABELS, ALL_DIMENSIONS } from '@life-design/core';
import WheelOfLife from '@/components/dashboard/wheel-of-life';
import TrendSparkline from '@/components/dashboard/trend-sparkline';
import StreakCounter from '@/components/dashboard/streak-counter';
import InsightCard from '@/components/insights/insight-card';

interface InsightData {
  id: string;
  type: 'trend' | 'correlation' | 'suggestion' | 'goal_progress' | 'goal_risk';
  title: string;
  body: string;
  dimension: string | null;
}

interface GoalsSummary {
  total: number;
  byHorizon: { short: number; medium: number; long: number };
  nearestDeadline: Record<string, unknown> | null;
}

interface DashboardClientProps {
  latestScores: { dimension: string; score: number }[];
  overallScore: number;
  streak: number;
  dimensionTrends: Record<string, { date: string; score: number }[]>;
  recentInsights: InsightData[];
  goalsSummary?: GoalsSummary;
}

export default function DashboardClient({
  latestScores,
  overallScore,
  streak,
  dimensionTrends,
  recentInsights,
  goalsSummary,
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

      {/* Active Goals Summary */}
      {goalsSummary && goalsSummary.total > 0 && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Active Goals</h2>
            <Link href="/goals" className="text-sm text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-green-50 p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{goalsSummary.byHorizon.short}</p>
              <p className="text-xs text-green-600">Short-term</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{goalsSummary.byHorizon.medium}</p>
              <p className="text-xs text-amber-600">Medium-term</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{goalsSummary.byHorizon.long}</p>
              <p className="text-xs text-blue-600">Long-term</p>
            </div>
          </div>
          {goalsSummary.nearestDeadline && (() => {
            const days = Math.ceil(
              (new Date(goalsSummary.nearestDeadline.target_date as string).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            return (
              <p className={`text-xs ${days < 7 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                Next deadline: &quot;{goalsSummary.nearestDeadline.title as string}&quot; in {days > 0 ? `${days} days` : 'overdue'}
              </p>
            );
          })()}
        </div>
      )}

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
