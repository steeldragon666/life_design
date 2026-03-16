import { useState, useCallback, useRef, useEffect } from 'react';
import type { MentorArchetype } from '@/lib/mentor-archetypes';
import { getArchetypeConfig } from '@/lib/mentor-archetypes';

interface UseElevenLabsTTSOptions {
  speed?: number;
  fallbackToBrowser?: boolean;
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
}

interface UseElevenLabsTTSReturn {
  speak: (text: string, archetype: MentorArchetype) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
  isLoading: boolean;
  error: Error | null;
}

export function useElevenLabsTTS(options: UseElevenLabsTTSOptions = {}): UseElevenLabsTTSReturn {
  const { speed = 1.0, fallbackToBrowser = true, onSpeakStart, onSpeakEnd } = options;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const listenersRef = useRef<{ play: () => void; ended: () => void; error: () => void } | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    if (audioRef.current) {
      if (listenersRef.current) {
        audioRef.current.removeEventListener('play', listenersRef.current.play);
        audioRef.current.removeEventListener('ended', listenersRef.current.ended);
        audioRef.current.removeEventListener('error', listenersRef.current.error);
        listenersRef.current = null;
      }
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  const fallbackSpeak = useCallback((text: string, archetype: MentorArchetype) => {
    if (typeof speechSynthesis === 'undefined') return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const config = getArchetypeConfig(archetype);
    const voices = speechSynthesis.getVoices();
    // Try to match preferred voice
    for (const pref of config.preferredVoices) {
      const match = voices.find(v => v.name.includes(pref) || v.lang.includes(pref));
      if (match) { utterance.voice = match; break; }
    }
    utterance.rate = 0.88;
    utterance.onstart = () => { setIsSpeaking(true); onSpeakStart?.(); };
    utterance.onend = () => { setIsSpeaking(false); onSpeakEnd?.(); };
    utterance.onerror = () => { setIsSpeaking(false); onSpeakEnd?.(); };
    speechSynthesis.speak(utterance);
  }, [onSpeakStart, onSpeakEnd]);

  const speak = useCallback(async (text: string, archetype: MentorArchetype) => {
    stop();
    setError(null);
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, archetype, speed }),
        signal: controller.signal,
      });

      if (!res.ok) {
        if (fallbackToBrowser) {
          setIsLoading(false);
          fallbackSpeak(text, archetype);
          return;
        }
        throw new Error(`TTS failed: ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      const handlePlay = () => {
        setIsLoading(false);
        setIsSpeaking(true);
        onSpeakStart?.();
      };
      const handleEnded = () => {
        setIsSpeaking(false);
        onSpeakEnd?.();
        URL.revokeObjectURL(url);
        blobUrlRef.current = null;
      };
      const handleError = () => {
        setIsSpeaking(false);
        setIsLoading(false);
        // Don't call onSpeakEnd here — the catch block handles fallback/cleanup
      };

      audio.addEventListener('play', handlePlay);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);
      listenersRef.current = { play: handlePlay, ended: handleEnded, error: handleError };

      await audio.play();
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError(err as Error);
      setIsLoading(false);
      if (fallbackToBrowser) {
        fallbackSpeak(text, archetype);
      } else {
        onSpeakEnd?.();
      }
    }
  }, [stop, speed, fallbackToBrowser, fallbackSpeak, onSpeakStart, onSpeakEnd]);

  // Cleanup on unmount
  useEffect(() => stop, [stop]);

  return { speak, stop, isSpeaking, isLoading, error };
}
