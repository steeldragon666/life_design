'use client';

import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlassContainerProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'ocean' | 'subtle' | 'glow';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export default function GlassContainer({ 
  children, 
  className,
  variant = 'ocean',
  size = 'lg'
}: GlassContainerProps) {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full',
  };

  const variantClasses = {
    default: 'bg-white/[0.04] border-white/[0.08]',
    ocean: 'bg-cyan-950/[0.25] border-cyan-400/[0.15] backdrop-blur-xl',
    subtle: 'bg-black/[0.2] border-white/[0.05] backdrop-blur-md',
    glow: 'bg-cyan-900/[0.3] border-cyan-400/[0.25] backdrop-blur-xl shadow-[0_0_60px_rgba(34,211,238,0.15)]',
  };

  return (
    <div className={cn(
      'relative w-full mx-auto rounded-3xl overflow-hidden',
      sizeClasses[size],
      className
    )}>
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.03] via-transparent to-teal-500/[0.03]" />
      
      {/* Glass effect container */}
      <div className={cn(
        'relative p-8 md:p-10',
        'backdrop-filter backdrop-blur-2xl saturate-150',
        '-webkit-backdrop-filter backdrop-blur-2xl saturate-150',
        'border rounded-3xl',
        'shadow-[0_8px_32px_rgba(0,0,0,0.3)]',
        'transition-all duration-500 ease-out',
        variantClasses[variant]
      )}>
        {/* Inner shimmer effect */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/[0.03] to-transparent -translate-x-full"
            style={{
              animation: 'shimmer 8s ease-in-out infinite',
            }}
          />
        </div>

        {/* Top highlight line */}
        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
}

// Compact card variant for step content
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
        'relative p-6 rounded-2xl overflow-hidden',
        'backdrop-filter backdrop-blur-xl',
        '-webkit-backdrop-filter backdrop-blur-xl',
        'border border-cyan-400/[0.1]',
        'bg-gradient-to-br from-cyan-950/[0.2] to-transparent',
        'transition-all duration-500 ease-out',
        'hover:border-cyan-400/[0.25] hover:shadow-[0_4px_20px_rgba(34,211,238,0.1)]',
        isActive && 'border-cyan-400/[0.4] shadow-[0_4px_30px_rgba(34,211,238,0.15)]',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {/* Active indicator glow */}
      {isActive && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
      )}
      
      {children}
    </div>
  );
}

// Wave animation divider
export function WaveDivider({ className }: { className?: string }) {
  return (
    <div className={cn('relative h-px w-full overflow-hidden', className)}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
      <div 
        className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/50 to-cyan-400/0"
        style={{
          animation: 'waveSlide 3s ease-in-out infinite',
        }}
      />
    </div>
  );
}

// Floating animation wrapper
export function FloatingContainer({ 
  children, 
  className,
  delay = 0 
}: { 
  children: ReactNode; 
  className?: string;
  delay?: number;
}) {
  return (
    <div 
      className={cn('animate-float', className)}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}
