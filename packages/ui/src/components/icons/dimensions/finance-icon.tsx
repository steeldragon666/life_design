import { DollarSign } from 'lucide-react';
import { cn } from '../../../utils/cn';

const sizeMap = { sm: 16, md: 20, lg: 24 };

export interface FinanceIconProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FinanceIcon({ size = 'md', className }: FinanceIconProps) {
  return <DollarSign size={sizeMap[size]} className={cn('shrink-0 text-[var(--color-dim-finance)]', className)} />;
}
