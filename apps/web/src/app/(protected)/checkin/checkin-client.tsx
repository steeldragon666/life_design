'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGuest } from '@/lib/guest-context';
import { DurationType } from '@life-design/core';
import CheckInForm from '@/components/checkin/checkin-form';
import type { CheckInFormData } from '@/components/checkin/checkin-form';
import { buildMentorSystemPrompt } from '@/lib/mentor-orchestrator';

interface CheckInClientProps {
  date: string;
}

export default function CheckInClient({ date }: CheckInClientProps) {
  const router = useRouter();
  const { addCheckin, mentorProfile } = useGuest();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [groundingStarted, setGroundingStarted] = useState(false);

  async function startGrounding() {
    const prompt = buildMentorSystemPrompt(mentorProfile, 'checkin');
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `${prompt}\nCreate a 3-line grounding check-in opener with one breath cue and one reflective question.`,
      }),
    });
    const data = await response.json();
    const opener = data.text || 'Take one deep breath in, and exhale slowly. What feels most present in your body right now?';
    const utterance = new SpeechSynthesisUtterance(opener);
    utterance.rate = 0.88;
    utterance.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setGroundingStarted(true);
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
        <button onClick={startGrounding} className="btn-secondary" type="button">
          {groundingStarted ? 'Replay grounding intro' : 'Start 30-second grounding'}
        </button>
      </div>
      <CheckInForm onSubmit={handleSubmit} loading={loading} />
    </>
  );
}
