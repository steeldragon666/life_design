import { type LucideIcon } from 'lucide-react';
import { cn } from '../../../utils/cn';

const sizeMap = { sm: 16, md: 20, lg: 24 };

export interface DimensionIconProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Factory that creates a dimension-specific icon component.
 * All dimension icons share the same props/structure —
 * only the Lucide icon and CSS variable differ.
 */
export function createDimensionIcon(
  IconComponent: LucideIcon,
  dimension: string,
  displayName: string,
) {
  function DimensionIcon({ size = 'md', className }: DimensionIconProps) {
    return (
      <IconComponent
        size={sizeMap[size]}
        className={cn(`shrink-0 text-[var(--color-dim-${dimension})]`, className)}
      />
    );
  }
  DimensionIcon.displayName = displayName;
  return DimensionIcon;
}
