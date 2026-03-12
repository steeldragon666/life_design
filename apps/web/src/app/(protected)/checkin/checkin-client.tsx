'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGuest } from '@/lib/guest-context';
import { ALL_DIMENSIONS, Dimension, DurationType } from '@life-design/core';
import CheckInForm from '@/components/checkin/checkin-form';
import type { CheckInFormData } from '@/components/checkin/checkin-form';
import { buildMentorSystemPrompt } from '@/lib/mentor-orchestrator';
import { inferMoodAdaptation } from '@/lib/mood-adapter';

interface CheckInClientProps {
  date: string;
}

export default function CheckInClient({ date }: CheckInClientProps) {
  const router = useRouter();
  const { addCheckin, mentorProfile, checkins, conversationMemory, appendConversationSummary } = useGuest();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [groundingStarted, setGroundingStarted] = useState(false);
  const [groundingLoading, setGroundingLoading] = useState(false);
  const latestCheckin = checkins.length > 0 ? checkins[checkins.length - 1] : null;
  const latestScores = latestCheckin?.dimension_scores.reduce<Partial<Record<Dimension, number>>>((acc, item) => {
    if (ALL_DIMENSIONS.includes(item.dimension as Dimension) && item.score >= 1 && item.score <= 10) {
      acc[item.dimension as Dimension] = item.score;
    }
    return acc;
  }, {});

  async function startGrounding() {
    const fallbackOpener =
      'Take one deep breath in, and exhale slowly. What feels most present in your body right now?';

    if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      setError('Voice grounding is unavailable in this browser. You can still complete your written check-in.');
      return;
    }

    setGroundingLoading(true);
    setError(null);

    try {
      const mood = inferMoodAdaptation(checkins);
      const prompt = buildMentorSystemPrompt(mentorProfile, 'checkin', {
        mood,
        memory: conversationMemory,
      });
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `${prompt}\nCreate a 3-line grounding check-in opener with one breath cue and one reflective question.`,
        }),
      });

      let opener = fallbackOpener;
      if (response.ok) {
        const data = await response.json();
        opener = data.text || fallbackOpener;
      }

      const utterance = new SpeechSynthesisUtterance(opener);
      utterance.rate = 0.88;
      utterance.pitch = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      appendConversationSummary('Started guided grounding before check-in.', 'checkin');
      setGroundingStarted(true);
    } catch {
      const utterance = new SpeechSynthesisUtterance(fallbackOpener);
      utterance.rate = 0.88;
      utterance.pitch = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      setGroundingStarted(true);
    } finally {
      setGroundingLoading(false);
    }
  }

  async function handleSubmit(data: CheckInFormData) {
    setLoading(true);
    setError(null);

    try {
      // Validate scores
      if (data.mood < 1 || data.mood > 10) {
        setError('Mood must be between 1 and 10');
        setLoading(false);
        return;
      }

      const invalidScores = data.scores.some((s) => s.score < 1 || s.score > 10);
      if (invalidScores) {
        setError('All dimension scores must be between 1 and 10');
        setLoading(false);
        return;
      }

      // Save to guest context
      addCheckin({
        id: `checkin-${Date.now()}`,
        date,
        mood: data.mood,
        duration_type: data.durationType ?? DurationType.Quick,
        journal_entry: data.journalEntry,
        dimension_scores: data.scores.map(s => ({
          dimension: s.dimension,
          score: s.score,
        })),
      });
      appendConversationSummary(`Submitted check-in with mood ${data.mood}/10.`, 'checkin');

      // Navigate to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError('Failed to save check-in. Please try again.');
      setLoading(false);
    }
  }

  return (
    <>
      {error && (
        <div className="glass-card p-4 mb-4 border-l-4 border-red-500">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      <div className="glass-card p-4 mb-4">
        <p className="text-sm text-slate-300 mb-3">
          {mentorProfile.characterName} can lead a brief grounding moment before your check-in.
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={startGrounding} className="btn-secondary" type="button" disabled={groundingLoading}>
            {groundingLoading
              ? 'Preparing grounding...'
              : groundingStarted
                ? 'Replay grounding intro'
                : 'Start 30-second grounding'}
          </button>
          <a
            href="#checkin-form"
            className="text-sm text-slate-300 underline underline-offset-2 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400 rounded-sm"
          >
            Skip grounding and continue
          </a>
        </div>
      </div>
      <div id="checkin-form">
        <CheckInForm
          onSubmit={handleSubmit}
          loading={loading}
          initialValues={{
            mood: latestCheckin?.mood,
            scores: latestScores,
          }}
        />
      </div>
    </>
  );
}
