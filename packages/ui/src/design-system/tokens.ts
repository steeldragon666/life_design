import { Dimension } from '@life-design/core';

/**
 * @deprecated This entire file is superseded by the new token system.
 * Import from '@life-design/ui' instead.
 * Will be removed after migration is complete.
 */

/**
 * Life Design OS — Complete Design System Tokens
 * Typography: Cabinet Grotesk (headings) + Erode (body) + JetBrains Mono (data)
 * Palette: Indigo/Violet primary with dimension-specific accents
 * Style: Glassmorphism + dark premium aesthetic
 */

export type GlassIntensity = 'light' | 'medium' | 'heavy' | 'card';
export type SizeVariant = 'sm' | 'md' | 'lg';

/** @deprecated Use the new token system from '@life-design/ui' instead */
export const designTokens = {
  colors: {
    primary: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
      950: '#1e1b4b',
    },
    accent: {
      50: '#f5f3ff',
      100: '#ede9fe',
      200: '#ddd6fe',
      300: '#c4b5fd',
      400: '#a78bfa',
      500: '#8b5cf6',
      600: '#7c3aed',
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#4c1d95',
    },
    dimension: {
      career: '#f59e0b',
      finance: '#10b981',
      health: '#ef4444',
      fitness: '#f97316',
      family: '#ec4899',
      social: '#06b6d4',
      romance: '#e11d48',
      growth: '#8b5cf6',
    } as Record<string, string>,
    semantic: {
      positive: '#10b981',
      negative: '#ef4444',
      neutral: '#6b7280',
      warning: '#f59e0b',
    },
  },
  fonts: {
    heading: '"Cabinet Grotesk", system-ui, sans-serif',
    body: '"Erode", Georgia, serif',
    mono: '"JetBrains Mono", monospace',
  },
  fontWeights: {
    heading: { hero: 800, h1: 700, h2: 700, h3: 500 },
    body: { light: 300, regular: 400, medium: 500 },
    mono: { regular: 400 },
  },
  glassmorphism: {
    light: 'bg-white/10 backdrop-blur-md border border-white/20',
    medium: 'bg-white/20 backdrop-blur-lg border border-white/30',
    heavy: 'bg-white/30 backdrop-blur-xl border border-white/40',
    card: 'bg-white/15 backdrop-blur-lg border border-white/25 rounded-2xl shadow-xl',
  } as Record<GlassIntensity, string>,
  gradients: {
    primary: 'bg-gradient-to-br from-indigo-600 to-violet-600',
    subtle: 'bg-gradient-to-br from-indigo-50 to-violet-50',
    dark: 'bg-gradient-to-br from-indigo-950 to-violet-950',
  },
  spacing: {
    card: 'p-6',
    section: 'py-12',
    page: 'px-4 md:px-8 lg:px-12',
  },
  animation: {
    fadeIn: 'animate-in fade-in duration-300',
    slideUp: 'animate-in slide-in-from-bottom-4 duration-500',
    scaleIn: 'animate-in zoom-in-95 duration-200',
  },
} as const;

/** Get the hex colour for a given dimension */
export function dimensionColor(dimension: Dimension | string): string {
  const key = String(dimension);
  return designTokens.colors.dimension[key] ?? '#6b7280';
}

/** Get a Tailwind-compatible gradient class for a dimension */
export function dimensionGradient(dimension: Dimension | string): string {
  const color = dimensionColor(dimension);
  // Return inline style approach since dynamic Tailwind classes don't work
  return color;
}

/** Map dimension enum values to Tailwind colour class prefixes */
export const DIMENSION_TW_COLORS: Record<string, string> = {
  career: 'amber',
  finance: 'emerald',
  health: 'red',
  fitness: 'orange',
  family: 'pink',
  social: 'cyan',
  romance: 'rose',
  growth: 'violet',
};

/** Fontshare CDN URLs */
export const FONT_URLS = {
  cabinetGrotesk: 'https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,700,500&display=swap',
  erode: 'https://api.fontshare.com/v2/css?f[]=erode@300,400,500&display=swap',
};
