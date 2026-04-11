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
import { Card } from '@life-design/ui';

interface PathwaySummary {
  title: string;
  dimensionImpacts: Array<{ dimension: string; impact: number; explanation: string }>;
}

interface ScenarioComparisonProps {
  pathways: PathwaySummary[];
}

// Token-aligned colors: sage-500, warm-400, accent-500, destructive
const PATHWAY_COLORS = [
  'var(--color-sage-500)',
  'var(--color-warm-400)',
  'var(--color-accent-500)',
  'var(--color-destructive)',
];

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
  pathways.forEach((pw) => {
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
      <h3 className="text-sm font-semibold text-stone-800">Pathway Comparison</h3>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis dataKey="dimension" tick={{ fontSize: 9, fill: 'var(--color-stone-500)' }} />
            <YAxis domain={[-5, 5]} tick={{ fontSize: 10, fill: 'var(--color-stone-500)' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface-default)',
                border: '1px solid var(--color-stone-200)',
                borderRadius: '8px',
                fontSize: 12,
              }}
            />
            <ReferenceLine y={0} stroke="var(--color-stone-200)" />
            <Legend wrapperStyle={{ fontSize: 11, color: 'var(--color-stone-600)' }} />
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
        <Card className="p-3 bg-sage-50 border-sage-100">
          <p className="text-xs font-semibold text-sage-700">Summary</p>
          {summaryParts.map((s, i) => (
            <p key={i} className="text-xs text-sage-600 mt-1">- {s}</p>
          ))}
        </Card>
      )}
    </div>
  );
}
