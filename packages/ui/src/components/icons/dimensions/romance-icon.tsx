import { HeartHandshake } from 'lucide-react';
import { cn } from '../../../utils/cn';

const sizeMap = { sm: 16, md: 20, lg: 24 };

export interface RomanceIconProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RomanceIcon({ size = 'md', className }: RomanceIconProps) {
  return <HeartHandshake size={sizeMap[size]} className={cn('shrink-0 text-[var(--color-dim-romance)]', className)} />;
}
