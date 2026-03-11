'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { ALL_DIMENSIONS, DIMENSION_LABELS, type Dimension } from '@life-design/core';

interface PathwaySummary {
  title: string;
  dimensionImpacts: Array<{ dimension: string; impact: number; explanation: string }>;
}

interface ScenarioComparisonProps {
  pathways: PathwaySummary[];
}

const PATHWAY_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444'];

export default function ScenarioComparison({ pathways }: ScenarioComparisonProps) {
  if (pathways.length < 2) return null;

  // Build chart data: one entry per dimension with each pathway's impact as a bar
  const chartData = ALL_DIMENSIONS.map((dim) => {
    const entry: Record<string, unknown> = {
      dimension: DIMENSION_LABELS[dim],
    };
    pathways.forEach((pw, i) => {
      const impact = pw.dimensionImpacts.find((d) => d.dimension === dim);
      entry[`pathway${i}`] = impact?.impact ?? 0;
    });
    return entry;
  });

  // Generate summary comparison
  const summaryParts: string[] = [];
  pathways.forEach((pw, i) => {
    const positives = pw.dimensionImpacts.filter((d) => d.impact >= 2);
    const negatives = pw.dimensionImpacts.filter((d) => d.impact <= -2);
    if (positives.length > 0 || negatives.length > 0) {
      const parts: string[] = [];
      if (positives.length > 0) {
        parts.push(`boosts ${positives.map((p) => DIMENSION_LABELS[p.dimension as Dimension] ?? p.dimension).join(', ')}`);
      }
      if (negatives.length > 0) {
        parts.push(`impacts ${negatives.map((n) => DIMENSION_LABELS[n.dimension as Dimension] ?? n.dimension).join(', ')}`);
      }
      summaryParts.push(`${pw.title} ${parts.join(' but ')}`);
    }
  });

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Pathway Comparison</h3>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis dataKey="dimension" tick={{ fontSize: 9 }} />
            <YAxis domain={[-5, 5]} tick={{ fontSize: 10 }} />
            <Tooltip />
            <ReferenceLine y={0} stroke="#d1d5db" />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {pathways.map((pw, i) => (
              <Bar
                key={i}
                dataKey={`pathway${i}`}
                name={pw.title}
                fill={PATHWAY_COLORS[i % PATHWAY_COLORS.length]}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {summaryParts.length > 0 && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
          <p className="text-xs font-semibold text-blue-700">Summary</p>
          {summaryParts.map((s, i) => (
            <p key={i} className="text-xs text-blue-600 mt-1">- {s}</p>
          ))}
        </div>
      )}
    </div>
  );
}
