import { type LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';

export interface IconProps {
  icon: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = { sm: 16, md: 20, lg: 24 };

export function Icon({ icon: IconComponent, size = 'md', className }: IconProps) {
  return <IconComponent size={sizeMap[size]} className={cn('shrink-0', className)} />;
}
