'use client';

import { useEffect, useMemo, useState } from 'react';
import { MoonStar, Pause, Play } from 'lucide-react';
import { getSelectedVoice } from '@/components/voice/voice-selector';
import { useGuest } from '@/lib/guest-context';
import { buildGuidedMeditationPrompt } from '@/lib/mentor-orchestrator';
import { inferMoodAdaptation } from '@/lib/mood-adapter';

const RITUAL_DURATION_MINUTES = 3;

const EVENING_FALLBACK_SCRIPT = `Welcome to your evening ritual.
Take one deep breath in, and slowly let the day soften on the exhale.
Unclench your jaw, relax your shoulders, and settle your posture.
Notice what emotion is most present right now without judging it.
Thank yourself for one effort you made today, even if it felt small.
Ask yourself: what did today teach me about what I need?
Choose one reflection action now: write three lines about one moment you want to carry forward.
Let this close the day with steadiness and care.`;

export default function EveningRitual() {
  const { mentorProfile, voicePreference, conversationMemory, checkins, appendConversationSummary } = useGuest();
  const [script, setScript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supportsSpeechSynthesis, setSupportsSpeechSynthesis] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const resolvedScript = useMemo(() => script || EVENING_FALLBACK_SCRIPT, [script]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
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
      window.speechSynthesis.cancel();
    };
  }, []);

  async function generateRitualScript() {
    setIsLoading(true);
    setError(null);

    try {
      const mood = inferMoodAdaptation(checkins);
      const prompt = `${buildGuidedMeditationPrompt(
        mentorProfile,
        'Evening grounding and reflection',
        RITUAL_DURATION_MINUTES,
        {
          mood,
          memory: conversationMemory,
        }
      )}

Additional ritual requirements:
- Keep the script suitable for a 2-3 minute spoken practice.
- Include exactly 3 brief grounding steps.
- Include exactly 1 reflection action that can be done in under 5 minutes.
- Keep all lines short and natural for text-to-speech.
- Return plain text only.`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      });

      if (!response.ok) {
        throw new Error('Evening ritual generation failed');
      }

      const data = await response.json();
      setScript(data.text || EVENING_FALLBACK_SCRIPT);
      appendConversationSummary('Completed a mentor-guided evening ritual.', 'meditation');
    } catch {
      setScript(EVENING_FALLBACK_SCRIPT);
      setError('Could not generate a custom evening ritual right now. A guided fallback script is ready.');
    } finally {
      setIsLoading(false);
    }
  }

  function playScript() {
    if (!supportsSpeechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      setError('Audio playback is unavailable in this browser. You can still read the ritual below.');
      return;
    }

    setError(null);
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(resolvedScript);
    const selectedVoice = getSelectedVoice(voicePreference, availableVoices);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.rate = 0.85;
    utterance.pitch = voicePreference === 'warm-american-male' ? 0.93 : 1;
    utterance.volume = 0.88;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }

  function stopScript() {
    if (supportsSpeechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="glass-card p-8">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20">
            <MoonStar className="h-5 w-5 text-indigo-300" />
          </div>
          <div>
            <h1 className="tracking-tight text-3xl font-bold text-white">Evening Ritual</h1>
            <p className="text-sm text-slate-400">
              Wind down with grounding and one thoughtful reflection guided by {mentorProfile.characterName}.
            </p>
          </div>
        </div>
      </div>

      <div className="glass-card space-y-4 p-6">
        <p className="text-sm text-slate-300">
          This ritual is designed for 2-3 minutes: settle the body, review the day, and close with one reflection action.
        </p>
        <button onClick={generateRitualScript} disabled={isLoading} className="btn-primary" type="button">
          {isLoading ? 'Preparing evening ritual...' : 'Generate Evening Ritual'}
        </button>
      </div>

      <div className="glass-card space-y-4 p-6">
        {error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <div className="flex gap-2">
          {!isSpeaking ? (
            <button onClick={playScript} className="btn-secondary inline-flex items-center gap-2" type="button">
              <Play className="h-4 w-4" />
              Play Ritual
            </button>
          ) : (
            <button onClick={stopScript} className="btn-secondary inline-flex items-center gap-2" type="button">
              <Pause className="h-4 w-4" />
              Pause
            </button>
          )}
        </div>

        {!supportsSpeechSynthesis ? (
          <p className="text-xs text-amber-300">
            Speech playback is not supported in this browser. You can still follow the written ritual.
          </p>
        ) : null}

        <div className="min-h-40 rounded-xl bg-white/5 p-4">
          <p className="whitespace-pre-wrap text-slate-200">{resolvedScript}</p>
        </div>
      </div>
    </div>
  );
}
