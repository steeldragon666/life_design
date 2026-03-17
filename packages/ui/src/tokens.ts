/**
 * @deprecated Use imports from '@life-design/ui/tokens' instead.
 * This file is a compatibility shim preserved during migration.
 */

// Re-export new token system
export * from './tokens/index';

// Legacy compatibility — old code may import these
import { dimensionPalettes } from './tokens/dimensions';
import type { Dimension } from '@life-design/core';

/** @deprecated Use `dimensionPalettes[dim].accent` instead */
export const dimensionColors: Record<Dimension, string> = {
  career: dimensionPalettes.career.accent,
  finance: dimensionPalettes.finance.accent,
  health: dimensionPalettes.health.accent,
  fitness: dimensionPalettes.fitness.accent,
  family: dimensionPalettes.family.accent,
  social: dimensionPalettes.social.accent,
  romance: dimensionPalettes.romance.accent,
  growth: dimensionPalettes.growth.accent,
};

/** @deprecated Use `dimensionPalettes` for full palette access */
export const dimensionIcons: Record<Dimension, string> = {
  career: '💼', finance: '💰', health: '❤️', fitness: '💪',
  family: '👨‍👩‍👧‍👦', social: '👥', romance: '💕', growth: '🌱',
};
