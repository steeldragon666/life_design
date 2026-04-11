import { type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

export const stackVariants = cva('flex', {
  variants: {
    direction: {
      horizontal: 'flex-row',
      vertical: 'flex-col',
    },
    gap: {
      none: 'gap-0',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
    },
  },
  defaultVariants: {
    direction: 'vertical',
    gap: 'md',
    align: 'stretch',
    justify: 'start',
  },
});

export interface StackProps extends VariantProps<typeof stackVariants> {
  children: ReactNode;
  className?: string;
}

export function Stack({ direction, gap, align, justify, children, className }: StackProps) {
  return (
    <div className={cn(stackVariants({ direction, gap, align, justify }), className)}>
      {children}
    </div>
  );
}
