'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { useGuest } from '@/lib/guest-context';

interface SoundscapeContextValue {
  resumeAudio: () => void;
}

const SoundscapeContext = createContext<SoundscapeContextValue | undefined>(undefined);

export function SoundscapeProvider({ children }: { children: React.ReactNode }) {
  const { soundscape } = useGuest();
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!audioContextRef.current) {
      audioContextRef.current = new window.AudioContext();
    }

    const ctx = audioContextRef.current;
    if (!gainRef.current) {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(ctx.destination);
      gainRef.current = gain;
    }

    if (!oscRef.current) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = soundscape.humFrequency;
      osc.connect(gainRef.current);
      osc.start();
      oscRef.current = osc;
    }

    oscRef.current.frequency.setValueAtTime(soundscape.humFrequency, ctx.currentTime);

    const targetVolume =
      soundscape.enabled && soundscape.humEnabled ? Math.min(Math.max(soundscape.volume, 0), 0.4) : 0;
    gainRef.current.gain.cancelScheduledValues(ctx.currentTime);
    gainRef.current.gain.linearRampToValueAtTime(targetVolume, ctx.currentTime + 0.6);
  }, [soundscape.enabled, soundscape.humEnabled, soundscape.humFrequency, soundscape.volume]);

  const value = useMemo(
    () => ({
      resumeAudio: () => {
        audioContextRef.current?.resume();
      },
    }),
    []
  );

  return <SoundscapeContext.Provider value={value}>{children}</SoundscapeContext.Provider>;
}

export function useSoundscape() {
  const context = useContext(SoundscapeContext);
  if (!context) {
    throw new Error('useSoundscape must be used within SoundscapeProvider');
  }
  return context;
}
