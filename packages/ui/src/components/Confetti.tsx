'use client';

import { useState, useEffect, useMemo } from 'react';
import { cn } from '../utils/cn';

export interface ConfettiProps {
  colors?: string[];
  particleCount?: number;
  className?: string;
}

export function Confetti({
  colors = ['#5A7F5A', '#D4864A', '#5E9BC4'], // sage-500, warm-400, accent-500
  particleCount = 30,
  className,
}: ConfettiProps) {
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    setMounted(true);
  }, []);

  // Stable particle data — computed once on mount to avoid hydration mismatches
  const particles = useMemo(() => {
    if (!mounted) return [];
    return Array.from({ length: particleCount }).map((_, i) => ({
      color: colors[i % colors.length],
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      size: 6 + Math.random() * 6,
      round: Math.random() > 0.5,
    }));
  }, [mounted, particleCount, colors]);

  if (!mounted || reducedMotion) return null;

  return (
    <div
      className={cn('fixed inset-0 pointer-events-none z-50 overflow-hidden', className)}
      aria-hidden="true"
    >
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute top-0 animate-confetti-fall"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: p.round ? '50%' : '2px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
