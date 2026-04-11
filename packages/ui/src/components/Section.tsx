import { type ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface SectionProps {
  heading?: string;
  subtitle?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  children: ReactNode;
  className?: string;
}

export function Section({ heading, subtitle, as: HeadingTag = 'h2', children, className }: SectionProps) {
  return (
    <section className={cn('mb-8', className)}>
      {heading && (
        <div className="mb-4">
          <HeadingTag className="text-xl font-semibold text-stone-800">{heading}</HeadingTag>
          {subtitle && <p className="text-sm text-stone-500 mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
