'use client';

import { useCallback } from 'react';

export function useSound() {
  const play = useCallback((src: string, volume = 0.5) => {
    try {
      const enabled =
        typeof window !== 'undefined' &&
        localStorage.getItem('opt-in-sound-enabled') !== 'false';
      if (!enabled) return;

      const audio = new Audio(src);
      audio.volume = volume;
      audio.play().catch(() => {}); // Swallow autoplay errors (progressive enhancement)
    } catch {
      // Progressive enhancement — fail silently
    }
  }, []);

  return { play };
}
