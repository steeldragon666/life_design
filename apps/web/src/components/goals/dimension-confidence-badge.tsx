'use client';

import { DIMENSION_LABELS, type Dimension } from '@life-design/core';

interface DimensionConfidenceBadgeProps {
  dimension: string;
  confidence: number;
  method: 'semantic' | 'keyword';
}

function confidenceLevel(confidence: number): { label: string; color: string } {
  if (confidence >= 0.75) return { label: 'High', color: 'bg-emerald-500/20 text-emerald-400' };
  if (confidence >= 0.45) return { label: 'Medium', color: 'bg-amber-500/20 text-amber-400' };
  return { label: 'Low', color: 'bg-red-500/20 text-red-400' };
}

/**
 * Shows the inferred dimension for a goal with confidence level.
 * Displays whether classification used semantic AI or keyword fallback.
 */
export default function DimensionConfidenceBadge({
  dimension,
  confidence,
  method,
}: DimensionConfidenceBadgeProps) {
  const label = DIMENSION_LABELS[dimension as Dimension] ?? dimension;
  const level = confidenceLevel(confidence);

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${level.color}`}>
        {label}
        <span className="opacity-60">({level.label})</span>
      </span>
      <span className="text-[10px] uppercase tracking-wider text-white/30">
        {method === 'semantic' ? 'AI' : 'keyword'}
      </span>
    </div>
  );
}
