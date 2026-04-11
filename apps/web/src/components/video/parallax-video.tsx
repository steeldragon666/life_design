'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';
import { useParallax } from '@/hooks/use-parallax';

export interface ParallaxVideoBackgroundProps {
  // Video source
  videoSrc: string;
  fallbackImageSrc?: string;

  // Parallax options
  intensity?: number;
  smoothing?: number;
  maxRotation?: number;

  // Playback options
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playbackRate?: number;

  // Display options
  objectFit?: 'cover' | 'contain' | 'fill';
  scale?: number;

  // Callbacks
  onLoad?: () => void;
  onError?: (error: Error) => void;

  // Styling
  className?: string;
  containerClassName?: string;

  // Children overlay
  children?: React.ReactNode;
}

export function ParallaxVideoBackground({
  videoSrc,
  fallbackImageSrc,
  intensity = 0.05,
  smoothing = 0.08,
  maxRotation = 3,
  autoPlay = true,
  loop = true,
  muted = true,
  playbackRate = 1,
  objectFit = 'cover',
  scale = 1.1,
  onLoad,
  onError,
  className = '',
  containerClassName = '',
  children,
}: ParallaxVideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const { values, isGyroscopeActive, containerRef } = useParallax({
    intensity,
    smoothing,
    maxRotation,
    enabled: true,
  });

  // Set playback rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Handle video load
  const handleLoadedData = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  // Handle video error
  const handleError = () => {
    setHasError(true);
    onError?.(new Error(`Failed to load video: ${videoSrc}`));
  };

  // Calculate parallax transform
  const getParallaxTransform = (): string => {
    const { x, y, rotateX, rotateY } = values;

    return `
      translate3d(${-x}px, ${-y}px, 0)
      scale(${scale})
      perspective(1000px)
      rotateX(${rotateX}deg)
      rotateY(${rotateY}deg)
    `;
  };

  // Calculate fallback image transform (no rotation for better compatibility)
  const getImageTransform = (): string => {
    const { x, y } = values;
    return `translate3d(${-x}px, ${-y}px, 0) scale(${scale})`;
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${containerClassName}`}
      style={{ willChange: 'transform' }}
    >
      {/* Video Container with Parallax */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: getParallaxTransform(),
          transition: 'transform 0.1s linear',
          willChange: 'transform',
        }}
      >
        {!hasError ? (
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay={autoPlay}
            loop={loop}
            muted={muted}
            playsInline
            onLoadedData={handleLoadedData}
            onError={handleError}
            className={`w-full h-full ${className}`}
            style={{
              objectFit,
              opacity: isLoaded ? 1 : 0,
              transition: 'opacity 0.5s ease',
            }}
          />
        ) : fallbackImageSrc ? (
          <img
            src={fallbackImageSrc}
            alt="Background"
            className={`w-full h-full ${className}`}
            style={{
              objectFit,
              transform: getImageTransform(),
            }}
          />
        ) : null}
      </div>

      {/* Loading State */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-hsl(var(--bg-primary))/50">
          <div className="animate-pulse-subtle flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
            <span className="text-sm text-white/60">Loading experience...</span>
          </div>
        </div>
      )}

      {/* Gyroscope indicator (mobile only) */}
      {isGyroscopeActive && (
        <div className="absolute top-4 right-4 z-10">
          <div className="glass-card px-3 py-1.5 rounded-full flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-white/60" />
            <span className="text-xs text-white/60">Motion active</span>
          </div>
        </div>
      )}

      {/* Children overlay */}
      {children && (
        <div className="absolute inset-0 z-5 pointer-events-none">
          <div className="pointer-events-auto">{children}</div>
        </div>
      )}
    </div>
  );
}

export default ParallaxVideoBackground;
