'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { SkipForward, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useFlowState } from './flow-state';
import { cn } from '@/lib/utils';

interface CinematicOpenerProps {
  onVideoComplete: () => void;
  onVideoSkip: () => void;
  enableSkipAfter?: number; // seconds
}

export default function CinematicOpener({ 
  onVideoComplete, 
  onVideoSkip,
  enableSkipAfter = 3 
}: CinematicOpenerProps) {
  const { canSkipVideo, enableVideoSkip } = useFlowState();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const skipTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Enable skip button after specified time
  useEffect(() => {
    skipTimerRef.current = setTimeout(() => {
      setShowSkip(true);
      enableVideoSkip();
    }, enableSkipAfter * 1000);

    return () => {
      if (skipTimerRef.current) {
        clearTimeout(skipTimerRef.current);
      }
    };
  }, [enableSkipAfter, enableVideoSkip]);

  // If intro video fails to load, auto-advance after showing fallback briefly.
  useEffect(() => {
    if (!hasVideoError || isTransitioning) return;

    const timer = setTimeout(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        onVideoComplete();
      }, 500);
    }, 2800);

    return () => clearTimeout(timer);
  }, [hasVideoError, isTransitioning, onVideoComplete]);

  // Safety timeout: if browser never loads/errors the video, continue onboarding anyway.
  useEffect(() => {
    if (isLoaded || hasVideoError || isTransitioning) return;

    const timeout = setTimeout(() => {
      setHasTimedOut(true);
      setShowSkip(true);
      enableVideoSkip();
      setIsTransitioning(true);
      setTimeout(() => {
        onVideoComplete();
      }, 500);
    }, 7000);

    return () => clearTimeout(timeout);
  }, [isLoaded, hasVideoError, isTransitioning, enableVideoSkip, onVideoComplete]);

  // Update progress bar while video is playing
  useEffect(() => {
    if (!isPlaying || !videoRef.current) return;

    const updateProgress = () => {
      if (videoRef.current && !videoRef.current.paused) {
        const currentProgress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
        setProgress(currentProgress);
      }
    };

    // Update progress every 100ms for smooth animation
    const interval = setInterval(updateProgress, 100);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleVideoLoaded = () => {
    setIsLoaded(true);
    // Auto-play when loaded
    videoRef.current?.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {
      // Auto-play blocked, wait for user interaction
    });
  };

  const handleVideoError = () => {
    setHasVideoError(true);
    setShowSkip(true);
    enableVideoSkip();
  };

  const handleVideoEnded = () => {
    setIsTransitioning(true);
    // Smooth transition to next step
    setTimeout(() => {
      onVideoComplete();
    }, 800);
  };

  const handleSkip = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setIsTransitioning(true);
    setTimeout(() => {
      onVideoSkip();
    }, 400);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const tryPlay = useCallback(() => {
    videoRef.current?.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {
      // Still blocked
    });
  }, []);

  return (
    <div 
      className={cn(
        'fixed inset-0 z-50 bg-black transition-opacity duration-1000',
        isTransitioning ? 'opacity-0 pointer-events-none' : 'opacity-100'
      )}
    >
      {/* Video Container */}
      <div className="relative w-full h-full">
        {/* Brain Video */}
        <video
          ref={videoRef}
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-1000',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          playsInline
          preload="auto"
          muted={isMuted}
          onLoadedData={handleVideoLoaded}
          onError={handleVideoError}
          onEnded={handleVideoEnded}
          onClick={tryPlay}
          poster="/images/life-design-hero-illustration.png"
        >
          {/* Using a gradient placeholder since actual video file may not exist yet */}
          <source src="/videos/brain-cinematic.mp4" type="video/mp4" />
        </video>

        {/* Fallback gradient animation when video not available */}
        {(!isLoaded || hasVideoError || hasTimedOut) && (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900">
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-transparent to-teal-500/10 animate-pulse-subtle" />
            
            {/* Neural network visualization placeholder */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                {/* Pulsing orbs */}
                <div className="absolute -inset-32 bg-cyan-500/20 rounded-full blur-3xl animate-pulse-subtle" />
                <div className="absolute -inset-24 bg-teal-500/20 rounded-full blur-2xl animate-pulse-subtle" style={{ animationDelay: '1s' }} />
                
                {/* Center loading indicator */}
                <div className="relative flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
                  <p className="text-cyan-300/70 text-sm font-light tracking-wider">
                    {hasVideoError || hasTimedOut ? 'Setting the scene...' : 'Preparing your experience...'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cinematic letterbox bars */}
        <div className="absolute top-0 left-0 right-0 h-[8vh] bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-[8vh] bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

        {/* Top controls */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10">
          {/* Skip button */}
          <button
            onClick={handleSkip}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium',
              'bg-white/5 backdrop-blur-md border border-white/10',
              'text-white/60 hover:text-white hover:bg-white/10',
              'transition-all duration-500 ease-out',
              showSkip || canSkipVideo
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 -translate-y-4 pointer-events-none'
            )}
          >
            <SkipForward className="w-4 h-4" />
            <span>Skip intro</span>
          </button>

          {/* Mute toggle */}
          <button
            onClick={toggleMute}
            className={cn(
              'p-3 rounded-full',
              'bg-white/5 backdrop-blur-md border border-white/10',
              'text-white/60 hover:text-white hover:bg-white/10',
              'transition-all duration-300'
            )}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Center play prompt (if autoplay blocked) */}
        {!isPlaying && isLoaded && (
          <div 
            className="absolute inset-0 flex items-center justify-center cursor-pointer z-10"
            onClick={tryPlay}
          >
            <div className="flex flex-col items-center gap-4 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group hover:scale-110 transition-transform">
                <svg 
                  className="w-8 h-8 text-white ml-1" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="text-white/60 text-sm font-light tracking-wider">
                Click to begin
              </p>
            </div>
          </div>
        )}

        {/* Subtle progress indicator at bottom */}
        {isPlaying && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-400 to-teal-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-white/40 text-xs font-light tracking-wider">
              Your journey begins
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Beach background component for the floating UI stages
interface BeachBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export function BeachBackground({ children, className }: BeachBackgroundProps) {
  const [hasVideoError, setHasVideoError] = useState(false);

  return (
    <div className={cn('fixed inset-0 overflow-hidden', className)}>
      {/* Static fallback image if video is unavailable */}
      <Image
        src="/images/life-design-hero-illustration.png"
        alt=""
        fill
        priority
        className={cn(
          'absolute inset-0 object-cover transition-opacity duration-500',
          hasVideoError ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* Beach video background */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        poster="/images/life-design-hero-illustration.png"
        onError={() => setHasVideoError(true)}
      >
        <source src="/videos/beach-hero.mp4" type="video/mp4" />
      </video>

      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />
      
      {/* Ocean tint overlay */}
      <div className="absolute inset-0 bg-cyan-900/10 mix-blend-overlay" />
      
      {/* Animated wave overlay */}
      <div className="absolute inset-0 opacity-30">
        <div 
          className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 via-transparent to-transparent"
          style={{
            animation: 'waveFlow 8s ease-in-out infinite',
          }}
        />
      </div>

      {/* Content container */}
      <div className="relative z-10 w-full h-full overflow-auto">
        {children}
      </div>
    </div>
  );
}
