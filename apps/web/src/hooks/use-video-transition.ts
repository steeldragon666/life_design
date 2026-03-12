'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export type TransitionType = 'crossfade' | 'blur' | 'fade-through-white' | 'fade-through-black';
export type TransitionState = 'idle' | 'preloading' | 'transitioning' | 'completed';

interface UseVideoTransitionOptions {
  duration?: number;
  type?: TransitionType;
  onTransitionStart?: () => void;
  onTransitionComplete?: () => void;
}

interface UseVideoTransitionReturn {
  // State
  state: TransitionState;
  progress: number;
  fromVideoRef: React.RefObject<HTMLVideoElement | null>;
  toVideoRef: React.RefObject<HTMLVideoElement | null>;

  // Controls
  startTransition: (toVideoSrc: string) => Promise<void>;
  cancelTransition: () => void;
  pauseDuringTransition: () => void;
  resumeDuringTransition: () => void;

  // Status
  isTransitioning: boolean;
  canTransition: boolean;
}

export function useVideoTransition(
  options: UseVideoTransitionOptions = {}
): UseVideoTransitionReturn {
  const {
    duration = 2000,
    type = 'crossfade',
    onTransitionStart,
    onTransitionComplete,
  } = options;

  const [state, setState] = useState<TransitionState>('idle');
  const [progress, setProgress] = useState(0);
  const [canTransition, setCanTransition] = useState(true);

  const fromVideoRef = useRef<HTMLVideoElement>(null);
  const toVideoRef = useRef<HTMLVideoElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const isPausedRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const preloadVideo = useCallback((src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.crossOrigin = 'anonymous';
      video.muted = true;

      let timeoutId: NodeJS.Timeout;

      const cleanup = () => {
        clearTimeout(timeoutId);
        video.removeEventListener('canplaythrough', handleCanPlay);
        video.removeEventListener('error', handleError);
        video.pause();
        video.src = '';
        video.load();
      };

      const handleCanPlay = () => {
        cleanup();
        resolve();
      };

      const handleError = () => {
        cleanup();
        reject(new Error(`Failed to preload video: ${src}`));
      };

      video.addEventListener('canplaythrough', handleCanPlay);
      video.addEventListener('error', handleError);

      // Timeout after 30 seconds
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Video preload timeout: ${src}`));
      }, 30000);

      video.src = src;
    });
  }, []);

  const animateTransition = useCallback(
    (timestamp: number) => {
      if (isPausedRef.current) {
        // Adjust start time to account for pause duration
        startTimeRef.current = timestamp - progress * duration;
        animationRef.current = requestAnimationFrame(animateTransition);
        return;
      }

      if (startTimeRef.current === 0) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const newProgress = Math.min(elapsed / duration, 1);

      // Apply easing (ease-in-out cubic)
      const easedProgress =
        newProgress < 0.5
          ? 4 * newProgress * newProgress * newProgress
          : 1 - Math.pow(-2 * newProgress + 2, 3) / 2;

      setProgress(easedProgress);

      if (newProgress < 1) {
        animationRef.current = requestAnimationFrame(animateTransition);
      } else {
        setState('completed');
        setCanTransition(true);
        onTransitionComplete?.();
      }
    },
    [duration, onTransitionComplete]
  );

  const startTransition = useCallback(
    async (toVideoSrc: string) => {
      if (!canTransition || state === 'transitioning') {
        return;
      }

      setCanTransition(false);
      setState('preloading');
      setProgress(0);

      try {
        // Preload the destination video
        await preloadVideo(toVideoSrc);

        // If paused, wait for resume
        if (isPausedRef.current) {
          return;
        }

        setState('transitioning');
        onTransitionStart?.();

        // Start the transition animation
        startTimeRef.current = 0;
        animationRef.current = requestAnimationFrame(animateTransition);
      } catch (error) {
        console.error('Transition failed:', error);
        setState('idle');
        setCanTransition(true);
        setProgress(0);
      }
    },
    [canTransition, state, preloadVideo, animateTransition, onTransitionStart]
  );

  const cancelTransition = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    setState('idle');
    setProgress(0);
    setCanTransition(true);
    startTimeRef.current = 0;
    isPausedRef.current = false;
  }, []);

  const pauseDuringTransition = useCallback(() => {
    isPausedRef.current = true;
  }, []);

  const resumeDuringTransition = useCallback(() => {
    if (isPausedRef.current && state === 'transitioning') {
      isPausedRef.current = false;
    }
  }, [state]);

  return {
    state,
    progress,
    fromVideoRef,
    toVideoRef,
    startTransition,
    cancelTransition,
    pauseDuringTransition,
    resumeDuringTransition,
    isTransitioning: state === 'transitioning',
    canTransition,
  };
}

export default useVideoTransition;
