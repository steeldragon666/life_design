'use client';

import { cn } from '../utils/cn';

export interface ConfettiProps {
  colors?: string[];
  particleCount?: number;
  className?: string;
}

export function Confetti({
  colors = ['#5A7F5A', '#D4864A', '#5E9BC4'],
  particleCount = 30,
  className,
}: ConfettiProps) {
  // Check prefers-reduced-motion
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return null;
  }

  return (
    <div
      className={cn('fixed inset-0 pointer-events-none z-50 overflow-hidden', className)}
      aria-hidden="true"
    >
      {Array.from({ length: particleCount }).map((_, i) => {
        const color = colors[i % colors.length];
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const duration = 2 + Math.random() * 2;
        const size = 6 + Math.random() * 6;

        return (
          <div
            key={i}
            className="absolute top-0 animate-confetti-fall"
            style={{
              left: `${left}%`,
              backgroundColor: color,
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          />
        );
      })}
    </div>
  );
}
