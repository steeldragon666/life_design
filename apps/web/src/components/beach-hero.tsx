'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';

interface BeachHeroProps {
  videoUrl?: string;
  imageUrl?: string;
  fallbackImageUrl?: string;
  overlayOpacity?: number;
  parallaxIntensity?: number;
  className?: string;
  children?: React.ReactNode;
  onLoad?: () => void;
}

export function BeachHero({
  videoUrl,
  imageUrl,
  fallbackImageUrl = '/images/life-design-hero-illustration.png',
  overlayOpacity = 0.3,
  parallaxIntensity = 20,
  className = '',
  children,
  onLoad,
}: BeachHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [useVideo, setUseVideo] = useState(!!videoUrl);
  const [mediaError, setMediaError] = useState(false);

  // Handle parallax on mouse move
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Calculate offset from center (normalized -1 to 1)
      const offsetX = (e.clientX - rect.left - centerX) / centerX;
      const offsetY = (e.clientY - rect.top - centerY) / centerY;

      setMousePosition({
        x: offsetX * parallaxIntensity,
        y: offsetY * parallaxIntensity,
      });
    },
    [parallaxIntensity]
  );

  // Add/remove mouse move listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mousemove', handleMouseMove);
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseMove]);

  // Handle media load
  const handleMediaLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  // Handle video error
  const handleVideoError = () => {
    console.warn('Video failed to load, falling back to image');
    setUseVideo(false);
    setMediaError(true);
  };

  // Handle image error
  const handleImageError = () => {
    console.warn('Image failed to load');
    setMediaError(true);
  };

  // Determine which media to display
  const displayUrl = mediaError
    ? fallbackImageUrl
    : useVideo && videoUrl
      ? videoUrl
      : imageUrl || fallbackImageUrl;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{ perspective: '1000px' }}
    >
      {/* Background Media Layer with Parallax */}
      <div
        className="absolute inset-0 transition-transform duration-300 ease-out will-change-transform"
        style={{
          transform: `translate(${-mousePosition.x}px, ${-mousePosition.y}px) scale(1.1)`,
        }}
      >
        {useVideo && videoUrl && !mediaError ? (
          // Video Background
          <video
            autoPlay
            muted
            loop
            playsInline
            onLoadedData={handleMediaLoad}
            onError={handleVideoError}
            className="w-full h-full object-cover"
            poster={imageUrl}
          >
            <source src={videoUrl} type="video/mp4" />
            {/* Fallback to image if video fails */}
            <Image
              src={imageUrl || fallbackImageUrl}
              alt="Beach background"
              fill
              priority
              className="object-cover"
              onLoad={handleMediaLoad}
              onError={handleImageError}
            />
          </video>
        ) : (
          // Image Background
          <Image
            src={displayUrl}
            alt="Beach background"
            fill
            priority
            className="object-cover"
            onLoad={handleMediaLoad}
            onError={handleImageError}
            sizes="100vw"
          />
        )}
      </div>

      {/* Gradient Overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/40"
        style={{ opacity: isLoaded ? 1 : 0, transition: 'opacity 1s ease' }}
      />

      {/* Vignette Effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(0,0,0,0.4) 100%)',
          opacity: isLoaded ? overlayOpacity : 0,
          transition: 'opacity 1s ease',
        }}
      />

      {/* Noise Texture Overlay for Cinematic Feel */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Content Layer */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        {children}
      </div>

      {/* Loading State */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0e17]">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
            <span className="text-white/60 text-sm font-light tracking-wider">
              Loading experience...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Parallax layers for depth effect
interface ParallaxLayerProps {
  depth: number; // 0 = background, 1 = foreground
  children: React.ReactNode;
  className?: string;
}

export function ParallaxLayer({ depth, children, className = '' }: ParallaxLayerProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = layerRef.current?.parentElement?.getBoundingClientRect();
      if (!rect) return;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const offsetX = (e.clientX - rect.left - centerX) / centerX;
      const offsetY = (e.clientY - rect.top - centerY) / centerY;

      // More depth = more movement (reversed for parallax)
      const intensity = depth * 30;

      setMousePosition({
        x: offsetX * intensity,
        y: offsetY * intensity,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [depth]);

  return (
    <div
      ref={layerRef}
      className={`absolute inset-0 transition-transform duration-200 ease-out will-change-transform ${className}`}
      style={{
        transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
        zIndex: Math.round(depth * 100),
      }}
    >
      {children}
    </div>
  );
}

// Floating particle effect for beach atmosphere
interface BeachParticlesProps {
  count?: number;
  color?: string;
  className?: string;
}

export function BeachParticles({
  count = 20,
  color = 'rgba(255, 255, 255, 0.3)',
  className = '',
}: BeachParticlesProps) {
  const particles = useRef<
    Array<{
      x: number;
      y: number;
      size: number;
      speed: number;
      opacity: number;
    }>
  >([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Initialize particles
    particles.current = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 0.5 + 0.2,
      opacity: Math.random() * 0.5 + 0.2,
    }));
  }, [count]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const draw = () => {
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.current.forEach((particle) => {
        // Update position
        particle.y -= particle.speed;
        particle.x += Math.sin(particle.y * 0.01) * 0.5;

        // Reset if off screen
        if (particle.y < -10) {
          particle.y = canvas.height + 10;
          particle.x = Math.random() * canvas.width;
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = color.replace('0.3', String(particle.opacity));
        ctx.fill();
      });

      animationId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, [color]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
