import { Heart } from 'lucide-react';
import { cn } from '../../../utils/cn';

const sizeMap = { sm: 16, md: 20, lg: 24 };

export interface HealthIconProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function HealthIcon({ size = 'md', className }: HealthIconProps) {
  return <Heart size={sizeMap[size]} className={cn('shrink-0 text-[var(--color-dim-health)]', className)} />;
}
