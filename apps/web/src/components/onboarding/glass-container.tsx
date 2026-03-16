'use client';

import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlassContainerProps {
  children: ReactNode;
  className?: string;
  /** @deprecated variant is ignored — all containers use the clean card style */
  variant?: 'default' | 'ocean' | 'subtle' | 'glow';
  /** @deprecated size is ignored — containers use max-w-lg by default */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

/**
 * GlassContainer — migrated from glass morphism to clean card.
 * Matches Card (raised variant): white background, rounded-[20px], subtle shadow.
 */
export default function GlassContainer({
  children,
  className,
}: GlassContainerProps) {
  return (
    <div
      className={cn(
        'max-w-lg mx-auto bg-white rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.06)] p-8',
        className,
      )}
    >
      {children}
    </div>
  );
}

// Compact card variant for selectable items
interface GlassCardProps {
  children: ReactNode;
  className?: string;
  isActive?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, className, isActive, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'relative p-6 rounded-[16px] bg-white border border-stone-200 transition-all duration-300',
        'hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:border-stone-300',
        isActive && 'border-sage-500 shadow-[0_4px_12px_rgba(90,127,90,0.12)] ring-1 ring-sage-500/20',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  );
}

// Simple horizontal divider — replaces the animated WaveDivider
export function WaveDivider({ className }: { className?: string }) {
  return <hr className={cn('border-stone-100', className)} />;
}

// Wrapper that removes the old floating animation
export function FloatingContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(className)}>{children}</div>;
}
