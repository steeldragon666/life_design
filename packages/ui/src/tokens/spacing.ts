export const spacing = {
  1: '4px', 2: '8px', 3: '12px', 4: '16px',
  5: '20px', 6: '24px', 8: '32px', 10: '40px', 12: '48px',
} as const;

export const radius = {
  sm: '8px', md: '12px', lg: '16px', xl: '20px', full: '9999px',
} as const;

export const elevation = {
  0: 'none',
  1: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
  2: '0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
  3: '0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
} as const;

export const zIndex = {
  base: 0, nav: 40, nudge: 45, toast: 50, modalOverlay: 55, modal: 60,
} as const;

export const transition = {
  fast: '150ms ease',
  default: '300ms ease',
  slow: '500ms ease-out',
} as const;

export const breakpoints = {
  sm: '640px', md: '768px', lg: '1024px', xl: '1280px',
} as const;
