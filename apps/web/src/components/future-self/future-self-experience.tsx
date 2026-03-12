'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Pause, Play, Sparkles, VolumeX } from 'lucide-react';
import { Dimension, computeOverallScore } from '@life-design/core';
import { useGuest } from '@/lib/guest-context';
import { buildGuidedMeditationPrompt, buildMentorSystemPrompt } from '@/lib/mentor-orchestrator';
import { inferMoodAdaptation } from '@/lib/mood-adapter';
import ProjectionVisual from './projection-visual';

function buildFallbackNarrative(characterName: string, targetHarmony: number): string {
  return [
    `Settle your breath and imagine ${characterName} beside you, calm and steady.`,
    'Picture yourself one season ahead, waking with clarity and a softer nervous system.',
    'See your next small promise to yourself already complete, and notice the confidence that follows.',
    `Feel your inner balance moving toward ${targetHarmony}% harmony, guided by consistent rituals.`,
    'Place one hand on your heart and choose a single action for today.',
    'When you are ready, open your eyes and carry this future energy into your next step.',
  ].join('\n');
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export default function FutureSelfExperience() {
  const {
    mentorProfile,
    goals,
    checkins,
    conversationMemory,
    appendConversationSummary,
  } = useGuest();
  const [script, setScript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  const activeGoals = useMemo(
    () => goals.filter((goal) => goal.status === 'active'),
    [goals]
  );

  const latestCheckin = checkins[checkins.length - 1];
  const latestScores = latestCheckin?.dimension_scores ?? [];

  const currentHarmony = useMemo(() => {
    if (!latestScores.length) return 0;
    const score = computeOverallScore(latestScores as { dimension: Dimension; score: number }[]);
    return Math.round(score * 10);
  }, [latestScores]);

  const recentCheckinsCount = useMemo(() => {
    const now = Date.now();
    const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
    return checkins.filter((entry) => {
      const timestamp = new Date(entry.date).getTime();
      if (Number.isNaN(timestamp)) return false;
      return now - timestamp <= twoWeeksMs;
    }).length;
  }, [checkins]);

  const targetHarmony = useMemo(() => {
    const baseline = currentHarmony > 0 ? currentHarmony : 52;
    const goalLift = Math.min(activeGoals.length * 3, 12);
    const consistencyLift = Math.min(recentCheckinsCount * 2, 10);
    const mood = latestCheckin?.mood ?? 5;
    const moodLift = mood >= 7 ? 4 : mood <= 4 ? 1 : 2;
    return clamp(Math.round(baseline + 8 + goalLift + consistencyLift + moodLift), 58, 96);
  }, [activeGoals.length, currentHarmony, latestCheckin?.mood, recentCheckinsCount]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const available =
      'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
    setSpeechSupported(available);
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  async function generateNarrative() {
    setIsGenerating(true);
    setError(null);

    const fallbackScript = buildFallbackNarrative(mentorProfile.characterName, targetHarmony);

    try {
      const mood = inferMoodAdaptation(checkins);
      const mentorSystemPrompt = buildMentorSystemPrompt(mentorProfile, 'meditation', {
        mood,
        memory: conversationMemory,
      });
      const meditationPrompt = buildGuidedMeditationPrompt(
        mentorProfile,
        'Future Self Visualization',
        6,
        {
          mood,
          memory: conversationMemory,
        }
      );

      const topGoals = activeGoals
        .slice(0, 3)
        .map((goal) => `- ${goal.title} (${goal.horizon})`)
        .join('\n');

      const message = `${mentorSystemPrompt}

${meditationPrompt}

Personal context for this script:
- Current harmony index: ${currentHarmony}%
- Target harmony projection: ${targetHarmony}%
- Active goals count: ${activeGoals.length}
- Recent ritual check-ins (14 days): ${recentCheckinsCount}
${topGoals ? `- Active goals:\n${topGoals}` : '- Active goals: none yet'}

Now generate one guided visualization script where the user meets their future self.
Requirements:
- 10-16 short lines for speech synthesis
- include 2-3 sensory cues
- mention one concrete next action for today
- end with a calm closure sentence
- no medical claims`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error('Could not generate future-self script');
      }

      const data = await response.json();
      const nextScript = data.text || fallbackScript;
      setScript(nextScript);
      appendConversationSummary('Generated future-self visualization narrative.', 'meditation');
    } catch {
      setScript(fallbackScript);
      setError('Live generation is unavailable right now. A calming fallback narrative is ready.');
    } finally {
      setIsGenerating(false);
    }
  }

  function speakScript() {
    if (!script) return;

    if (!speechSupported) {
      setError('Speech playback is unavailable in this browser. You can still read the guided script.');
      return;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsSpeaking(true);
      setIsPaused(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(script);
    utterance.rate = 0.87;
    utterance.pitch = 1;
    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
      setError(null);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setError('Speech playback failed. You can continue with the written narrative.');
    };
    window.speechSynthesis.speak(utterance);
  }

  function pauseScript() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.pause();
    setIsSpeaking(false);
    setIsPaused(true);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="glass-card p-8">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-cyan-300" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-white tracking-tight">Future Self Visualization</h1>
            <p className="text-sm text-slate-400">
              Guided by {mentorProfile.characterName}, project your calm next chapter and choose one aligned step.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Guided Narrative</h2>
            <button onClick={generateNarrative} disabled={isGenerating} className="btn-primary">
              {isGenerating ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </span>
              ) : (
                'Generate Future Script'
              )}
            </button>
          </div>

          {error ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              {error}
            </div>
          ) : null}

          {!speechSupported ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300 inline-flex items-center gap-2">
              <VolumeX className="h-4 w-4 text-slate-400" />
              Audio guidance is unavailable. Read mode is active.
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {!isSpeaking ? (
                <button
                  onClick={speakScript}
                  className="btn-secondary inline-flex items-center gap-2"
                  disabled={!script}
                >
                  <Play className="h-4 w-4" />
                  {isPaused ? 'Resume' : 'Play'}
                </button>
              ) : (
                <button onClick={pauseScript} className="btn-secondary inline-flex items-center gap-2">
                  <Pause className="h-4 w-4" />
                  Pause
                </button>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 min-h-[300px]">
            {script ? (
              <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">{script}</p>
            ) : (
              <p className="text-slate-500">
                Generate a future-self narrative to begin your guided visualization.
              </p>
            )}
          </div>
        </div>

        <div className="glass-card p-6">
          <ProjectionVisual
            latestScores={latestScores}
            currentHarmony={currentHarmony}
            targetHarmony={targetHarmony}
            activeGoalsCount={activeGoals.length}
            recentCheckinsCount={recentCheckinsCount}
          />
        </div>
      </div>

      <p className="text-xs text-slate-500">
        This reflection tool supports calm focus and growth planning, and does not replace medical or mental health care.
      </p>
    </div>
  );
}
