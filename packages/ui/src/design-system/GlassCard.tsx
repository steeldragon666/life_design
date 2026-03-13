'use client';

import type { GlassIntensity } from './tokens';
import { designTokens } from './tokens';

interface GlassCardProps {
  intensity?: GlassIntensity;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

/**
 * Glassmorphism card with configurable blur intensity.
 * Hover effect: subtle scale + border glow.
 */
export default function GlassCard({
  intensity = 'card',
  className = '',
  children,
  onClick,
}: GlassCardProps) {
  const base = designTokens.glassmorphism[intensity];
  const interactive = onClick ? 'cursor-pointer' : '';

  return (
    <div
      onClick={onClick}
      className={`${base} rounded-2xl shadow-xl transition-all duration-300 hover:scale-[1.01] hover:border-white/30 hover:shadow-indigo-500/5 ${interactive} ${className}`}
    >
      {children}
    </div>
  );
}
