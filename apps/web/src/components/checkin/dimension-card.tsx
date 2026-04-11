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

      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            aria-label={String(n)}
            onClick={() => onScoreChange(dimension, n)}
            className="w-8 h-8 rounded text-sm font-medium transition-all"
            style={
              n === score
                ? { backgroundColor: palette.accent, color: 'var(--color-text-inverse)' }
                : { backgroundColor: 'var(--color-stone-100)', color: 'var(--color-stone-600)' }
            }
          >
            {n}
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
