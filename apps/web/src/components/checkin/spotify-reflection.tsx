'use client';

import { useMemo, useState } from 'react';
import { db } from '@/lib/db';
import { Card, Textarea } from '@life-design/ui';
import { classifyMoodFromAudioFeatures } from '@life-design/core';

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

const SAGE = 'var(--color-sage-500)';
const MUTED = '#7D756A';
const BORDER = 'var(--color-stone-200)';
const BG = 'var(--color-stone-100)';
const DARK = 'var(--color-stone-900)';

// ---------------------------------------------------------------------------
// Mood options
// ---------------------------------------------------------------------------

interface MoodOption {
  value: string;
  emoji: string;
  label: string;
}

const MOOD_OPTIONS: MoodOption[] = [
  { value: 'energised', emoji: '\u26A1', label: 'Energised' },
  { value: 'calm', emoji: '\u{1F33F}', label: 'Calm' },
  { value: 'melancholic', emoji: '\u{1F327}\uFE0F', label: 'Melancholic' },
  { value: 'nostalgic', emoji: '\u{1F4AD}', label: 'Nostalgic' },
  { value: 'neutral', emoji: '\u{1F50D}', label: 'Neutral' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SpotifyReflectionProps {
  date: string;
  spotifyData: {
    artistName: string;
    trackNames: string[];
    listeningMinutes: number;
    audioValence: number;
    audioEnergy: number;
  };
  onComplete: (response: { mood: string; freeText?: string }) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SpotifyReflection({
  date,
  spotifyData,
  onComplete,
}: SpotifyReflectionProps) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [freeText, setFreeText] = useState('');
  const [saving, setSaving] = useState(false);

  const { artistName, trackNames, listeningMinutes, audioValence, audioEnergy } = spotifyData;

  const inferredMood = useMemo(() => {
    if (audioValence == null || audioEnergy == null) return null;
    return classifyMoodFromAudioFeatures({
      valence: audioValence,
      energy: audioEnergy,
      danceability: 0,
      tempo: 0,
      acousticness: 0,
      instrumentalness: 0,
    });
  }, [audioValence, audioEnergy]);

  async function handleComplete() {
    if (!selectedMood || saving) return;
    setSaving(true);

    try {
      // Save to Dexie spotifyReflections table
      await db.spotifyReflections.add({
        date,
        artistName,
        trackNames,
        listeningMinutes,
        audioValence,
        audioEnergy,
        userMoodResponse: selectedMood as 'energised' | 'calm' | 'melancholic' | 'nostalgic' | 'neutral',
        userFreeText: freeText || undefined,
        createdAt: Date.now(),
      });

      onComplete({
        mood: selectedMood,
        freeText: freeText || undefined,
      });
    } catch {
      // Silently continue even if save fails — the onComplete callback
      // will still fire so the wizard progresses
      onComplete({
        mood: selectedMood,
        freeText: freeText || undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        {/* Listening summary */}
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{ backgroundColor: BG, border: `1px solid ${BORDER}` }}
            >
              {'\u{1F3B5}'}
            </div>
            <div>
              <h2 className="font-serif text-lg" style={{ color: DARK }}>
                Your Music Today
              </h2>
              <p className="text-xs" style={{ color: MUTED }}>
                Reflect on what you listened to
              </p>
            </div>
          </div>

          <div
            className="rounded-xl p-3"
            style={{ backgroundColor: BG, border: `1px solid ${BORDER}` }}
          >
            <p className="text-sm" style={{ color: DARK }}>
              You listened to <strong>{artistName}</strong> for{' '}
              <strong>{Math.round(listeningMinutes)}</strong> minutes
            </p>
            {trackNames.length > 0 && (
              <p className="text-xs mt-1" style={{ color: MUTED }}>
                {trackNames.slice(0, 3).join(', ')}
                {trackNames.length > 3 && ` + ${trackNames.length - 3} more`}
              </p>
            )}
          </div>
        </div>

        {/* Inferred mood from audio features */}
        {inferredMood && (
          <div
            className="rounded-xl p-3 mb-5"
            style={{ backgroundColor: BG, border: `1px solid ${BORDER}` }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: MUTED }}>
              AI-detected mood
            </p>
            <p className="text-sm font-medium capitalize" style={{ color: DARK }}>
              {inferredMood.primaryMood}
            </p>
            {inferredMood.confidence >= 0.3 && (
              <p className="text-xs mt-1" style={{ color: MUTED }}>
                {Math.round(inferredMood.confidence * 100)}% confidence
              </p>
            )}
          </div>
        )}

        {/* Reflective question */}
        <div className="mb-4">
          <p className="text-sm font-medium mb-3" style={{ color: DARK }}>
            How does this music make you feel?
          </p>

          <div className="flex flex-wrap gap-2">
            {MOOD_OPTIONS.map((option) => {
              const isSelected = selectedMood === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedMood(option.value)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all"
                  style={{
                    backgroundColor: isSelected ? `${SAGE}15` : 'white',
                    border: `1.5px solid ${isSelected ? SAGE : BORDER}`,
                    color: isSelected ? SAGE : MUTED,
                    fontWeight: isSelected ? 500 : 400,
                  }}
                >
                  <span>{option.emoji}</span>
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional free text */}
        <div>
          <p className="text-xs mb-2" style={{ color: MUTED }}>
            Anything else? (optional)
          </p>
          <Textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="The music reminded me of..."
            rows={2}
          />
        </div>
      </Card>

      {/* Complete button */}
      <button
        type="button"
        onClick={handleComplete}
        disabled={!selectedMood || saving}
        className="w-full py-3 rounded-2xl text-sm font-medium transition-all"
        style={{
          backgroundColor: selectedMood ? SAGE : BG,
          color: selectedMood ? 'white' : MUTED,
          border: `1px solid ${selectedMood ? SAGE : BORDER}`,
          cursor: selectedMood ? 'pointer' : 'default',
          opacity: !selectedMood || saving ? 0.6 : 1,
        }}
      >
        {saving ? 'Saving...' : 'Continue'}
      </button>
    </div>
  );
}
