import type { Dimension } from '@life-design/core';

export interface DimensionPalette {
  accent: string;
  text: string;
  bg: string;
  border: string;
}

export const dimensionPalettes: Record<Dimension, DimensionPalette> = {
  career:  { accent: '#5E9BC4', text: '#3A6A8A', bg: '#EFF4F8', border: 'rgba(94,155,196,0.15)' },
  finance: { accent: '#C4783A', text: '#8A5A30', bg: '#FDF5EE', border: 'rgba(196,120,58,0.15)' },
  health:  { accent: '#5A7F5A', text: '#476447', bg: '#F4F7F4', border: 'rgba(90,127,90,0.15)' },
  fitness: { accent: '#4A8A4A', text: '#3A6A3A', bg: '#F0F5F0', border: 'rgba(74,138,74,0.15)' },
  family:  { accent: '#D4864A', text: '#8A5A30', bg: '#FEF7F0', border: 'rgba(212,134,74,0.15)' },
  social:  { accent: '#8B7BA8', text: '#6B5B88', bg: '#F3F0F6', border: 'rgba(139,123,168,0.15)' },
  romance: { accent: '#C4607A', text: '#8A3A50', bg: '#FDF0F3', border: 'rgba(196,96,122,0.15)' },
  growth:  { accent: '#4A86B0', text: '#3A6A8A', bg: '#EDF3F8', border: 'rgba(74,134,176,0.15)' },
};

/** Get tinted shadow for a dimension card (elevation-2 with dimension color) */
export function dimensionShadow(dimension: Dimension): string {
  return `0 4px 12px ${dimensionPalettes[dimension].border}`;
}
