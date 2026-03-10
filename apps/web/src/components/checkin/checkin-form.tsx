'use client';

import { useState } from 'react';
import { ALL_DIMENSIONS, Dimension, DurationType } from '@life-design/core';
import MoodSlider from './mood-slider';
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
}

export default function CheckInForm({ onSubmit, loading }: CheckInFormProps) {
  const [mood, setMood] = useState(5);
  const [durationType, setDurationType] = useState<DurationType>(DurationType.Quick);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const isDeep = durationType === DurationType.Deep;

  function handleScoreChange(dimension: Dimension, score: number) {
    setScores((prev) => ({ ...prev, [dimension]: score }));
  }

  function handleNoteChange(dimension: Dimension, note: string) {
    setNotes((prev) => ({ ...prev, [dimension]: note }));
  }

  function handleSubmit() {
    const scoreEntries = ALL_DIMENSIONS
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
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setDurationType(DurationType.Quick)}
          className={`px-4 py-2 rounded text-sm font-medium ${
            !isDeep ? 'bg-indigo-600 text-white' : 'bg-gray-100'
          }`}
        >
          Quick
        </button>
        <button
          type="button"
          onClick={() => setDurationType(DurationType.Deep)}
          className={`px-4 py-2 rounded text-sm font-medium ${
            isDeep ? 'bg-indigo-600 text-white' : 'bg-gray-100'
          }`}
        >
          Deep
        </button>
      </div>

      <MoodSlider value={mood} onChange={setMood} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ALL_DIMENSIONS.map((dim) => (
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

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save Check-in'}
      </button>
    </div>
  );
}
