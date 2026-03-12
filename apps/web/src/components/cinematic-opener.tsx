'use client';

import { useState, useEffect, useCallback } from 'react';
import { BeachHero, BeachParticles } from './beach-hero';
import { CrossfadeContainer, FadeInContainer } from './video-transition';
import { Theme, useTheme } from './theme/theme-provider';
import { Volume2, VolumeX, Sparkles, Waves, Moon, Mic } from 'lucide-react';

interface CinematicOpenerProps {
  // Video sources
  brainVideoUrl?: string;
  brainVideoDuration?: number; // seconds, default 8
  beachVideoUrl?: string;
  beachImageUrl?: string;

  // Content
  welcomeTitle?: string;
  welcomeSubtitle?: string;

  // Callbacks
  onComplete?: () => void;
  onThemeSelect?: (theme: Theme) => void;
  onVoiceSelect?: (voiceId: string) => void;
  onSkip?: () => void;

  // Options
  autoPlay?: boolean;
  enableSound?: boolean;
  className?: string;
}

// Theme options with their visual styles
const THEME_OPTIONS = [
  {
    id: 'botanical' as Theme,
    name: 'Ethereal Botanical',
    description: 'Soft florals & gentle nature',
    icon: Sparkles,
    gradient: 'from-[#e8b4d0]/30 via-[#c5b8d4]/30 to-[#b8c5a8]/30',
    accent: '#e8b4d0',
  },
  {
    id: 'ocean' as Theme,
    name: 'Ocean Zen',
    description: 'Calming waves & tranquility',
    icon: Waves,
    gradient: 'from-[#5fb3b3]/30 via-[#8fd4d4]/30 to-[#b8e6e6]/30',
    accent: '#5fb3b3',
  },
  {
    id: 'modern' as Theme,
    name: 'Dark Modern',
    description: 'Sophisticated & architectural',
    icon: Moon,
    gradient: 'from-[#d4a574]/30 via-[#c9a86c]/30 to-[#b87333]/30',
    accent: '#c9a86c',
  },
];

// Voice options
const VOICE_OPTIONS = [
  {
    id: 'serene',
    name: 'Serene',
    description: 'Calm & grounding',
    tone: 'Gentle, measured pace',
    icon: '🕊️',
  },
  {
    id: 'wise',
    name: 'Wise',
    description: 'Thoughtful & inspiring',
    tone: 'Warm, reflective',
    icon: '🦉',
  },
  {
    id: 'energizing',
    name: 'Energizing',
    description: 'Motivating & vibrant',
    tone: 'Bright, encouraging',
    icon: '☀️',
  },
];

