'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ParallaxValues {
  x: number;
  y: number;
  rotateX: number;
  rotateY: number;
}

interface UseParallaxOptions {
  intensity?: number;
  smoothing?: number;
  maxRotation?: number;
  gyroscopeIntensity?: number;
  enabled?: boolean;
}

interface UseParallaxReturn {
  values: ParallaxValues;
  isGyroscopeActive: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  reset: () => void;
}

export function useParallax(options: UseParallaxOptions = {}): UseParallaxReturn {
  const {
    intensity = 0.05,
    smoothing = 0.08,
    maxRotation = 3,
    gyroscopeIntensity = 0.03,
    enabled = true,
  } = options;

  const [values, setValues] = useState<ParallaxValues>({
    x: 0,
    y: 0,
    rotateX: 0,
    rotateY: 0,
  });

  const [isGyroscopeActive, setIsGyroscopeActive] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const targetValuesRef = useRef({ x: 0, y: 0 });
  const currentValuesRef = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number | null>(null);
  const isTouchDevice = useRef(false);

  // Detect touch device
  useEffect(() => {
    isTouchDevice.current =
      'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  // Linear interpolation for smooth animation
  const lerp = useCallback((start: number, end: number, factor: number): number => {
    return start + (end - start) * factor;
  }, []);

  // Animation loop for smooth value interpolation
  const animate = useCallback(() => {
    const target = targetValuesRef.current;
    const current = currentValuesRef.current;

    // Smoothly interpolate current values toward target
    current.x = lerp(current.x, target.x, smoothing);
    current.y = lerp(current.y, target.y, smoothing);

    // Calculate rotation based on position
    const rotateY = (current.x / (window.innerWidth / 2)) * maxRotation;
    const rotateX = -(current.y / (window.innerHeight / 2)) * maxRotation;

    setValues({
      x: current.x * intensity,
      y: current.y * intensity,
      rotateX,
      rotateY,
    });

    animationRef.current = requestAnimationFrame(animate);
  }, [intensity, smoothing, maxRotation, lerp]);

  // Start animation loop
  useEffect(() => {
    if (!enabled) return;

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate, enabled]);

  // Mouse move handler
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!enabled || isGyroscopeActive) return;

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      // Calculate offset from center
      targetValuesRef.current = {
        x: event.clientX - centerX,
        y: event.clientY - centerY,
      };
    },
    [enabled, isGyroscopeActive]
  );

  // Gyroscope handler for mobile
  const handleDeviceOrientation = useCallback(
    (event: DeviceOrientationEvent) => {
      if (!enabled) return;

      const { beta, gamma } = event;

      if (beta !== null && gamma !== null) {
        // Beta is front-to-back tilt (-180 to 180)
        // Gamma is left-to-right tilt (-90 to 90)
        const sensitivity = gyroscopeIntensity * 100;

        targetValuesRef.current = {
          x: gamma * sensitivity,
          y: beta * sensitivity,
        };
      }
    },
    [enabled, gyroscopeIntensity]
  );

  // Request gyroscope permission for iOS
  const requestGyroscopePermission = useCallback(async () => {
    if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
      try {
        const permission = await (
          DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }
        ).requestPermission();
        return permission === 'granted';
      } catch {
        return false;
      }
    }
    return true;
  }, []);

  // Setup event listeners
  useEffect(() => {
    if (!enabled) return;

    // Mouse events for desktop
    if (!isTouchDevice.current) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
    } else {
      // Try to enable gyroscope on mobile
      requestGyroscopePermission().then((granted) => {
        if (granted) {
          setIsGyroscopeActive(true);
          window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });
        }
      });
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
    };
  }, [enabled, handleMouseMove, handleDeviceOrientation, requestGyroscopePermission]);

  // Reset to center
  const reset = useCallback(() => {
    targetValuesRef.current = { x: 0, y: 0 };
  }, []);

  // Pause animation when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      } else if (!document.hidden && enabled) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [animate, enabled]);

  return {
    values,
    isGyroscopeActive,
    containerRef,
    reset,
  };
}

export default useParallax;
