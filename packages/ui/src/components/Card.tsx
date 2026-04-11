import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';
import { dimensionPalettes, dimensionShadow } from '../tokens/dimensions';
import type { Dimension } from '@life-design/core';

const cardVariants = cva('rounded-[16px] p-6', {
  variants: {
    variant: {
      default:
        'bg-white border border-stone-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]',
      raised:
        'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]',
      sunken: 'bg-stone-100 shadow-none',
      dimension: 'bg-white',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export type CardVariant = 'default' | 'raised' | 'sunken' | 'dimension';

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  dimension?: Dimension;
  hoverable?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', dimension, hoverable, className, style, children, ...props }, ref) => {
    const dimStyles =
      variant === 'dimension' && dimension
        ? {
            borderColor: dimensionPalettes[dimension].border,
            boxShadow: dimensionShadow(dimension),
          }
        : {};
    return (
      <div
        ref={ref}
        className={cn(
          cardVariants({ variant }),
          variant === 'dimension' && 'border',
          hoverable && 'hover-lift cursor-pointer',
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
export { cardVariants };
