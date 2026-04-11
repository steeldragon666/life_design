import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const separatorVariants = cva('bg-stone-200', {
  variants: {
    orientation: {
      horizontal: 'h-px w-full',
      vertical: 'w-px h-full',
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
  },
});

export interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
  className?: string;
}

export function Separator({ orientation = 'horizontal', decorative = false, className, ...props }: SeparatorProps) {
  return (
    <div
      role={decorative ? 'none' : 'separator'}
      aria-hidden={decorative ? true : undefined}
      className={cn(separatorVariants({ orientation }), className)}
      {...props}
    />
  );
}

export { separatorVariants };