export function CinematicOpener({
  brainVideoUrl = '/videos/brain-neural-animation.mp4',
  brainVideoDuration = 8,
  beachVideoUrl,
  beachImageUrl = '/images/life-design-hero-illustration.png',
  welcomeTitle = 'Welcome to Your Journey',
  welcomeSubtitle = 'Choose your atmosphere and companion',
  onComplete,
  onThemeSelect,
  onVoiceSelect,
  onSkip,
  autoPlay = true,
  enableSound = false,
  className = '',
}: CinematicOpenerProps) {
  const { theme, setTheme } = useTheme();

  // State management
  const [phase, setPhase] = useState<'brain' | 'transitioning' | 'beach' | 'ui'>('brain');
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(!enableSound);
  const [selectedTheme, setSelectedTheme] = useState<Theme>(theme);
  const [selectedVoice, setSelectedVoice] = useState<string>('serene');
  const [showUI, setShowUI] = useState(false);
  const [brainVideoLoaded, setBrainVideoLoaded] = useState(false);
  const [beachLoaded, setBeachLoaded] = useState(false);

  // Handle brain video phase
  useEffect(() => {
    if (!autoPlay) return;

    let interval: NodeJS.Timeout;

    if (phase === 'brain' && brainVideoLoaded) {
      const step = 100 / ((brainVideoDuration * 1000) / 50); // Update every 50ms

      interval = setInterval(() => {
        setProgress((prev) => {
          const next = prev + step;
          if (next >= 100) {
            // Transition to beach phase
            setPhase('transitioning');
            setTimeout(() => {
              setPhase('beach');
              setShowUI(true);
              // UI elements fade in after beach loads
              setTimeout(() => {
                setPhase('ui');
              }, 500);
            }, 2000); // 2 second crossfade
            return 100;
          }
          return next;
        });
      }, 50);
    }

    return () => clearInterval(interval);
  }, [phase, brainVideoLoaded, brainVideoDuration, autoPlay]);

  // Handle theme selection
  const handleThemeSelect = useCallback(
    (newTheme: Theme) => {
      setSelectedTheme(newTheme);
      setTheme(newTheme);
      onThemeSelect?.(newTheme);
    },
    [setTheme, onThemeSelect]
  );

  // Handle voice selection
  const handleVoiceSelect = useCallback(
    (voiceId: string) => {
      setSelectedVoice(voiceId);
      onVoiceSelect?.(voiceId);
    },
    [onVoiceSelect]
  );

  // Handle completion
  const handleComplete = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  // Skip animation
  const handleSkip = useCallback(() => {
    setPhase('ui');
    setShowUI(true);
    onSkip?.();
  }, [onSkip]);

  // Brain video component
  const BrainVideo = (
    <div className="absolute inset-0 bg-[#050508] flex items-center justify-center">
      <video
        autoPlay={autoPlay}
        muted={isMuted}
        playsInline
        onLoadedData={() => setBrainVideoLoaded(true)}
        className="w-full h-full object-cover"
      >
        <source src={brainVideoUrl} type="video/mp4" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white/60 text-lg">Your browser does not support video</div>
        </div>
      </video>

      {/* Neural overlay effect */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/60" />

      {/* Progress indicator */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
        <div className="w-48 h-0.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/60 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-white/40 text-xs font-light tracking-widest uppercase">
          Initializing Experience
        </span>
      </div>

      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="absolute bottom-8 right-8 text-white/40 hover:text-white/80 text-xs font-light tracking-wider transition-colors duration-300"
      >
        Skip Intro
      </button>

      {/* Sound toggle */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-8 right-8 p-3 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all duration-300"
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-white/60" />
        ) : (
          <Volume2 className="w-5 h-5 text-white/60" />
        )}
      </button>
    </div>
  );

  // Beach scene with UI
  const BeachScene = (
    <div className="absolute inset-0">
      <BeachHero
        videoUrl={beachVideoUrl}
        imageUrl={beachImageUrl}
        onLoad={() => setBeachLoaded(true)}
        parallaxIntensity={25}
        overlayOpacity={0.35}
      >
        {/* Atmospheric particles */}
        <BeachParticles count={30} color="rgba(255, 255, 255, 0.2)" />

        {/* UI Overlay */}
        {showUI && (
          <div className="w-full max-w-4xl mx-auto px-6 py-12 flex flex-col items-center gap-8">
            {/* Welcome Message */}
            <FadeInContainer show={phase === 'ui'} delay={0} duration={1000} direction="up" distance={30}>
              <div className="text-center mb-4">
                <h1
                  className="text-4xl md:text-5xl lg:text-6xl font-light text-white mb-4 tracking-tight"
                  style={{
                    textShadow: '0 4px 30px rgba(0,0,0,0.3)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {welcomeTitle}
                </h1>
                <p className="text-white/70 text-lg md:text-xl font-light">
                  {welcomeSubtitle}
                </p>
              </div>
            </FadeInContainer>

            {/* Theme Selection */}
            <FadeInContainer show={phase === 'ui'} delay={300} duration={800} direction="up" distance={20}>
              <div className="w-full">
                <h2 className="text-white/50 text-xs font-medium tracking-widest uppercase mb-4 text-center">
                  Choose Your Atmosphere
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {THEME_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleThemeSelect(option.id)}
                      className={`glass-card group relative p-6 rounded-2xl transition-all duration-500 overflow-hidden ${
                        selectedTheme === option.id
                          ? 'bg-white/10 ring-1 ring-white/30 shadow-2xl scale-[1.02]'
                          : ''
                      }`}
                    >
                      {/* Gradient background */}
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${option.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                      />

                      <div className="relative z-10 flex flex-col items-center text-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110"
                          style={{
                            background: option.accent + '20',
                            boxShadow: `0 8px 32px ${option.accent}30`,
                          }}
                        >
                          <option.icon
                            className="w-6 h-6"
                            style={{ color: option.accent }}
                          />
                        </div>
                        <div>
                          <h3 className="text-white font-medium text-sm mb-1">
                            {option.name}
                          </h3>
                          <p className="text-white/50 text-xs">
                            {option.description}
                          </p>
                        </div>
                      </div>

                      {/* Selection indicator */}
                      {selectedTheme === option.id && (
                        <div
                          className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                          style={{ background: option.accent }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </FadeInContainer>

            {/* Voice Selection */}
            <FadeInContainer show={phase === 'ui'} delay={500} duration={800} direction="up" distance={20}>
              <div className="w-full">
                <h2 className="text-white/50 text-xs font-medium tracking-widest uppercase mb-4 text-center">
                  Select Your Voice Companion
                </h2>
                <div className="flex flex-col md:flex-row gap-3 justify-center">
                  {VOICE_OPTIONS.map((voice) => (
                    <button
                      key={voice.id}
                      onClick={() => handleVoiceSelect(voice.id)}
                      className={`glass-card group flex items-center gap-4 px-6 py-4 rounded-xl transition-all duration-300 ${
                        selectedVoice === voice.id
                          ? 'bg-white/10 ring-1 ring-white/30'
                          : ''
                      }`}
                    >
                      <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
                        {voice.icon}
                      </span>
                      <div className="text-left">
                        <h3 className="text-white font-medium text-sm">
                          {voice.name}
                        </h3>
                        <p className="text-white/50 text-xs">
                          {voice.description}
                        </p>
                      </div>
                      {selectedVoice === voice.id && (
                        <div className="ml-auto">
                          <div className="w-2 h-2 rounded-full bg-white/60" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </FadeInContainer>

            {/* Continue Button */}
            <FadeInContainer show={phase === 'ui'} delay={700} duration={800} direction="up" distance={20}>
              <button
                onClick={handleComplete}
                className="glass-card group relative px-10 py-4 rounded-full hover:bg-white/15 ring-1 ring-white/20 hover:ring-white/40 transition-all duration-500 overflow-hidden"
              >
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                <span className="relative z-10 flex items-center gap-3 text-white font-medium text-sm tracking-wide">
                  <Mic className="w-4 h-4" />
                  Begin Your Journey
                </span>
              </button>
            </FadeInContainer>
          </div>
        )}
      </BeachHero>
    </div>
  );

  return (
    <div className={`relative w-full h-screen overflow-hidden bg-[#050508] ${className}`}>
      {/* Crossfade between brain video and beach scene */}
      <CrossfadeContainer
        showFirst={phase === 'brain' || phase === 'transitioning'}
        first={BrainVideo}
        second={BeachScene}
        duration={phase === 'transitioning' ? 2000 : 0}
      />

      {/* Transition blur overlay */}
      {phase === 'transitioning' && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-20 pointer-events-none animate-pulse" />
      )}
    </div>
  );
}

// Simplified version for use in existing onboarding flow
interface CinematicOpenerLiteProps {
  onComplete?: () => void;
  className?: string;
}

export function CinematicOpenerLite({
  onComplete,
  className = '',
}: CinematicOpenerLiteProps) {
  return (
    <CinematicOpener
      brainVideoDuration={6}
      beachImageUrl="/images/life-design-hero-illustration.png"
      welcomeTitle="Welcome to Life Design"
      welcomeSubtitle="Your personal journey begins here"
      onComplete={onComplete}
      className={className}
    />
  );
}

export default CinematicOpener;
