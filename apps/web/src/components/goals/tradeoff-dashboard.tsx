'use client';

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ALL_DIMENSIONS, DIMENSION_LABELS, type Dimension } from '@life-design/core';

interface TradeoffDashboardProps {
  currentScores: Record<string, number>; // dimension -> current average
  dimensionImpacts: Array<{ dimension: string; impact: number; explanation: string }>;
  goalTitle: string;
}

export default function TradeoffDashboard({
  currentScores,
  dimensionImpacts,
  goalTitle,
}: TradeoffDashboardProps) {
  const impactMap = new Map(dimensionImpacts.map((i) => [i.dimension, i]));

  const radarData = ALL_DIMENSIONS.map((dim) => {
    const current = currentScores[dim] ?? 5;
    const impact = impactMap.get(dim);
    const projected = Math.max(1, Math.min(5, current + (impact?.impact ?? 0)));
    return {
      dimension: DIMENSION_LABELS[dim],
      current,
      projected,
    };
  });

  // Find at-risk dimensions (projected < 4)
  const atRisk = radarData.filter((d) => d.projected < 4);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Trade-off Analysis: {goalTitle}</h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10 }} />
            <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 9 }} />
            <Radar
              name="Current"
              dataKey="current"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Radar
              name="Projected"
              dataKey="projected"
              stroke="#f59e0b"
              fill="#f59e0b"
              fillOpacity={0.1}
              strokeWidth={2}
              strokeDasharray="5 5"
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {atRisk.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-xs font-semibold text-red-700">Risk Alerts</p>
          {atRisk.map((d) => {
            const impact = impactMap.get(
              ALL_DIMENSIONS.find((dim) => DIMENSION_LABELS[dim] === d.dimension) ?? ''
            );
            return (
              <p key={d.dimension} className="text-xs text-red-600 mt-1">
                <strong>{d.dimension}</strong> projected to drop to {d.projected.toFixed(1)}/5
                {impact ? ` — ${impact.explanation}` : ''}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
