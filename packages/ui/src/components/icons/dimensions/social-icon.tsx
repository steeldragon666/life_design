import { Users } from 'lucide-react';
import { cn } from '../../../utils/cn';

const sizeMap = { sm: 16, md: 20, lg: 24 };

export interface SocialIconProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SocialIcon({ size = 'md', className }: SocialIconProps) {
  return <Users size={sizeMap[size]} className={cn('shrink-0 text-[var(--color-dim-social)]', className)} />;
}
