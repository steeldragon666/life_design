'use client';


interface TrendIndicatorProps {
  direction: 'up' | 'down' | 'neutral';
  percent: number;
  period?: string;
  className?: string;
}

const DIRECTION_CONFIG = {
  up: { arrow: '\u2191', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  down: { arrow: '\u2193', color: 'text-red-400', bg: 'bg-red-500/10' },
  neutral: { arrow: '\u2192', color: 'text-slate-400', bg: 'bg-slate-500/10' },
};

/**
 * Arrow icon + percentage change indicator.
 * Green/red/grey based on direction with optional tooltip period.
 */
export default function TrendIndicator({
  direction,
  percent,
  period,
  className = '',
}: TrendIndicatorProps) {
  const config = DIRECTION_CONFIG[direction];

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-bold rounded-full px-2 py-0.5 ${config.color} ${config.bg} ${className}`}
      title={period ? `Over ${period}` : undefined}
    >
      {config.arrow} {Math.abs(percent).toFixed(1)}%
    </span>
  );
}
