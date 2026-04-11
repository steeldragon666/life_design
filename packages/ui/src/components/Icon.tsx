import { type LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';

export interface IconProps {
  icon: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = { sm: 16, md: 20, lg: 24 };

export function Icon({ icon: LucideIcon, size = 'md', className }: IconProps) {
  return <LucideIcon size={sizeMap[size]} className={cn('shrink-0', className)} />;
}
