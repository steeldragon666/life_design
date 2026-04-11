import { Home } from 'lucide-react';
import { cn } from '../../../utils/cn';

const sizeMap = { sm: 16, md: 20, lg: 24 };

export interface FamilyIconProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FamilyIcon({ size = 'md', className }: FamilyIconProps) {
  return <Home size={sizeMap[size]} className={cn('shrink-0 text-[var(--color-dim-family)]', className)} />;
}
