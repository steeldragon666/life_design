'use client';

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { Dimension, DIMENSION_LABELS } from '@life-design/core';

interface WheelOfLifeProps {
  scores: { dimension: Dimension | string; score: number }[];
}

export default function WheelOfLife({ scores }: WheelOfLifeProps) {
  if (scores.length === 0) {
    return (
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Wheel of Life</h2>
        <p className="text-gray-500">No data yet. Complete a check-in to see your wheel.</p>
      </div>
    );
  }

  const data = scores.map((s) => ({
    dimension: DIMENSION_LABELS[s.dimension as Dimension] ?? s.dimension,
    score: s.score,
    fullMark: 10,
  }));

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">Wheel of Life</h2>
      <ResponsiveContainer width="100%" height={350}>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 10 }} />
          <Radar
            name="Score"
            dataKey="score"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.3}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
