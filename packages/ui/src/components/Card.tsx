import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../utils/cn';
import { dimensionPalettes, dimensionShadow } from '../tokens/dimensions';
import type { Dimension } from '@life-design/core';

export type CardVariant = 'default' | 'raised' | 'sunken' | 'dimension';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  dimension?: Dimension;
  hoverable?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white border border-stone-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]',
  raised: 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]',
  sunken: 'bg-stone-100 shadow-none',
  dimension: 'bg-white',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', dimension, hoverable, className, style, children, ...props }, ref) => {
    const dimStyles = variant === 'dimension' && dimension ? {
      borderColor: dimensionPalettes[dimension].border,
      boxShadow: dimensionShadow(dimension),
    } : {};
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-[16px] p-6',
          variantStyles[variant],
          variant === 'dimension' && 'border',
          hoverable && 'transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]',
          className,
        )}
        style={{ ...dimStyles, ...style }}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Card.displayName = 'Card';
