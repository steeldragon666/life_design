import { Dimension } from '@life-design/core';

export const colors = {
  primary: '#6366f1',
  primaryLight: '#818cf8',
  primaryDark: '#4f46e5',
  background: '#ffffff',
  backgroundDark: '#0f172a',
  surface: '#f8fafc',
  surfaceDark: '#1e293b',
  text: '#0f172a',
  textMuted: '#64748b',
  textDark: '#f8fafc',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  border: '#e2e8f0',
} as const;

export const dimensionColors: Record<Dimension, string> = {
  [Dimension.Career]: '#6366f1',
  [Dimension.Finance]: '#22c55e',
  [Dimension.Health]: '#ef4444',
  [Dimension.Fitness]: '#f97316',
  [Dimension.Family]: '#ec4899',
  [Dimension.Social]: '#8b5cf6',
  [Dimension.Romance]: '#f43f5e',
  [Dimension.Growth]: '#14b8a6',
};

export const dimensionIcons: Record<Dimension, string> = {
  [Dimension.Career]: '💼',
  [Dimension.Finance]: '💰',
  [Dimension.Health]: '❤️',
  [Dimension.Fitness]: '🏋️',
  [Dimension.Family]: '👨‍👩‍👧‍👦',
  [Dimension.Social]: '🤝',
  [Dimension.Romance]: '💕',
  [Dimension.Growth]: '🌱',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
} as const;
