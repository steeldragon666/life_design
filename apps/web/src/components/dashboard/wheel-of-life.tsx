'use client';

import { RadarChart } from '@life-design/ui';
import type { Dimension } from '@life-design/core';
import { Card } from '@life-design/ui';

interface WheelOfLifeProps {
  scores: { dimension: Dimension | string; score: number }[];
}

export default function WheelOfLife({ scores }: WheelOfLifeProps) {
  if (scores.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center min-h-[300px] text-center">
        <div className="h-12 w-12 rounded-full border-2 border-dashed border-stone-200 flex items-center justify-center mb-4">
          <span className="text-xl">📊</span>
        </div>
        <h3 className="text-xl font-bold text-stone-800">Wheel of Life</h3>
        <p className="text-stone-500 max-w-[200px] mt-2">
          Complete a check-in to visualize your dimensions.
        </p>
      </Card>
    );
  }

  // Build scores map for RadarChart (expects Partial<Record<Dimension, number>>)
  const scoresMap = scores.reduce<Partial<Record<Dimension, number>>>((acc, s) => {
    acc[s.dimension as Dimension] = s.score;
    return acc;
  }, {});

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-serif font-bold text-stone-900">Wheel of Life</h3>
        <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">Current Balance</span>
      </div>

      <div className="relative flex justify-center w-full py-2">
        <RadarChart scores={scoresMap} size={320} />
      </div>
    </Card>
  );
}
