'use client';

import { Sparkline } from '@life-design/ui';
import type { Dimension } from '@life-design/core';
import { computeTrend } from '@life-design/core';

interface TrendSparklineProps {
  data: { date: string; score: number }[];
  label: string;
  dimension?: Dimension;
  color?: string;
}

export default function TrendSparkline({
  data,
  label,
  dimension,
  color,
}: TrendSparklineProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium w-28 text-stone-700">{label}</span>
        <span className="text-xs text-stone-500">No data</span>
      </div>
    );
  }

  const scores = data.map((d) => d.score);
  const trend = computeTrend(scores);
  const trendIndicator = trend > 0.1 ? '▲' : trend < -0.1 ? '▼' : '—';
  const trendColor =
    trend > 0.1 ? 'text-sage-500' : trend < -0.1 ? 'text-red-600' : 'text-stone-500';

  const latest = data[data.length - 1]?.score ?? 0;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium w-28 text-stone-700">{label}</span>
      <div className="flex-1">
        <Sparkline data={scores} dimension={dimension} color={color} width={120} height={32} />
      </div>
      <span className="text-sm font-semibold w-6 text-right text-stone-800">{latest}</span>
      <span className={`text-sm ${trendColor}`}>{trendIndicator}</span>
    </div>
  );
}
