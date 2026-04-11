'use client';

import { lazy, Suspense } from 'react';
import { cn } from '../utils/cn';

const LottieReact = lazy(() => import('lottie-react'));

export interface LottieAnimationProps {
  animationData: Record<string, unknown>;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
}

export function LottieAnimation({
  animationData,
  loop = true,
  autoplay = true,
  className,
}: LottieAnimationProps) {
  if (typeof window === 'undefined') return null;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;

  return (
    <Suspense fallback={null}>
      <LottieReact
        animationData={animationData}
        loop={loop}
        autoplay={autoplay}
        className={cn('w-full h-full', className)}
      />
    </Suspense>
  );
}
