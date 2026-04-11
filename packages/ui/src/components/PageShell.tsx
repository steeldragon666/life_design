import { type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

export const pageShellVariants = cva('min-h-screen flex flex-col', {
  variants: {
    layout: {
      centered: 'items-center',
      sidebar: 'lg:flex-row',
    },
  },
  defaultVariants: {
    layout: 'centered',
  },
});

export interface PageShellProps extends VariantProps<typeof pageShellVariants> {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function PageShell({ children, header, footer, layout, className }: PageShellProps) {
  return (
    <div className={cn(pageShellVariants({ layout }), className)}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-sage-500 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>
      {header && <header>{header}</header>}
      <main id="main" className="flex-1 w-full">
        {children}
      </main>
      {footer && <footer>{footer}</footer>}
    </div>
  );
}
