'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface VideoLoaderProps {
  // Source
  src: string;
  preloadNextSrc?: string;

  // Playback options
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playbackRate?: number;

  // Loading options
  showProgress?: boolean;
  progressPosition?: 'bottom' | 'center' | 'hidden';
  progressColor?: string;

  // Fallback
  fallbackImageSrc?: string;
  fallbackOnError?: boolean;

  // Styling
  className?: string;
  videoClassName?: string;

  // Callbacks
  onLoad?: () => void;
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
  onCanPlay?: () => void;

  // Children
  children?: React.ReactNode;
}

export function VideoLoader({
  src,
  preloadNextSrc,
  autoPlay = true,
  loop = true,
  muted = true,
  playbackRate = 1,
  showProgress = true,
  progressPosition = 'bottom',
  progressColor,
  fallbackImageSrc,
  fallbackOnError = true,
  className = '',
  videoClassName = '',
  onLoad,
  onProgress,
  onError,
  onCanPlay,
  children,
}: VideoLoaderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loadingState, setLoadingState] = useState<'loading' | 'buffering' | 'ready' | 'error'>('loading');
  const [progress, setProgress] = useState(0);
  const [useFallback, setUseFallback] = useState(false);
  const preloadedVideosRef = useRef<Set<string>>(new Set());

  // Update loading progress
  const updateProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.buffered.length > 0 && video.duration > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const newProgress = (bufferedEnd / video.duration) * 100;
      setProgress(Math.min(newProgress, 100));
      onProgress?.(newProgress);
    }
  }, [onProgress]);

  // Handle video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadStart = () => {
      setLoadingState('loading');
      setProgress(0);
    };

    const handleProgress = () => {
      setLoadingState('buffering');
      updateProgress();
    };

    const handleCanPlay = () => {
      setLoadingState('ready');
      setProgress(100);
      onCanPlay?.();
    };

    const handleCanPlayThrough = () => {
      setLoadingState('ready');
      onLoad?.();
    };

    const handleError = () => {
      setLoadingState('error');
      if (fallbackOnError && fallbackImageSrc) {
        setUseFallback(true);
      }
      onError?.(new Error(`Failed to load video: ${src}`));
    };

    const handleLoadedMetadata = () => {
      video.playbackRate = playbackRate;
    };

    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('canplaythrough', handleCanPlayThrough);
    video.addEventListener('error', handleError);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [src, fallbackOnError, fallbackImageSrc, onError, onLoad, onCanPlay, playbackRate, updateProgress]);

  // Preload next video
  useEffect(() => {
    if (preloadNextSrc && !preloadedVideosRef.current.has(preloadNextSrc)) {
      const preloadVideo = document.createElement('video');
      preloadVideo.preload = 'auto';
      preloadVideo.src = preloadNextSrc;
      preloadVideo.muted = true;
      preloadVideo.load();

      preloadedVideosRef.current.add(preloadNextSrc);

      // Clean up after preloading
      const cleanup = () => {
        preloadVideo.src = '';
        preloadVideo.load();
      };

      preloadVideo.addEventListener('canplaythrough', cleanup, { once: true });
      preloadVideo.addEventListener('error', cleanup, { once: true });

      // Timeout cleanup after 30 seconds
      setTimeout(cleanup, 30000);
    }
  }, [preloadNextSrc]);

  // Progress animation for visual feedback
  const getProgressAnimation = () => {
    if (loadingState === 'loading') {
      // Indeterminate loading animation
      return 'animate-pulse bg-white/20';
    }
    if (loadingState === 'buffering') {
      return 'transition-all duration-100 ease-out';
    }
    return '';
  };

  // Render progress indicator
  const renderProgress = () => {
    if (!showProgress || progressPosition === 'hidden') return null;

    const progressBar = (
      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${getProgressAnimation()}`}
          style={{
            width: `${progress}%`,
            backgroundColor: progressColor || 'hsl(var(--theme-primary))',
            transition: loadingState === 'buffering' ? 'width 0.1s linear' : 'width 0.3s ease',
          }}
        />
      </div>
    );

    if (progressPosition === 'center') {
      return (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="glass-card px-8 py-6 rounded-2xl flex flex-col items-center gap-4 min-w-[200px]">
            <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
            <div className="w-full">{progressBar}</div>
            <span className="text-sm text-white/60 font-medium">
              {loadingState === 'loading' ? 'Loading...' : `Loading ${Math.round(progress)}%`}
            </span>
          </div>
        </div>
      );
    }

    // Bottom position (default)
    return (
      <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
        <div className="flex items-center gap-3">
          <div className="flex-1">{progressBar}</div>
          {loadingState !== 'ready' && (
            <span className="text-xs text-white/50 font-medium whitespace-nowrap">
              {Math.round(progress)}%
            </span>
          )}
        </div>
      </div>
    );
  };

  // Render fallback image
  if (useFallback && fallbackImageSrc) {
    return (
      <div className={`relative w-full h-full ${className}`}>
        <img
          src={fallbackImageSrc}
          alt="Video fallback"
          className={`w-full h-full object-cover ${videoClassName}`}
        />
        {children}
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        src={src}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline
        className={`w-full h-full object-cover ${videoClassName}`}
        style={{
          opacity: loadingState === 'ready' ? 1 : 0.3,
          transition: 'opacity 0.5s ease',
        }}
      />

      {renderProgress()}
      {children}
    </div>
  );
}

export default VideoLoader;
