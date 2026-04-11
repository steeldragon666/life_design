'use client';

import { cn } from '../utils/cn';
import { Card } from './Card';

export type DimensionName = 'career' | 'finance' | 'health' | 'fitness' | 'family' | 'social' | 'romance' | 'growth';

export interface DimensionCardProps {
  dimension: DimensionName;
  label: string;
  score: number; // 0-10
  trend?: 'up' | 'down' | 'flat';
  onClick?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export function DimensionCard({ dimension, label, score, trend, onClick, icon, className }: DimensionCardProps) {
  return (
    <Card
      variant="raised"
      hoverable={!!onClick}
      onClick={onClick}
      className={cn('p-4', className)}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl"
            style={{ backgroundColor: `var(--color-dim-${dimension}-bg)` }}
          >
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-700 truncate">{label}</p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-lg font-bold"
              style={{ color: `var(--color-dim-${dimension})` }}
            >
              {score.toFixed(1)}
            </span>
            {trend && (
              <span className={cn(
                'text-xs font-medium',
                trend === 'up' && 'text-sage-500',
                trend === 'down' && 'text-destructive',
                trend === 'flat' && 'text-stone-400',
              )}>
                {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
