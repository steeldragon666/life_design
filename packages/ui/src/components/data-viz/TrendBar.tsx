import type { Dimension } from '@life-design/core';
import { dimensionPalettes } from '../../tokens/dimensions';
import { cn } from '../../utils/cn';

export interface TrendBarProps {
  dimension: Dimension;
  value: number;
  max?: number;
  label?: string;
  className?: string;
}

export function TrendBar({ dimension, value, max = 10, label, className }: TrendBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  const palette = dimensionPalettes[dimension];

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-stone-700">{label}</span>
          <span className="font-mono text-sm font-semibold text-stone-800">{value.toFixed(1)}</span>
        </div>
      )}
      <div className="h-1 w-full rounded-full bg-stone-200 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${palette.accent}, ${palette.bg})` }}
        />
      </div>
    </div>
  );
}
