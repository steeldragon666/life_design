import { type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

export const containerVariants = cva('mx-auto px-4 sm:px-6 lg:px-8 w-full', {
  variants: {
    size: {
      xs: 'max-w-xl',
      sm: 'max-w-2xl',
      md: 'max-w-4xl',
      lg: 'max-w-6xl',
      xl: 'max-w-7xl',
      full: 'max-w-full',
    },
  },
  defaultVariants: {
    size: 'lg',
  },
});

export interface ContainerProps extends VariantProps<typeof containerVariants> {
  children: ReactNode;
  className?: string;
}

export function Container({ size, children, className }: ContainerProps) {
  return (
    <div className={cn(containerVariants({ size }), className)}>
      {children}
    </div>
  );
}
