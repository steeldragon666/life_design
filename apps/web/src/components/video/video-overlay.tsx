'use client';

import React, { useMemo } from 'react';

export interface GradientOverlay {
  position: 'top' | 'bottom' | 'left' | 'right';
  height?: string;
  width?: string;
  opacity?: number;
  color?: string;
}

export interface VideoOverlayProps {
  // Gradient overlays for text readability
  gradientOverlays?: GradientOverlay[];
  defaultGradients?: boolean;

  // Vignette effect
  vignette?: boolean;
  vignetteIntensity?: number;
  vignetteColor?: string;

  // Color tint overlay
  colorTint?: string;
  tintOpacity?: number;

  // Grain/texture overlay
  grain?: boolean;
  grainIntensity?: number;
  grainAnimated?: boolean;

  // Blur overlay
  blur?: boolean;
  blurAmount?: number;

  // Scan lines (retro cinematic feel)
  scanLines?: boolean;
  scanLinesOpacity?: number;

  // Custom overlay content
  children?: React.ReactNode;

  // Styling
  className?: string;
}

export function VideoOverlay({
  gradientOverlays,
  defaultGradients = true,
  vignette = false,
  vignetteIntensity = 0.4,
  vignetteColor = '#000000',
  colorTint,
  tintOpacity = 0.2,
  grain = false,
  grainIntensity = 0.03,
  grainAnimated = true,
  blur = false,
  blurAmount = 4,
  scanLines = false,
  scanLinesOpacity = 0.1,
  children,
  className = '',
}: VideoOverlayProps) {
  // Generate default gradient overlays for text readability
  const defaultGradientConfigs: GradientOverlay[] = useMemo(
    () => [
      {
        position: 'top',
        height: '40%',
        opacity: 0.7,
        color: '#000000',
      },
      {
        position: 'bottom',
        height: '50%',
        opacity: 0.8,
        color: '#000000',
      },
    ],
    []
  );

  const activeGradients = gradientOverlays || (defaultGradients ? defaultGradientConfigs : []);

  // Generate gradient styles
  const getGradientStyle = (overlay: GradientOverlay): React.CSSProperties => {
    const { position, height = '30%', width = '30%', opacity = 0.5, color = '#000000' } = overlay;

    const baseStyles: React.CSSProperties = {
      position: 'absolute',
      pointerEvents: 'none',
      zIndex: 2,
    };

    let gradient = '';

    switch (position) {
      case 'top':
        gradient = `linear-gradient(to bottom, ${color} 0%, transparent 100%)`;
        return {
          ...baseStyles,
          top: 0,
          left: 0,
          right: 0,
          height,
          background: gradient,
          opacity,
        };
      case 'bottom':
        gradient = `linear-gradient(to top, ${color} 0%, transparent 100%)`;
        return {
          ...baseStyles,
          bottom: 0,
          left: 0,
          right: 0,
          height,
          background: gradient,
          opacity,
        };
      case 'left':
        gradient = `linear-gradient(to right, ${color} 0%, transparent 100%)`;
        return {
          ...baseStyles,
          top: 0,
          left: 0,
          bottom: 0,
          width,
          background: gradient,
          opacity,
        };
      case 'right':
        gradient = `linear-gradient(to left, ${color} 0%, transparent 100%)`;
        return {
          ...baseStyles,
          top: 0,
          right: 0,
          bottom: 0,
          width,
          background: gradient,
          opacity,
        };
      default:
        return baseStyles;
    }
  };

  // Generate vignette style
  const vignetteStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 3,
    background: `radial-gradient(ellipse at center, transparent 40%, ${vignetteColor}${Math.round(
      vignetteIntensity * 255
    )
      .toString(16)
      .padStart(2, '0')} 100%)`,
  };

  // Generate color tint style
  const tintStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 4,
    backgroundColor: colorTint,
    opacity: tintOpacity,
    mixBlendMode: 'overlay',
  };

  // Generate blur overlay style
  const blurStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 5,
    backdropFilter: `blur(${blurAmount}px)`,
    WebkitBackdropFilter: `blur(${blurAmount}px)`,
  };

  // Generate scan lines style
  const scanLinesStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 6,
    background: `repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 0, 0, ${scanLinesOpacity}) 2px,
      rgba(0, 0, 0, ${scanLinesOpacity}) 4px
    )`,
  };

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Gradient overlays */}
      {activeGradients.map((overlay, index) => (
        <div key={`gradient-${overlay.position}-${index}`} style={getGradientStyle(overlay)} />
      ))}

      {/* Vignette effect */}
      {vignette && <div style={vignetteStyle} />}

      {/* Color tint */}
      {colorTint && <div style={tintStyle} />}

      {/* Blur overlay */}
      {blur && <div style={blurStyle} />}

      {/* Scan lines */}
      {scanLines && <div style={scanLinesStyle} />}

      {/* Grain/texture overlay */}
      {grain && (
        <div
          className={`absolute inset-0 pointer-events-none z-7 ${
            grainAnimated ? 'animate-grain' : ''
          }`}
          style={{
            opacity: grainIntensity,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
          }}
        />
      )}

      {/* Children overlay (text, controls, etc.) */}
      {children && (
        <div className="absolute inset-0 z-10 pointer-events-auto">{children}</div>
      )}
    </div>
  );
}

// Preset overlay configurations for common use cases
export const VideoOverlayPresets = {
  // Cinematic with vignette and subtle grain
  cinematic: {
    defaultGradients: true,
    vignette: true,
    vignetteIntensity: 0.5,
    grain: true,
    grainIntensity: 0.02,
  },

  // Focus on text with strong top/bottom gradients
  textFocused: {
    defaultGradients: true,
    gradientOverlays: [
      { position: 'top', height: '50%', opacity: 0.85, color: '#000000' },
      { position: 'bottom', height: '60%', opacity: 0.9, color: '#000000' },
    ],
  },

  // Dreamy with color tint and blur
  dreamy: {
    defaultGradients: false,
    colorTint: 'hsl(var(--theme-primary))',
    tintOpacity: 0.15,
    blur: true,
    blurAmount: 2,
    vignette: true,
    vignetteIntensity: 0.3,
  },

  // Retro with scan lines
  retro: {
    defaultGradients: true,
    scanLines: true,
    scanLinesOpacity: 0.15,
    grain: true,
    grainIntensity: 0.05,
  },

  // Minimal - just subtle vignette
  minimal: {
    defaultGradients: false,
    vignette: true,
    vignetteIntensity: 0.3,
  },
} as const;

export default VideoOverlay;
