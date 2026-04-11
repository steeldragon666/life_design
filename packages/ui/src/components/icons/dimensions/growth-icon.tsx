import { TrendingUp } from 'lucide-react';
import { cn } from '../../../utils/cn';

const sizeMap = { sm: 16, md: 20, lg: 24 };

export interface GrowthIconProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function GrowthIcon({ size = 'md', className }: GrowthIconProps) {
  return <TrendingUp size={sizeMap[size]} className={cn('shrink-0 text-[var(--color-dim-growth)]', className)} />;
}
