import { type Dimension, DIMENSION_LABELS } from '@life-design/core';
import { dimensionPalettes } from '../../tokens/dimensions';
import { cn } from '../../utils/cn';

export interface BarSegment {
  dimension: Dimension;
  hours: number;
}

export interface BarStackProps {
  segments: BarSegment[];
  variant?: 'actual' | 'suggested';
  className?: string;
}

export function BarStack({ segments, variant = 'actual', className }: BarStackProps) {
  const total = segments.reduce((sum, s) => sum + s.hours, 0);
  if (total === 0) return null;

  return (
    <div className={cn('flex h-7 rounded-[8px] overflow-hidden', variant === 'suggested' && 'opacity-50 border border-dashed border-stone-300', className)}>
      {segments.map(seg => {
        const pct = (seg.hours / total) * 100;
        if (pct < 2) return null;
        const abbr = DIMENSION_LABELS[seg.dimension][0];
        return (
          <div
            key={seg.dimension}
            className="flex items-center justify-center text-[11px] font-semibold text-white"
            style={{ width: `${pct}%`, backgroundColor: dimensionPalettes[seg.dimension].accent }}
            title={`${DIMENSION_LABELS[seg.dimension]}: ${seg.hours}h`}
          >
            {pct > 8 ? abbr : ''}
          </div>
        );
      })}
    </div>
  );
}
