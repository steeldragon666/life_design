import { Dumbbell } from 'lucide-react';
import { cn } from '../../../utils/cn';

const sizeMap = { sm: 16, md: 20, lg: 24 };

export interface FitnessIconProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FitnessIcon({ size = 'md', className }: FitnessIconProps) {
  return <Dumbbell size={sizeMap[size]} className={cn('shrink-0 text-[var(--color-dim-fitness)]', className)} />;
}
