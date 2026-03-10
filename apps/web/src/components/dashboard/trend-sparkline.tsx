'use client';

import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
} from 'recharts';
import { computeTrend } from '@life-design/core';

interface TrendSparklineProps {
  data: { date: string; score: number }[];
  label: string;
  color?: string;
}

export default function TrendSparkline({
  data,
  label,
  color = '#6366f1',
}: TrendSparklineProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium w-28">{label}</span>
        <span className="text-xs text-gray-400">No data</span>
      </div>
    );
  }

  const trend = computeTrend(data.map((d) => d.score));
  const trendIndicator = trend > 0.1 ? '▲' : trend < -0.1 ? '▼' : '—';
  const trendColor =
    trend > 0.1 ? 'text-green-600' : trend < -0.1 ? 'text-red-600' : 'text-gray-400';

  const latest = data[data.length - 1]?.score ?? 0;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium w-28">{label}</span>
      <div className="flex-1 h-8">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <YAxis domain={[0, 10]} hide />
            <Line
              type="monotone"
              dataKey="score"
              stroke={color}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <span className="text-sm font-semibold w-6 text-right">{latest}</span>
      <span className={`text-sm ${trendColor}`}>{trendIndicator}</span>
    </div>
  );
}
