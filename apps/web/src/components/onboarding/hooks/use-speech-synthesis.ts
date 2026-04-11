import { useCallback, useEffect, useRef, useState } from 'react';
interface PreviewVoiceOption {
  id: string;
  previewText: string;
  gender: 'male' | 'female';
}

interface UseSpeechSynthesisOptions {
  voicePreference: string;
}

export function useSpeechSynthesis({ voicePreference }: UseSpeechSynthesisOptions) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supportsSpeechSynthesis, setSupportsSpeechSynthesis] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setSupportsSpeechSynthesis(false);
      return;
    }

    setSupportsSpeechSynthesis(true);

    const loadVoices = () => {
      setAvailableVoices(window.speechSynthesis.getVoices());
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      if (synthesisRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakMessage = useCallback(
    (text: string) => {
      if (!supportsSpeechSynthesis) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      synthesisRef.current = utterance;

      // Pick a voice matching the preference from available browser voices
      const voiceMap: Record<string, string[]> = {
        'calm-british-female': ['Google UK English Female', 'Samantha', 'Victoria'],
        'warm-american-male': ['Google US English Male', 'Daniel', 'Alex'],
        'soft-australian-female': ['Karen', 'Google UK English Female'],
      };
      const preferredVoices = voiceMap[voicePreference];
      const matchedVoice = availableVoices.find((v) =>
        preferredVoices?.some((p) => v.name.includes(p) || v.lang.includes(p))
      );
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.rate = 0.88;
      utterance.pitch = voicePreference === 'warm-american-male' ? 0.92 : 1.02;
      utterance.volume = 0.85;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [availableVoices, supportsSpeechSynthesis, voicePreference]
  );

  const stopSpeaking = useCallback(() => {
    if (supportsSpeechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, [supportsSpeechSynthesis]);

  const previewVoiceOption = useCallback((voice: PreviewVoiceOption) => {
    if (!('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(voice.previewText);
    const voices = window.speechSynthesis.getVoices();
    const voiceMap: Record<string, string[]> = {
      'calm-british-female': ['Google UK English Female', 'Samantha', 'Victoria'],
      'warm-american-male': ['Google US English Male', 'Daniel', 'Alex'],
      'soft-australian-female': ['Karen', 'Google UK English Female'],
    };

    const preferredVoices = voiceMap[voice.id];
    const matchingVoice = voices.find((candidate) =>
      preferredVoices?.some(
        (preferred) =>
          candidate.name.includes(preferred) || candidate.lang.includes(preferred)
      )
    );

    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }
    utterance.rate = 0.88;
    utterance.pitch = voice.gender === 'female' ? 1.02 : 0.92;

    window.speechSynthesis.speak(utterance);
  }, []);

  return {
    isSpeaking,
    supportsSpeechSynthesis,
    speakMessage,
    stopSpeaking,
    previewVoiceOption,
  };
}
