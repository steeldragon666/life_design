import { Briefcase } from 'lucide-react';
import { cn } from '../../../utils/cn';

const sizeMap = { sm: 16, md: 20, lg: 24 };

export interface CareerIconProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CareerIcon({ size = 'md', className }: CareerIconProps) {
  return <Briefcase size={sizeMap[size]} className={cn('shrink-0 text-[var(--color-dim-career)]', className)} />;
}
