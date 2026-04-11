import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const badgeVariants = cva(
  'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold',
  {
    variants: {
      variant: {
        sage: 'bg-sage-100 text-sage-600',
        warm: 'bg-warm-100 text-warm-500',
        accent: 'bg-accent-400/20 text-accent-600',
        stone: 'bg-stone-100 text-stone-600',
        success: 'bg-sage-100 text-sage-600',
        warning: 'bg-warm-100 text-warm-500',
        destructive: 'bg-red-50 text-destructive',
      },
    },
    defaultVariants: {
      variant: 'sage',
    },
  },
);

export type BadgeVariant = 'sage' | 'warm' | 'accent' | 'stone' | 'success' | 'warning' | 'destructive';

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ variant = 'sage', className, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  );
}

export { badgeVariants };
