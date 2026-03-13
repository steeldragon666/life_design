'use client';

import React from 'react';
import { Dimension, DIMENSION_LABELS } from '@life-design/core';
import { dimensionColor, DIMENSION_TW_COLORS } from './tokens';

interface DimensionBadgeProps {
  dimension: Dimension | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'text-[10px] px-2 py-0.5 gap-1',
  md: 'text-xs px-3 py-1 gap-1.5',
  lg: 'text-sm px-4 py-1.5 gap-2',
};

const DIMENSION_ICONS: Record<string, string> = {
  career: '\uD83D\uDCBC',
  finance: '\uD83D\uDCB0',
  health: '\u2764\uFE0F',
  fitness: '\uD83C\uDFCB\uFE0F',
  family: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66',
  social: '\uD83E\uDD1D',
  romance: '\uD83D\uDC95',
  growth: '\uD83C\uDF31',
};

/**
 * Coloured pill badge for dimension labels.
 * Uses dimension-specific colour from design tokens.
 */
export default function DimensionBadge({
  dimension,
  size = 'md',
  className = '',
}: DimensionBadgeProps) {
  const key = typeof dimension === 'string' ? dimension : dimension.valueOf();
  const color = dimensionColor(dimension);
  const label = DIMENSION_LABELS[dimension as Dimension] ?? key;
  const icon = DIMENSION_ICONS[key] ?? '';

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full border ${SIZE_CLASSES[size]} ${className}`}
      style={{
        backgroundColor: `${color}15`,
        borderColor: `${color}40`,
        color: color,
      }}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {label}
    </span>
  );
}
