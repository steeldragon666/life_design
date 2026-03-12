'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, Leaf, Waves, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetLoadProgress } from '@/lib/asset-loader';
import { loadingMessages } from '@/config/assets';

export interface LoadingScreenProps {
  /** Current loading progress (0-100) */
  progress?: number;
  /** Loading state from AssetLoader */
  loadState?: AssetLoadProgress;
  /** Whether loading is complete */
  isComplete?: boolean;
  /** Whether to show the loading screen */
  isVisible: boolean;
  /** Current theme - affects styling */
  theme?: 'botanical' | 'ocean' | 'modern';
  /** Called when fade out animation completes */
  onExitComplete?: () => void;
  /** Custom brand/logo component */
  customLogo?: React.ReactNode;
  /** Array of custom loading messages (defaults to loadingMessages) */
  messages?: string[];
  /** Message rotation interval in ms (default: 3000) */
  messageInterval?: number;
  /** Minimum display time in ms before allowing fade out (default: 2000) */
  minimumDisplayTime?: number;
  /** Enable/disable the calming background animation */
  enableBackgroundAnimation?: boolean;
}

/**
 * LoadingScreen - A calming, cinematic loading experience
 *
 * Features:
 * - Smooth progress bar with breathing animation
 * - Rotating loading messages/tips
 * - Theme-aware styling (Botanical, Ocean, Modern)
 * - Glassmorphism card design
 * - Smooth fade-out transition
 * - Mobile-optimized layout
 */
