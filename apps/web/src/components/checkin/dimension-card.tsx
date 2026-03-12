'use client';

import { Dimension, DIMENSION_LABELS } from '@life-design/core';

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
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
      <h3 className="font-medium text-sm text-white">{DIMENSION_LABELS[dimension]}</h3>

      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            aria-label={String(n)}
            onClick={() => onScoreChange(dimension, n)}
            className={`w-8 h-8 rounded text-sm font-medium ${
              n === score
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-slate-900 hover:bg-gray-200'
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      {showNote && (
        <textarea
          placeholder="Add a note..."
          value={note ?? ''}
          onChange={(e) => onNoteChange?.(dimension, e.target.value)}
          className="w-full rounded border border-white/15 bg-white/95 text-slate-900 placeholder:text-slate-500 px-2 py-1 text-sm"
          rows={2}
        />
      )}
    </div>
  );
}
