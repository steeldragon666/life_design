'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { DIMENSION_LABELS, type Dimension } from '@life-design/core';

interface DimensionImpactChartProps {
  impacts: Array<{ dimension: string; impact: number; explanation: string }>;
}

function getBarColor(impact: number): string {
  if (impact >= 3) return 'var(--color-sage-600)';
  if (impact >= 1) return 'var(--color-sage-500)';
  if (impact > -1) return 'var(--color-stone-400)';
  if (impact > -3) return '#ea580c';  // orange-600
  return '#dc2626';                    // red-600
}

export default function DimensionImpactChart({ impacts }: DimensionImpactChartProps) {
  const data = impacts.map((i) => ({
    name: DIMENSION_LABELS[i.dimension as Dimension] ?? i.dimension,
    impact: i.impact,
    explanation: i.explanation,
    fill: getBarColor(i.impact),
  }));

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">Dimension Impact Analysis</h4>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 80, right: 20 }}>
            <XAxis type="number" domain={[-5, 5]} ticks={[-5, -3, -1, 0, 1, 3, 5]} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={75} />
            <Tooltip
              content={({ payload }) => {
                if (!payload || payload.length === 0) return null;
                const d = payload[0].payload;
                return (
                  <div className="rounded-lg border bg-white p-2 shadow-sm text-xs max-w-[250px]">
                    <p className="font-semibold">{d.name}: {d.impact > 0 ? '+' : ''}{d.impact}</p>
                    <p className="text-stone-600 mt-0.5">{d.explanation}</p>
                  </div>
                );
              }}
            />
            <ReferenceLine x={0} stroke="var(--color-stone-300)" />
            <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-stone-400 text-center">Hover for details. Scale: -5 (severe negative) to +5 (highly positive)</p>
    </div>
  );
}
