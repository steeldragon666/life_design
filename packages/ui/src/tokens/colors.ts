/** Primitive color tokens — mirrors CSS custom properties in globals.css */
export const colors = {
  stone: {
    50: '#FAFAF8', 100: '#F5F3EF', 200: '#E8E4DD', 300: '#D4CFC5',
    400: '#A8A198', 500: '#6B6459', 600: '#5C554C', 700: '#3D3833',
    800: '#2A2623', 900: '#1A1816',
  },
  sage: {
    50: '#F4F7F4', 100: '#E4ECE4', 200: '#C4D5C4', 300: '#9BB89B',
    400: '#739A73', 500: '#5A7F5A', 600: '#476447',
  },
  warm: {
    50: '#FEF7F0', 100: '#FCE8D5', 200: '#F5C9A3', 300: '#E8A46D',
    400: '#D4864A', 500: '#9A5B2D', 600: '#A05E30',
  },
  accent: {
    400: '#85B8D8', 500: '#5E9BC4', 600: '#3A7199',
  },
} as const;

/** Semantic tokens — purpose-mapped colors */
export const semantic = {
  text: {
    primary: colors.stone[800],
    secondary: colors.stone[600],
    muted: colors.stone[500],
    inverse: '#FFFFFF',
  },
  surface: {
    default: '#FFFFFF',
    page: colors.stone[50],
    sunken: colors.stone[100],
    raised: '#FFFFFF',
  },
  border: {
    default: colors.stone[200],
    subtle: 'rgba(232, 228, 221, 0.6)',
  },
  interactive: {
    primary: colors.sage[500],
    hover: colors.sage[600],
  },
  destructive: '#CC3333',
} as const;
