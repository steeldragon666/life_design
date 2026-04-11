'use client';

import { cn } from '../utils/cn';
import { DimensionCard } from '../components/DimensionCard';
import type { DimensionName } from '../components/DimensionCard';

export interface DimensionData {
  name: string;
  label: string;
  score: number;
  trend?: 'up' | 'down' | 'flat';
  onClick?: () => void;
}

export interface DimensionGridProps {
  dimensions: DimensionData[];
  className?: string;
}

export function DimensionGrid({ dimensions, className }: DimensionGridProps) {
  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-3', className)}>
      {dimensions.map((dim) => (
        <DimensionCard
          key={dim.name}
          dimension={dim.name as DimensionName}
          label={dim.label}
          score={dim.score}
          trend={dim.trend}
          onClick={dim.onClick}
        />
      ))}
    </div>
  );
}