export function LoadingScreen({
  progress = 0,
  loadState,
  isComplete = false,
  isVisible,
  theme = 'botanical',
  onExitComplete,
  customLogo,
  messages = loadingMessages,
  messageInterval = 3000,
  minimumDisplayTime = 2000,
  enableBackgroundAnimation = true,
}: LoadingScreenProps) {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const mountTime = useRef(Date.now());
  const messageTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate actual progress
  const actualProgress = loadState?.percent ?? progress;
  const currentMessage = messages[currentMessageIndex % messages.length];

  // Mount animation
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setIsMounted(true), 50);
      mountTime.current = Date.now();
      return () => clearTimeout(timer);
    } else {
      setIsMounted(false);
    }
  }, [isVisible]);

  // Smooth progress animation
  useEffect(() => {
    const targetProgress = Math.min(Math.max(actualProgress, 0), 100);
    const duration = 400;
    const startValue = displayProgress;
    const startTime = performance.now();

    const animateProgress = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const newValue = startValue + (targetProgress - startValue) * easeOut;

      setDisplayProgress(newValue);

      if (progress < 1) {
        requestAnimationFrame(animateProgress);
      }
    };

    requestAnimationFrame(animateProgress);
  }, [actualProgress]);

  // Message rotation
  useEffect(() => {
    if (!isVisible || isExiting) return;

    messageTimerRef.current = setInterval(() => {
      setCurrentMessageIndex(prev => (prev + 1) % messages.length);
    }, messageInterval);

    return () => {
      if (messageTimerRef.current) {
        clearInterval(messageTimerRef.current);
      }
    };
  }, [isVisible, isExiting, messageInterval, messages.length]);

  // Handle completion with minimum display time
  useEffect(() => {
    if (isComplete && isVisible && !isExiting) {
      const elapsed = Date.now() - mountTime.current;
      const remainingDelay = Math.max(0, minimumDisplayTime - elapsed);

      const timer = setTimeout(() => {
        setIsExiting(true);
      }, remainingDelay);

      return () => clearTimeout(timer);
    }
  }, [isComplete, isVisible, isExiting, minimumDisplayTime]);

  // Handle exit animation completion
  useEffect(() => {
    if (isExiting) {
      const timer = setTimeout(() => {
        onExitComplete?.();
      }, 800); // Match CSS transition duration

      return () => clearTimeout(timer);
    }
  }, [isExiting, onExitComplete]);

  // Keyboard handler - allow skip with Escape
  const handleSkip = useCallback(() => {
    if (isVisible && !isExiting) {
      setIsExiting(true);
    }
  }, [isVisible, isExiting]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSkip]);

  if (!isVisible && !isExiting) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center',
        'transition-all duration-800 ease-out',
        isMounted && !isExiting ? 'opacity-100' : 'opacity-0',
        isExiting && 'pointer-events-none'
      )}
      style={{ transitionDuration: isExiting ? '800ms' : '500ms' }}
      aria-live="polite"
      aria-busy={!isComplete}
      role="progressbar"
      aria-valuenow={Math.round(displayProgress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Loading Life Design"
    >
      {/* Background with theme-aware gradient */}
      <div
        className={cn(
          'absolute inset-0 transition-opacity duration-500',
          theme === 'botanical' && 'bg-gradient-to-br from-[#1a0f14] via-[#1a1216] to-[#0f0a10]',
          theme === 'ocean' && 'bg-gradient-to-br from-[#0a1515] via-[#0d1a1a] to-[#080f12]',
          theme === 'modern' && 'bg-gradient-to-br from-[#0f0d0a] via-[#12100d] to-[#0a0908]'
        )}
      >
        {/* Animated background particles */}
        {enableBackgroundAnimation && (
          <div className="absolute inset-0 overflow-hidden">
            {/* Floating orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 animate-float"
              style={{
                background: theme === 'botanical'
                  ? 'radial-gradient(circle, rgba(232,180,208,0.4) 0%, transparent 70%)'
                  : theme === 'ocean'
                    ? 'radial-gradient(circle, rgba(95,179,179,0.4) 0%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(201,168,108,0.3) 0%, transparent 70%)',
                animationDelay: '0s',
                filter: 'blur(60px)',
              }}
            />
            <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full opacity-8 animate-float"
              style={{
                background: theme === 'botanical'
                  ? 'radial-gradient(circle, rgba(184,197,168,0.3) 0%, transparent 70%)'
                  : theme === 'ocean'
                    ? 'radial-gradient(circle, rgba(143,212,212,0.3) 0%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(212,165,116,0.2) 0%, transparent 70%)',
                animationDelay: '2s',
                filter: 'blur(50px)',
              }}
            />
            <div className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full opacity-6 animate-float"
              style={{
                background: theme === 'botanical'
                  ? 'radial-gradient(circle, rgba(197,184,212,0.25) 0%, transparent 70%)'
                  : theme === 'ocean'
                    ? 'radial-gradient(circle, rgba(184,230,230,0.25) 0%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(184,115,51,0.15) 0%, transparent 70%)',
                animationDelay: '4s',
                filter: 'blur(40px)',
              }}
            />

            {/* Subtle noise texture overlay */}
            <div
              className="absolute inset-0 opacity-[0.015]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              }}
            />
          </div>
        )}
      </div>

      {/* Main content card */}
      <div
        className={cn(
          'relative z-10 w-full max-w-md px-6',
          'transition-all duration-700 ease-out',
          isMounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        )}
      >
        {/* Glass card */}
        <div
          className={cn(
            'relative rounded-3xl p-10',
            'backdrop-blur-xl border border-white/10',
            'shadow-2xl',
            theme === 'botanical' && 'bg-gradient-to-b from-white/[0.08] to-white/[0.02]',
            theme === 'ocean' && 'bg-gradient-to-b from-white/[0.06] to-white/[0.02]',
            theme === 'modern' && 'bg-gradient-to-b from-white/[0.05] to-transparent'
          )}
          style={{
            boxShadow: theme === 'botanical'
              ? '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(232,180,208,0.1)'
              : theme === 'ocean'
                ? '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(95,179,179,0.1)'
                : '0 25px 50px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,108,0.08)',
          }}
        >
          {/* Logo/Brand */}
          <div className="flex flex-col items-center mb-10">
            {customLogo ? (
              customLogo
            ) : (
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={cn(
                    'w-14 h-14 rounded-2xl flex items-center justify-center',
                    'animate-pulse-subtle'
                  )}
                  style={{
                    background: theme === 'botanical'
                      ? 'linear-gradient(135deg, rgba(232,180,208,0.2) 0%, rgba(197,184,212,0.15) 100%)'
                      : theme === 'ocean'
                        ? 'linear-gradient(135deg, rgba(95,179,179,0.2) 0%, rgba(143,212,212,0.15) 100%)'
                        : 'linear-gradient(135deg, rgba(201,168,108,0.15) 0%, rgba(184,115,51,0.1) 100%)',
                    border: theme === 'botanical'
                      ? '1px solid rgba(232,180,208,0.2)'
                      : theme === 'ocean'
                        ? '1px solid rgba(95,179,179,0.2)'
                        : '1px solid rgba(201,168,108,0.15)',
                  }}
                >
                  {theme === 'botanical' && <Leaf className="w-7 h-7 text-[#e8b4d0]" />}
                  {theme === 'ocean' && <Waves className="w-7 h-7 text-[#5fb3b3]" />}
                  {theme === 'modern' && <Sun className="w-7 h-7 text-[#c9a86c]" />}
                </div>
                <div className="text-left">
                  <h1 className="text-xl font-semibold tracking-tight text-white/90">
                    Life Design
                  </h1>
                  <p className="text-xs text-white/40 tracking-wide uppercase">
                    Your Journey Begins
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Progress bar container */}
          <div className="relative mb-8">
            {/* Track */}
            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              {/* Fill */}
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300 ease-out',
                  'relative overflow-hidden'
                )}
                style={{
                  width: `${displayProgress}%`,
                  background: theme === 'botanical'
                    ? 'linear-gradient(90deg, #e8b4d0 0%, #d4a5a5 50%, #c5b8d4 100%)'
                    : theme === 'ocean'
                      ? 'linear-gradient(90deg, #5fb3b3 0%, #8fd4d4 50%, #b8e6e6 100%)'
                      : 'linear-gradient(90deg, #c9a86c 0%, #d4a574 50%, #b87333 100%)',
                }}
              >
                {/* Shimmer effect */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                    animation: 'shimmer 2s infinite',
                    transform: 'translateX(-100%)',
                  }}
                />
              </div>
            </div>

            {/* Progress text */}
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs text-white/40 font-medium">
                {loadState?.state === 'loading' ? 'Loading assets...' :
                  loadState?.state === 'complete' ? 'Ready' :
                    loadState?.state === 'error' ? 'Some assets failed' :
                      'Initializing...'}
              </span>
              <span className="text-xs text-white/60 font-mono tabular-nums">
                {Math.round(displayProgress)}%
              </span>
            </div>
          </div>

          {/* Loading message */}
          <div className="text-center">
            <div
              key={currentMessageIndex}
              className={cn(
                'flex items-center justify-center gap-2 text-sm',
                'animate-fade-in'
              )}
            >
              <Sparkles className={cn(
                'w-4 h-4',
                theme === 'botanical' && 'text-[#e8b4d0]/60',
                theme === 'ocean' && 'text-[#5fb3b3]/60',
                theme === 'modern' && 'text-[#c9a86c]/60'
              )} />
              <span className="text-white/50 italic">
                {currentMessage}
              </span>
            </div>
          </div>

          {/* Decorative breathing ring */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div
              className="w-32 h-32 rounded-full"
              style={{
                border: theme === 'botanical'
                  ? '1px solid rgba(232,180,208,0.1)'
                  : theme === 'ocean'
                    ? '1px solid rgba(95,179,179,0.1)'
                    : '1px solid rgba(201,168,108,0.08)',
                animation: 'breathe 4s ease-in-out infinite',
              }}
            />
          </div>
        </div>

        {/* Skip hint */}
        <div
          className={cn(
            'mt-6 text-center transition-opacity duration-300',
            displayProgress > 50 ? 'opacity-40' : 'opacity-0'
          )}
        >
          <p className="text-xs text-white/30">
            Press <kbd className="px-2 py-0.5 rounded bg-white/10 text-white/50 font-mono">ESC</kbd> to skip
          </p>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }

        @keyframes breathe {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Minimal Loading Indicator - For inline use
 */
export function LoadingIndicator({
  size = 'md',
  theme = 'botanical',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  theme?: 'botanical' | 'ocean' | 'modern';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const colorClass = {
    botanical: 'border-[#e8b4d0]',
    ocean: 'border-[#5fb3b3]',
    modern: 'border-[#c9a86c]',
  };

  return (
    <div
      className={cn(
        sizeClasses[size],
        'rounded-full border-2 border-t-transparent animate-spin',
        colorClass[theme],
        className
      )}
    />
  );
}

/**
 * Skeleton loader for content placeholders
 */
export function LoadingSkeleton({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-white/10 rounded animate-pulse"
          style={{
            width: `${100 - (i * 15)}%`,
            animationDelay: `${i * 100}ms`,
          }}
        />
      ))}
    </div>
  );
}

export default LoadingScreen;
