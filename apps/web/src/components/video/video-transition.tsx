'use client';

import React, { useEffect, useRef } from 'react';
import { useVideoTransition, TransitionType, TransitionState } from '@/hooks/use-video-transition';

export interface VideoTransitionProps {
  // Video sources
  fromVideoSrc?: string;
  toVideoSrc?: string;

  // Transition options
  isActive?: boolean;
  duration?: number;
  type?: TransitionType;

  // Playback options
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;

  // Callbacks
  onTransitionStart?: () => void;
  onTransitionComplete?: () => void;
  onVideoError?: (error: Error) => void;

  // Styling
  className?: string;
}

export function VideoTransition({
  fromVideoSrc,
  toVideoSrc,
  isActive = false,
  duration = 2000,
  type = 'crossfade',
  autoPlay = true,
  loop = true,
  muted = true,
  onTransitionStart,
  onTransitionComplete,
  onVideoError,
  className = '',
}: VideoTransitionProps) {
  const {
    state,
    progress,
    fromVideoRef,
    toVideoRef,
    startTransition,
    cancelTransition,
    isTransitioning,
  } = useVideoTransition({
    duration,
    type,
    onTransitionStart,
    onTransitionComplete,
  });

  const hasStartedRef = useRef(false);

  // Start transition when isActive becomes true
  useEffect(() => {
    if (isActive && toVideoSrc && !hasStartedRef.current) {
      hasStartedRef.current = true;
      startTransition(toVideoSrc);
    }

    if (!isActive) {
      hasStartedRef.current = false;
      cancelTransition();
    }
  }, [isActive, toVideoSrc, startTransition, cancelTransition]);

  // Handle video errors
  const handleError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const target = e.currentTarget;
    onVideoError?.(new Error(`Failed to load video: ${target.src}`));
  };

  // Calculate transition styles based on type and progress
  const getTransitionStyles = (isFromVideo: boolean): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      transition: 'none',
    };

    if (state === 'idle' || state === 'preloading') {
      return {
        ...baseStyles,
        opacity: isFromVideo ? 1 : 0,
        zIndex: isFromVideo ? 1 : 0,
      };
    }

    const p = progress;

    switch (type) {
      case 'crossfade':
        return {
          ...baseStyles,
          opacity: isFromVideo ? 1 - p : p,
          zIndex: 1,
        };

      case 'blur':
        const blurAmount = isFromVideo ? p * 20 : (1 - p) * 20;
        return {
          ...baseStyles,
          opacity: isFromVideo ? 1 - p : p,
          filter: `blur(${blurAmount}px)`,
          zIndex: 1,
        };

      case 'fade-through-white':
        let whiteOpacity = 0;
        if (p < 0.5) {
          whiteOpacity = p * 2; // Fade in white
        } else {
          whiteOpacity = (1 - p) * 2; // Fade out white
        }
        return {
          ...baseStyles,
          opacity: isFromVideo
            ? Math.max(0, 1 - p * 3) // From video fades out quickly
            : Math.max(0, (p - 0.5) * 2), // To video fades in after white
          zIndex: isFromVideo ? 1 : 2,
        };

      case 'fade-through-black':
        return {
          ...baseStyles,
          opacity: isFromVideo
            ? Math.max(0, 1 - p * 3)
            : Math.max(0, (p - 0.5) * 2),
          zIndex: isFromVideo ? 1 : 2,
        };

      default:
        return baseStyles;
    }
  };

  // Get overlay color for fade-through transitions
  const getOverlayColor = (): string | undefined => {
    if (type !== 'fade-through-white' && type !== 'fade-through-black') {
      return undefined;
    }

    const p = progress;
    let opacity = 0;

    if (p < 0.5) {
      opacity = p * 2;
    } else {
      opacity = (1 - p) * 2;
    }

    if (type === 'fade-through-white') {
      return `rgba(255, 255, 255, ${opacity})`;
    }

    return `rgba(0, 0, 0, ${opacity})`;
  };

  return (
    <div
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{ willChange: 'opacity' }}
    >
      {/* From Video */}
      {fromVideoSrc && (
        <video
          ref={fromVideoRef}
          src={fromVideoSrc}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          playsInline
          style={getTransitionStyles(true)}
          onError={handleError}
        />
      )}

      {/* To Video */}
      {(toVideoSrc || isTransitioning) && (
        <video
          ref={toVideoRef}
          src={toVideoSrc}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          playsInline
          style={getTransitionStyles(false)}
          onError={handleError}
        />
      )}

      {/* Fade-through color overlay */}
      {getOverlayColor() && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundColor: getOverlayColor(),
            zIndex: 1,
          }}
        />
      )}

      {/* Progress indicator */}
      {isTransitioning && (
        <div className="absolute bottom-4 left-4 right-4 h-0.5 bg-white/10 rounded-full overflow-hidden z-10">
          <div
            className="h-full bg-white/50 rounded-full transition-none"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default VideoTransition;
