'use client';

import { useState } from 'react';
import { Play, Pause, Sparkles } from 'lucide-react';
import { useGuest } from '@/lib/guest-context';
import { buildGuidedMeditationPrompt } from '@/lib/mentor-orchestrator';

const MEDITATION_THEMES = [
  { id: 'grounding', label: 'Grounding Reset', minutes: 4 },
  { id: 'anxiety', label: 'Anxiety Ease', minutes: 6 },
  { id: 'focus', label: 'Focus Flow', minutes: 5 },
  { id: 'gratitude', label: 'Gratitude Reflection', minutes: 5 },
];

export default function MeditationsPage() {
  const { profile, mentorProfile } = useGuest();
  const [selectedTheme, setSelectedTheme] = useState(MEDITATION_THEMES[0]);
  const [script, setScript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateMeditation() {
    setIsLoading(true);
    setError(null);
    const fallbackScript = 'Take a deep breath, and let your shoulders soften.';
    try {
      const systemPrompt = buildGuidedMeditationPrompt(
        mentorProfile,
        selectedTheme.label,
        selectedTheme.minutes
      );
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Generate a guided meditation script for ${selectedTheme.label} lasting around ${selectedTheme.minutes} minutes.`,
          systemPrompt,
          includePersistedMemory: true,
          userId: profile?.id,
          source: 'meditations',
        }),
      });

      if (!response.ok) {
        throw new Error('Meditation generation failed');
      }

      const data = await response.json();
      setScript(data.text || fallbackScript);
    } catch {
      setScript(fallbackScript);
      setError('Could not generate a custom script right now. A calming fallback script is ready instead.');
    } finally {
      setIsLoading(false);
    }
  }

  function playScript() {
    if (!script) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      setError('Audio playback is unavailable in this browser.');
      return;
    }

    setError(null);
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(script);
    utterance.rate = 0.86;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function stopScript() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="glass-card p-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Guided Meditations</h1>
            <p className="text-slate-400 text-sm">
              Led by {mentorProfile.characterName}, your {mentorProfile.archetype} companion.
            </p>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 space-y-4">
        <p className="text-sm text-slate-300">Choose a meditation focus:</p>
        <div className="grid md:grid-cols-4 gap-3">
          {MEDITATION_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setSelectedTheme(theme)}
              className={`rounded-xl p-3 text-left ${
                selectedTheme.id === theme.id ? 'bg-cyan-500/20 border border-cyan-400/40' : 'bg-white/5'
              }`}
            >
              <p className="text-white font-medium">{theme.label}</p>
              <p className="text-xs text-slate-400">{theme.minutes} min</p>
            </button>
          ))}
        </div>
        <button
          onClick={generateMeditation}
          disabled={isLoading}
          className="btn-primary"
        >
          {isLoading ? 'Generating session...' : 'Generate Guided Session'}
        </button>
      </div>

      <div className="glass-card p-6 space-y-4">
        {error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}
        <div className="flex gap-2">
          {!isSpeaking ? (
            <button onClick={playScript} className="btn-secondary inline-flex items-center gap-2" disabled={!script}>
              <Play className="h-4 w-4" />
              Play
            </button>
          ) : (
            <button onClick={stopScript} className="btn-secondary inline-flex items-center gap-2">
              <Pause className="h-4 w-4" />
              Pause
            </button>
          )}
        </div>
        <div className="rounded-xl bg-white/5 p-4 min-h-40">
          {script ? <p className="text-slate-200 whitespace-pre-wrap">{script}</p> : <p className="text-slate-500">Your generated meditation script appears here.</p>}
        </div>
        <p className="text-xs text-slate-500">
          This feature supports relaxation and reflection, and is not a medical treatment.
        </p>
      </div>
    </div>
  );
}
