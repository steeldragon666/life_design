'use client';

import { lazy, Suspense, useState, useEffect } from 'react';
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
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    setMounted(true);
  }, []);

  if (!mounted || reducedMotion) return null;

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
