'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../utils/cn';

const statCardVariants = cva(
  'rounded-2xl border p-4 transition-all',
  {
    variants: {
      variant: {
        default: 'bg-surface-default border-stone-200',
        glass: 'bg-white/10 backdrop-blur-md border-white/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface StatCardProps extends VariantProps<typeof statCardVariants> {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'flat' | 'neutral';
  changePercent?: number;
  sparkline?: React.ReactNode;
  className?: string;
}

const trendConfig = {
  up: { icon: TrendingUp, color: 'text-sage-500', label: 'Trending up' },
  down: { icon: TrendingDown, color: 'text-destructive', label: 'Trending down' },
  flat: { icon: Minus, color: 'text-stone-400', label: 'No change' },
  neutral: { icon: Minus, color: 'text-stone-400', label: 'No change' },
};

export function StatCard({ label, value, trend, changePercent, sparkline, variant, className }: StatCardProps) {
  const trendInfo = trend ? trendConfig[trend] : null;
  const TrendIcon = trendInfo?.icon;

  return (
    <div className={cn(statCardVariants({ variant }), className)}>
      <p className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-2">
        {label}
      </p>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-stone-800 font-mono">
          {value}
        </span>
        {trendInfo && TrendIcon && (
          <span className={cn('flex items-center gap-1 text-xs font-medium', trendInfo.color)} aria-label={trendInfo.label}>
            <TrendIcon size={14} />
            {changePercent !== undefined && `${Math.abs(changePercent).toFixed(1)}%`}
          </span>
        )}
      </div>
      {sparkline && <div className="mt-3">{sparkline}</div>}
    </div>
  );
}

export { statCardVariants };
