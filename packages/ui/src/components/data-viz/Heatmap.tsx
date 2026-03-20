'use client';

import { useState } from 'react';
import { type Dimension, ALL_DIMENSIONS, DIMENSION_LABELS } from '@life-design/core';
import { dimensionPalettes } from '../../tokens/dimensions';
import { cn } from '../../utils/cn';

export interface HeatmapCell {
  dim1: Dimension;
  dim2: Dimension;
  coefficient: number;
}

export interface HeatmapProps {
  data: HeatmapCell[];
  className?: string;
}

function cellColor(coeff: number): string {
  const abs = Math.abs(coeff);
  if (coeff >= 0) {
    // Sage scale: stronger = more opaque
    return `rgba(90, 127, 90, ${abs * 0.6 + 0.05})`;
  }
  // Warm scale
  return `rgba(154, 91, 45, ${abs * 0.6 + 0.05})`;
}

export function Heatmap({ data, className }: HeatmapProps) {
  const [hover, setHover] = useState<HeatmapCell | null>(null);

  const lookup = new Map<string, number>();
  data.forEach(c => {
    lookup.set(`${c.dim1}-${c.dim2}`, c.coefficient);
    lookup.set(`${c.dim2}-${c.dim1}`, c.coefficient);
  });

  return (
    <div className={cn('relative', className)}>
      <div className="grid gap-1" style={{ gridTemplateColumns: `60px repeat(${ALL_DIMENSIONS.length}, 1fr)` }}>
        {/* Header row */}
        <div />
        {ALL_DIMENSIONS.map(d => (
          <div key={d} className="text-[11px] font-medium text-stone-500 text-center truncate px-0.5">
            {DIMENSION_LABELS[d].slice(0, 3)}
          </div>
        ))}

        {/* Data rows */}
        {ALL_DIMENSIONS.map(row => (
          <>
            <div key={`label-${row}`} className="text-[11px] font-medium text-stone-600 flex items-center">
              {DIMENSION_LABELS[row].slice(0, 6)}
            </div>
            {ALL_DIMENSIONS.map(col => {
              const isDiagonal = row === col;
              const coeff = isDiagonal ? 1 : (lookup.get(`${row}-${col}`) ?? 0);
              return (
                <div
                  key={`${row}-${col}`}
                  className="aspect-square rounded-[4px] flex items-center justify-center text-[11px] font-mono cursor-default transition-transform hover:scale-110"
                  style={{
                    backgroundColor: isDiagonal ? dimensionPalettes[row].accent : cellColor(coeff),
                    color: isDiagonal ? 'white' : (Math.abs(coeff) > 0.4 ? 'white' : 'transparent'),
                  }}
                  onMouseEnter={() => setHover({ dim1: row, dim2: col, coefficient: coeff })}
                  onMouseLeave={() => setHover(null)}
                >
                  {isDiagonal ? '—' : coeff.toFixed(2)}
                </div>
              );
            })}
          </>
        ))}
      </div>

      {/* Tooltip */}
      {hover && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-stone-800 text-white text-[11px] font-medium whitespace-nowrap z-10 shadow-lg">
          {DIMENSION_LABELS[hover.dim1]} × {DIMENSION_LABELS[hover.dim2]}: {hover.coefficient.toFixed(3)}
        </div>
      )}
    </div>
  );
}
