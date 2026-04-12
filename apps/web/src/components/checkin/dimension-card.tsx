'use client';

import { Dimension, DIMENSION_LABELS } from '@life-design/core';
import { Card, Textarea, dimensionPalettes } from '@life-design/ui';

interface DimensionCardProps {
  dimension: Dimension;
  score: number;
  onScoreChange: (dimension: Dimension, score: number) => void;
  showNote?: boolean;
  note?: string;
  onNoteChange?: (dimension: Dimension, note: string) => void;
}

export default function DimensionCard({
  dimension,
  score,
  onScoreChange,
  showNote,
  note,
  onNoteChange,
}: DimensionCardProps) {
  const palette = dimensionPalettes[dimension];

  return (
    <Card className="space-y-3">
      <h3 className="font-medium text-sm text-stone-800">{DIMENSION_LABELS[dimension]}</h3>

      <div className="flex gap-2 flex-wrap">
        {[
          { value: 1, emoji: '\u{1F61E}', label: 'Low' },
          { value: 2, emoji: '\u{1F642}', label: 'Okay' },
          { value: 3, emoji: '\u{1F60C}', label: 'Steady' },
          { value: 4, emoji: '\u{1F60A}', label: 'Good' },
          { value: 5, emoji: '\u{1F601}', label: 'Great' },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            aria-label={option.label}
            onClick={() => onScoreChange(dimension, option.value)}
            className="flex-1 flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all"
            style={
              option.value === score
                ? { borderColor: palette.accent, backgroundColor: 'var(--color-sage-50)', color: 'var(--color-stone-800)' }
                : { borderColor: 'var(--color-stone-200)', backgroundColor: 'white', color: 'var(--color-stone-500)' }
            }
          >
            <span className="text-lg">{option.emoji}</span>
            <span className="text-[10px]">{option.label}</span>
          </button>
        ))}
      </div>

      {showNote && (
        <Textarea
          placeholder="Add a note..."
          value={note ?? ''}
          onChange={(e) => onNoteChange?.(dimension, e.target.value)}
          rows={2}
        />
      )}
    </Card>
  );
}
