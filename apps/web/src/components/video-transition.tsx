'use client';

import { useEffect, useState } from 'react';

interface VideoTransitionProps {
  isTransitioning: boolean;
  duration?: number;
  blur?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function VideoTransition({
  isTransitioning,
  duration = 3000,
  blur = true,
  children,
  className = '',
}: VideoTransitionProps) {
  const [opacity, setOpacity] = useState(0);
  const [blurAmount, setBlurAmount] = useState(blur ? 8 : 0);

  useEffect(() => {
    if (isTransitioning) {
      // Start transition - fade in
      const fadeStep = 50 / (duration / 20); // 50 steps over duration
      let currentOpacity = 0;
      let currentBlur = blur ? 8 : 0;

      const interval = setInterval(() => {
        currentOpacity += fadeStep;
        if (blur) {
          currentBlur -= (8 * fadeStep) / 50; // Reduce blur as we fade in
        }

        if (currentOpacity >= 100) {
          setOpacity(100);
          setBlurAmount(0);
          clearInterval(interval);
        } else {
          setOpacity(currentOpacity);
          setBlurAmount(Math.max(0, currentBlur));
        }
      }, 20);

      return () => clearInterval(interval);
    } else {
      setOpacity(0);
      setBlurAmount(blur ? 8 : 0);
    }
  }, [isTransitioning, duration, blur]);

  return (
    <div
      className={`absolute inset-0 transition-all ease-out ${className}`}
      style={{
        opacity: opacity / 100,
        filter: blur ? `blur(${blurAmount}px)` : undefined,
        transitionDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  );
}

interface CrossfadeContainerProps {
  showFirst: boolean;
  first: React.ReactNode;
  second: React.ReactNode;
  duration?: number;
  className?: string;
}

export function CrossfadeContainer({
  showFirst,
  first,
  second,
  duration = 3000,
  className = '',
}: CrossfadeContainerProps) {
  const [firstOpacity, setFirstOpacity] = useState(showFirst ? 1 : 0);
  const [secondOpacity, setSecondOpacity] = useState(showFirst ? 0 : 1);

  useEffect(() => {
    const fadeStep = 100 / (duration / 30); // Calculate steps
    let progress = 0;

    const interval = setInterval(() => {
      progress += fadeStep;

      if (showFirst) {
        setFirstOpacity(Math.min(1, progress / 100));
        setSecondOpacity(Math.max(0, 1 - progress / 100));
      } else {
        setFirstOpacity(Math.max(0, 1 - progress / 100));
        setSecondOpacity(Math.min(1, progress / 100));
      }

      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [showFirst, duration]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <div
        className="absolute inset-0 transition-opacity"
        style={{
          opacity: firstOpacity,
          transitionDuration: `${duration}ms`,
        }}
      >
        {first}
      </div>
      <div
        className="absolute inset-0 transition-opacity"
        style={{
          opacity: secondOpacity,
          transitionDuration: `${duration}ms`,
        }}
      >
        {second}
      </div>
    </div>
  );
}

interface BlurTransitionProps {
  isActive: boolean;
  intensity?: number;
  duration?: number;
  children: React.ReactNode;
  className?: string;
}

export function BlurTransition({
  isActive,
  intensity = 20,
  duration = 2500,
  children,
  className = '',
}: BlurTransitionProps) {
  const [blurValue, setBlurValue] = useState(isActive ? 0 : intensity);

  useEffect(() => {
    const targetBlur = isActive ? 0 : intensity;
    const step = intensity / (duration / 20);
    let currentBlur = blurValue;

    const interval = setInterval(() => {
      if (isActive && currentBlur > targetBlur) {
        currentBlur = Math.max(targetBlur, currentBlur - step);
      } else if (!isActive && currentBlur < targetBlur) {
        currentBlur = Math.min(targetBlur, currentBlur + step);
      } else {
        clearInterval(interval);
      }
      setBlurValue(currentBlur);
    }, 20);

    return () => clearInterval(interval);
  }, [isActive, intensity, duration, blurValue]);

  return (
    <div
      className={`transition-all ease-out ${className}`}
      style={{
        filter: `blur(${blurValue}px)`,
        transitionDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  );
}

interface FadeInContainerProps {
  show: boolean;
  delay?: number;
  duration?: number;
  children: React.ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
}

export function FadeInContainer({
  show,
  delay = 0,
  duration = 800,
  children,
  className = '',
  direction = 'up',
  distance = 20,
}: FadeInContainerProps) {
  const [opacity, setOpacity] = useState(0);
  const [transform, setTransform] = useState(() => {
    const offset = direction === 'none' ? 0 : distance;
    switch (direction) {
      case 'up':
        return `translateY(${offset}px)`;
      case 'down':
        return `translateY(-${offset}px)`;
      case 'left':
        return `translateX(${offset}px)`;
      case 'right':
        return `translateX(-${offset}px)`;
      default:
        return 'translate(0, 0)';
    }
  });

  useEffect(() => {
    if (show) {
      const delayTimeout = setTimeout(() => {
        setOpacity(1);
        setTransform('translate(0, 0)');
      }, delay);

      return () => clearTimeout(delayTimeout);
    } else {
      const offset = direction === 'none' ? 0 : distance;
      switch (direction) {
        case 'up':
          setTransform(`translateY(${offset}px)`);
          break;
        case 'down':
          setTransform(`translateY(-${offset}px)`);
          break;
        case 'left':
          setTransform(`translateX(${offset}px)`);
          break;
        case 'right':
          setTransform(`translateX(-${offset}px)`);
          break;
      }
      setOpacity(0);
    }
  }, [show, delay, direction, distance]);

  return (
    <div
      className={`transition-all ease-out ${className}`}
      style={{
        opacity,
        transform,
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
