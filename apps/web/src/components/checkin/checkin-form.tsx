'use client';

import { useState } from 'react';
import { ALL_DIMENSIONS, Dimension, DurationType } from '@life-design/core';
import { Button } from '@life-design/ui';
import MoodSlider from './mood-slider';
import MoodSegment from './mood-segment';
import DimensionCard from './dimension-card';

export interface CheckInFormData {
  mood: number;
  durationType: DurationType;
  scores: { dimension: Dimension; score: number; note?: string }[];
  journalEntry?: string;
}

interface CheckInFormProps {
  onSubmit: (data: CheckInFormData) => void;
  loading?: boolean;
  initialValues?: {
    mood?: number;
    scores?: Partial<Record<Dimension, number>>;
  };
}

const QUICK_DIMENSIONS = ALL_DIMENSIONS.slice(0, 3);

export default function CheckInForm({ onSubmit, loading, initialValues }: CheckInFormProps) {
  const [mood, setMood] = useState(initialValues?.mood ?? 5);
  const [durationType, setDurationType] = useState<DurationType>(DurationType.Quick);
  const [scores, setScores] = useState<Record<string, number>>(() => {
    if (!initialValues?.scores) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(initialValues.scores).filter(([, score]) => typeof score === 'number' && score >= 1 && score <= 10),
    );
  });
  const [notes, setNotes] = useState<Record<string, string>>({});

  const isDeep = durationType === DurationType.Deep;
  const dimensionsToRender = isDeep ? ALL_DIMENSIONS : QUICK_DIMENSIONS;
  const hasSmartDefaults = Boolean(initialValues?.mood || Object.keys(initialValues?.scores ?? {}).length > 0);

  function handleScoreChange(dimension: Dimension, score: number) {
    setScores((prev) => ({ ...prev, [dimension]: score }));
  }

  function handleNoteChange(dimension: Dimension, note: string) {
    setNotes((prev) => ({ ...prev, [dimension]: note }));
  }

  function handleSubmit() {
    const scoreEntries = dimensionsToRender
      .filter((dim) => scores[dim])
      .map((dim) => ({
        dimension: dim,
        score: scores[dim],
        ...(notes[dim] ? { note: notes[dim] } : {}),
      }));

    onSubmit({
      mood,
      durationType,
      scores: scoreEntries,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2" role="tablist" aria-label="Check-in mode">
        <button
          type="button"
          onClick={() => setDurationType(DurationType.Quick)}
          role="tab"
          aria-selected={!isDeep}
          className={`px-4 py-2 rounded text-sm font-medium ${
            !isDeep ? 'bg-sage-500 text-white' : 'bg-stone-100 text-stone-800'
          }`}
        >
          Quick mode
        </button>
        <button
          type="button"
          onClick={() => setDurationType(DurationType.Deep)}
          role="tab"
          aria-selected={isDeep}
          className={`px-4 py-2 rounded text-sm font-medium ${
            isDeep ? 'bg-sage-500 text-white' : 'bg-stone-100 text-stone-800'
          }`}
        >
          Deep mode
        </button>
      </div>

      {hasSmartDefaults && (
        <p className="text-xs text-stone-500">Pre-filled from your most recent check-in. Adjust anything in one tap.</p>
      )}

      {!isDeep ? <MoodSegment value={mood} onChange={setMood} /> : <MoodSlider value={mood} onChange={setMood} />}

      {!isDeep && (
        <p className="text-sm text-stone-500">Quick mode focuses on your top 3 dimensions. Switch to deep mode for full detail.</p>
      )}

      <div className={`grid grid-cols-1 gap-4 ${isDeep ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
        {dimensionsToRender.map((dim) => (
          <DimensionCard
            key={dim}
            dimension={dim}
            score={scores[dim] ?? 0}
            onScoreChange={handleScoreChange}
            showNote={isDeep}
            note={notes[dim] ?? ''}
            onNoteChange={handleNoteChange}
          />
        ))}
      </div>

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        loading={loading}
        className="w-full"
      >
        {loading ? 'Saving...' : 'Save Check-in'}
      </Button>
    </div>
  );
}
