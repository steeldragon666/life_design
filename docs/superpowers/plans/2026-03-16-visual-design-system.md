# Visual Design System Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Life Design's visual layer as a proper design system in `@life-design/ui` with WCAG AA compliance, consistent tokens, shared component library, data viz, schedule features, and redesigned navigation/onboarding.

**Architecture:** Three-layer token hierarchy (primitive → semantic → component) defined as CSS custom properties in globals.css, consumed by Tailwind v4's `@theme` directive. React components in `packages/ui/src/components/` with Storybook docs. Web app imports from `@life-design/ui`. Phosphor Icons replace inline SVGs.

**Tech Stack:** Tailwind CSS v4, React 19, Next.js 15, Phosphor Icons, Recharts + custom SVG, Storybook 8, Vitest + Testing Library, Dexie (IndexedDB)

**Spec:** `docs/superpowers/specs/2026-03-16-visual-design-system-design.md`

---

## File Structure

### New Files

| Path | Responsibility |
|------|---------------|
| `packages/ui/vitest.config.ts` | Test config for UI package (jsdom) |
| `packages/ui/vitest.setup.ts` | jest-dom matchers setup |
| `packages/ui/src/utils/cn.ts` | Tailwind class merge utility (clsx + twMerge) |
| `packages/ui/src/tokens/colors.ts` | Color primitives + semantic tokens |
| `packages/ui/src/tokens/typography.ts` | Type scale constants |
| `packages/ui/src/tokens/spacing.ts` | Spacing, radius, elevation, z-index, transitions |
| `packages/ui/src/tokens/dimensions.ts` | Per-dimension color palettes |
| `packages/ui/src/tokens/index.ts` | Barrel re-export of all tokens |
| `packages/ui/src/components/Button.tsx` | Button (primary/secondary/ghost/destructive) |
| `packages/ui/src/components/Button.test.tsx` | Button tests |
| `packages/ui/src/components/Card.tsx` | Card (default/raised/sunken/dimension) |
| `packages/ui/src/components/Card.test.tsx` | Card tests |
| `packages/ui/src/components/Input.tsx` | Input, Textarea, Select |
| `packages/ui/src/components/Input.test.tsx` | Input tests |
| `packages/ui/src/components/Badge.tsx` | Badge variants |
| `packages/ui/src/components/Badge.test.tsx` | Badge tests |
| `packages/ui/src/components/Skeleton.tsx` | Loading skeletons |
| `packages/ui/src/components/Skeleton.test.tsx` | Skeleton tests |
| `packages/ui/src/components/Tooltip.tsx` | Tooltip + Popover |
| `packages/ui/src/components/Modal.tsx` | Modal dialog |
| `packages/ui/src/components/Modal.test.tsx` | Modal tests |
| `packages/ui/src/components/Toast.tsx` | Toast notification |
| `packages/ui/src/components/Toast.test.tsx` | Toast tests |
| `packages/ui/src/components/data-viz/RadarChart.tsx` | Wheel of Life radar (custom SVG) |
| `packages/ui/src/components/data-viz/RadarChart.test.tsx` | RadarChart tests |
| `packages/ui/src/components/data-viz/Sparkline.tsx` | Inline trend sparkline |
| `packages/ui/src/components/data-viz/ProgressRing.tsx` | Life Score ring |
| `packages/ui/src/components/data-viz/ProgressRing.test.tsx` | ProgressRing tests |
| `packages/ui/src/components/data-viz/TrendBar.tsx` | Dimension score bar |
| `packages/ui/src/components/data-viz/Heatmap.tsx` | Correlation grid |
| `packages/ui/src/components/data-viz/BarStack.tsx` | Time allocation stacked bar |
| `packages/ui/src/components/data-viz/index.ts` | Data viz barrel export |
| `packages/ui/src/components/index.ts` | Component barrel export |
| `apps/web/src/components/schedule/ScheduleWidget.tsx` | Dashboard schedule compact widget |
| `apps/web/src/components/schedule/DayView.tsx` | Full day timeline view |
| `apps/web/src/components/schedule/WeekView.tsx` | Week grid view |
| `apps/web/src/components/toast/ToastProvider.tsx` | Global toast context + queue |
| `apps/web/src/app/(protected)/schedule/page.tsx` | Schedule route page |
| `packages/ui/.storybook/main.ts` | Storybook config |
| `packages/ui/.storybook/preview.ts` | Storybook decorators/theme |
| `packages/ui/src/stories/Button.stories.tsx` | Button component stories |
| `packages/ui/src/stories/Card.stories.tsx` | Card component stories |
| `packages/ui/src/stories/Badge.stories.tsx` | Badge component stories |
| `packages/ui/src/stories/Input.stories.tsx` | Input/Textarea/Select stories |
| `packages/ui/src/stories/Toast.stories.tsx` | Toast component stories |
| `packages/ui/src/stories/Modal.stories.tsx` | Modal component stories |
| `packages/ui/src/stories/RadarChart.stories.tsx` | RadarChart data-viz stories |
| `packages/ui/src/stories/ProgressRing.stories.tsx` | ProgressRing data-viz stories |

### Modified Files

| Path | Change |
|------|--------|
| `apps/web/src/app/globals.css` | Rewrite `@theme` block with full token system |
| `apps/web/src/app/layout.tsx` | Switch from `<link>` to `next/font` |
| `packages/ui/src/tokens.ts` | Replace with new token re-exports + deprecated shim |
| `packages/ui/src/design-system/tokens.ts` | Add `@deprecated` annotations |
| `packages/ui/src/index.ts` | Update exports for new components |
| `packages/ui/package.json` | Add vitest, testing-library, @phosphor-icons/react |
| `apps/web/package.json` | Add @phosphor-icons/react |
| `apps/web/src/lib/db/schema.ts` | Add `scheduleBlocks` table + DBScheduleBlock |
| `apps/web/src/app/(protected)/protected-layout-client.tsx` | Replace inline SVGs with Phosphor, apply tokens |
| `apps/web/src/components/nudge/NudgeCard.tsx` | Redesign with new tokens |
| `apps/web/src/components/app-providers.tsx` | Add ToastProvider wrapper |
| `apps/web/src/app/(protected)/dashboard/page.tsx` | Migrate to design system components |
| `apps/web/src/components/onboarding/*.tsx` | Redesign onboarding flow |

---

## Chunk 1: Foundation — Tokens, Fonts, Test Setup

### Task 1: Set up Vitest in packages/ui

**Files:**
- Create: `packages/ui/vitest.config.ts`
- Create: `packages/ui/vitest.setup.ts`
- Modify: `packages/ui/package.json`

- [ ] **Step 1: Install test dependencies**

```bash
cd /c/Users/Aaron/life-design && pnpm --filter @life-design/ui add -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom @types/react-dom
```

- [ ] **Step 2: Create vitest.config.ts**

Create `packages/ui/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
});
```

- [ ] **Step 3: Create vitest.setup.ts**

Create `packages/ui/vitest.setup.ts`:
```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Add test script to package.json**

In `packages/ui/package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Verify test setup works**

Run: `pnpm --filter @life-design/ui test`
Expected: "No test files found" (no tests yet, but no config errors)

- [ ] **Step 6: Commit**

```bash
git add packages/ui/vitest.config.ts packages/ui/vitest.setup.ts packages/ui/package.json pnpm-lock.yaml
git commit -m "chore(ui): add vitest test infrastructure"
```

---

### Task 2: Rewrite globals.css token system

**Files:**
- Modify: `apps/web/src/app/globals.css`

**Context:** The current `@theme` block defines stone/sage/warm palettes but is missing: semantic tokens, dimension colors matching the actual `Dimension` enum (Career, Finance, Health, Fitness, Family, Social, Romance, Growth), elevation shadows, spacing scale, radius scale, z-index, and transition tokens. The spec's stone-500 was updated to `#6B6459` for AA compliance, and accent-600 to `#3A7199`.

- [ ] **Step 1: Rewrite the @theme block**

Replace the entire `@theme { ... }` block in `apps/web/src/app/globals.css` with:

```css
@theme {
  /* ── Fonts ── */
  --font-sans: 'DM Sans', system-ui, sans-serif;
  --font-serif: 'Instrument Serif', Georgia, serif;
  --font-mono: 'DM Mono', monospace;

  /* ── Stone (Neutrals) ── */
  --color-stone-50: #FAFAF8;
  --color-stone-100: #F5F3EF;
  --color-stone-200: #E8E4DD;
  --color-stone-300: #D4CFC5;
  --color-stone-400: #A8A198;
  --color-stone-500: #6B6459;
  --color-stone-600: #5C554C;
  --color-stone-700: #3D3833;
  --color-stone-800: #2A2623;
  --color-stone-900: #1A1816;

  /* ── Sage (Primary) ── */
  --color-sage-50: #F4F7F4;
  --color-sage-100: #E4ECE4;
  --color-sage-200: #C4D5C4;
  --color-sage-300: #9BB89B;
  --color-sage-400: #739A73;
  --color-sage-500: #5A7F5A;
  --color-sage-600: #476447;

  /* ── Warm (Secondary) ── */
  --color-warm-50: #FEF7F0;
  --color-warm-100: #FCE8D5;
  --color-warm-200: #F5C9A3;
  --color-warm-300: #E8A46D;
  --color-warm-400: #D4864A;
  --color-warm-500: #9A5B2D;
  --color-warm-600: #A05E30;

  /* ── Accent (Soft Blue) ── */
  --color-accent-400: #85B8D8;
  --color-accent-500: #5E9BC4;
  --color-accent-600: #3A7199;

  /* ── Semantic: Surfaces ── */
  --color-surface-default: #FFFFFF;
  --color-surface-page: #FAFAF8;
  --color-surface-sunken: #F5F3EF;
  --color-surface-raised: #FFFFFF;

  /* ── Semantic: Text ── */
  --color-text-primary: #2A2623;
  --color-text-secondary: #5C554C;
  --color-text-muted: #6B6459;
  --color-text-inverse: #FFFFFF;

  /* ── Semantic: Borders ── */
  --color-border-default: #E8E4DD;
  --color-border-subtle: rgba(232, 228, 221, 0.6);

  /* ── Semantic: Interactive ── */
  --color-interactive-primary: #5A7F5A;
  --color-interactive-hover: #476447;
  --color-destructive: #CC3333;

  /* ── Dimension Accent Colors ── */
  --color-dim-career: #5E9BC4;
  --color-dim-finance: #C4783A;
  --color-dim-health: #5A7F5A;
  --color-dim-fitness: #4A8A4A;
  --color-dim-family: #D4864A;
  --color-dim-social: #8B7BA8;
  --color-dim-romance: #C4607A;
  --color-dim-growth: #4A86B0;

  /* ── Dimension Text Colors (AA-safe) ── */
  --color-dim-career-text: #3A6A8A;
  --color-dim-finance-text: #8A5A30;
  --color-dim-health-text: #476447;
  --color-dim-fitness-text: #3A6A3A;
  --color-dim-family-text: #8A5A30;
  --color-dim-social-text: #6B5B88;
  --color-dim-romance-text: #8A3A50;
  --color-dim-growth-text: #3A6A8A;

  /* ── Dimension Backgrounds ── */
  --color-dim-career-bg: #EFF4F8;
  --color-dim-finance-bg: #FDF5EE;
  --color-dim-health-bg: #F4F7F4;
  --color-dim-fitness-bg: #F0F5F0;
  --color-dim-family-bg: #FEF7F0;
  --color-dim-social-bg: #F3F0F6;
  --color-dim-romance-bg: #FDF0F3;
  --color-dim-growth-bg: #EDF3F8;

  /* ── Spacing (4px base) ── */
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-5: 20px;
  --spacing-6: 24px;
  --spacing-8: 32px;
  --spacing-10: 40px;
  --spacing-12: 48px;

  /* ── Border Radius ── */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-full: 9999px;

  /* ── Elevation (Shadows) ── */
  --shadow-elevation-0: none;
  --shadow-elevation-1: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02);
  --shadow-elevation-2: 0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
  --shadow-elevation-3: 0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04);

  /* ── Z-Index ── */
  --z-base: 0;
  --z-nav: 40;
  --z-nudge: 45;
  --z-toast: 50;
  --z-modal-overlay: 55;
  --z-modal: 60;

  /* ── Transitions ── */
  --transition-fast: 150ms ease;
  --transition-default: 300ms ease;
  --transition-slow: 500ms ease-out;
}
```

- [ ] **Step 2: Update the @layer base block**

Replace the existing `:root` HSL variables with simpler semantic mappings:

```css
@layer base {
  :root {
    --background: var(--color-surface-page);
    --foreground: var(--color-text-primary);
    --radius: var(--radius-sm);
  }

  * {
    border-color: var(--color-border-default);
  }

  body {
    font-family: var(--font-sans);
    background-color: var(--color-surface-page);
    color: var(--color-text-primary);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  h1, h2, h3, h4 {
    font-family: var(--font-serif);
  }
}
```

- [ ] **Step 3: Add pulse-skeleton animation**

Add after the existing `badgeReveal` keyframes:

```css
@keyframes pulseSkeleton {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
.animate-pulse-skeleton { animation: pulseSkeleton 1.5s ease-in-out infinite; }
```

- [ ] **Step 4: Verify build**

Run: `pnpm --filter @life-design/web build`
Expected: Build succeeds with no new errors. Existing Tailwind classes like `bg-stone-50`, `text-sage-500` etc. still work.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "feat(tokens): rewrite CSS token system with full design spec

Add semantic tokens, dimension palettes, spacing scale, elevation shadows,
z-index scale, transition tokens. Update stone-500 to #6B6459 for AA compliance."
```

---

### Task 3: Switch to next/font for font loading

**Files:**
- Modify: `apps/web/src/app/layout.tsx`

**Context:** Currently loads fonts via `<link>` tags to Google Fonts CDN, which is render-blocking. The spec requires switching to `next/font` for self-hosting with `display: 'swap'`.

- [ ] **Step 1: Replace Google Fonts links with next/font imports**

Read `apps/web/src/app/layout.tsx`. Remove all `<link>` tags for Google Fonts from `<head>`. Add at the top of the file:

```typescript
import { DM_Sans, DM_Mono } from 'next/font/google';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-mono',
  display: 'swap',
});
```

**Note:** Instrument Serif is not available in `next/font/google` as a variable font. Use `next/font/google` with:
```typescript
import { Instrument_Serif } from 'next/font/google';

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});
```

- [ ] **Step 2: Apply font variables to html/body**

Update the `<html>` and `<body>` tags:

```tsx
<html lang="en" className={`${dmSans.variable} ${instrumentSerif.variable} ${dmMono.variable}`}>
  <head>
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#FAFAF8" />
    {/* Keep iOS PWA meta tags, remove all Google Fonts <link> tags */}
  </head>
  <body className="font-sans antialiased selection:bg-sage-500/30">
    <AppProviders>{children}</AppProviders>
  </body>
</html>
```

- [ ] **Step 3: Verify fonts load correctly**

Run: `pnpm --filter @life-design/web dev`
Open browser → check that DM Sans body text, Instrument Serif headings, and DM Mono data numbers all render correctly. Verify no flash of unstyled text (FOUT) — `display: 'swap'` handles this gracefully.

- [ ] **Step 4: Verify build**

Run: `pnpm --filter @life-design/web build`
Expected: Build succeeds. No Google Fonts CDN requests in the output.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/layout.tsx
git commit -m "perf: switch from Google Fonts CDN to next/font self-hosting

Eliminates render-blocking font requests. Fonts now served from same domain
via next/font with display: swap."
```

---

### Task 4: Create TypeScript token constants

**Files:**
- Create: `packages/ui/src/tokens/colors.ts`
- Create: `packages/ui/src/tokens/typography.ts`
- Create: `packages/ui/src/tokens/spacing.ts`
- Create: `packages/ui/src/tokens/dimensions.ts`
- Create: `packages/ui/src/tokens/index.ts`

**Context:** Components and charts need programmatic access to token values (e.g., chart colors, dimension palettes). These TypeScript constants mirror the CSS custom properties from globals.css. The CSS is the source of truth at runtime; these constants are for JS logic like SVG chart rendering.

- [ ] **Step 1: Create colors.ts**

Create `packages/ui/src/tokens/colors.ts`:

```typescript
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
```

- [ ] **Step 2: Create dimensions.ts**

Create `packages/ui/src/tokens/dimensions.ts`:

```typescript
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
```

- [ ] **Step 3: Create typography.ts**

Create `packages/ui/src/tokens/typography.ts`:

```typescript
export const typeScale = {
  display:    { size: '2rem',      lineHeight: '1.2',  weight: 400, font: 'serif' },
  headingLg:  { size: '1.5rem',    lineHeight: '1.25', weight: 400, font: 'serif' },
  headingMd:  { size: '1.25rem',   lineHeight: '1.3',  weight: 400, font: 'serif' },
  headingSm:  { size: '1rem',      lineHeight: '1.4',  weight: 600, font: 'sans' },
  bodyLg:     { size: '1rem',      lineHeight: '1.5',  weight: 400, font: 'sans' },
  body:       { size: '0.875rem',  lineHeight: '1.5',  weight: 400, font: 'sans' },
  bodySm:     { size: '0.8125rem', lineHeight: '1.5',  weight: 400, font: 'sans' },
  caption:    { size: '0.6875rem', lineHeight: '1.4',  weight: 500, font: 'sans' },
  dataSm:     { size: '0.875rem',  lineHeight: '1.2',  weight: 500, font: 'mono' },
  dataMd:     { size: '1rem',      lineHeight: '1.2',  weight: 600, font: 'mono' },
  dataLg:     { size: '1.25rem',   lineHeight: '1.2',  weight: 700, font: 'mono' },
  dataXl:     { size: '1.5rem',    lineHeight: '1.2',  weight: 700, font: 'mono' },
} as const;

/** Minimum text size — nothing below 11px anywhere */
export const MIN_TEXT_SIZE = '0.6875rem'; // 11px
```

- [ ] **Step 4: Create spacing.ts**

Create `packages/ui/src/tokens/spacing.ts`:

```typescript
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
```

- [ ] **Step 5: Create tokens barrel index**

Create `packages/ui/src/tokens/index.ts`:

```typescript
export { colors, semantic } from './colors';
export { dimensionPalettes, dimensionShadow } from './dimensions';
export type { DimensionPalette } from './dimensions';
export { typeScale, MIN_TEXT_SIZE } from './typography';
export { spacing, radius, elevation, zIndex, transition, breakpoints } from './spacing';
```

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/tokens/
git commit -m "feat(tokens): add TypeScript token constants

Colors, typography, spacing, dimensions, elevation — mirrors CSS custom
properties for programmatic use in charts and JS logic."
```

---

### Task 5: Deprecate old token files and update exports

**Files:**
- Modify: `packages/ui/src/tokens.ts`
- Modify: `packages/ui/src/design-system/tokens.ts`
- Modify: `packages/ui/src/index.ts`

**Context:** Two old token files exist: `packages/ui/src/tokens.ts` (indigo palette) and `packages/ui/src/design-system/tokens.ts` (Cabinet Grotesk/glass). Both are replaced by the new `tokens/` directory. Old exports are preserved as deprecated re-exports during migration.

- [ ] **Step 1: Replace packages/ui/src/tokens.ts**

Read current `packages/ui/src/tokens.ts`. Replace its contents with:

```typescript
/**
 * @deprecated Use imports from '@life-design/ui/tokens' instead.
 * This file is a compatibility shim preserved during migration.
 */

// Re-export new token system
export * from './tokens/index';

// Legacy compatibility — old code may import these
import { colors, semantic } from './tokens/colors';
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
```

- [ ] **Step 2: Add @deprecated to design-system/tokens.ts**

Read `packages/ui/src/design-system/tokens.ts`. Add `@deprecated` JSDoc to the top of the file and to the `designTokens` export:

```typescript
/**
 * @deprecated This entire file is superseded by the new token system.
 * Import from '@life-design/ui' instead.
 * Will be removed after migration is complete.
 */
```

Do NOT delete the file yet — existing components still import from it.

- [ ] **Step 3: Update packages/ui/src/index.ts**

Replace `packages/ui/src/index.ts` with:

```typescript
// New token system
export * from './tokens';

// New components (will be added as they're built)
// export * from './components';

// Legacy design system (deprecated — remove after migration)
export * from './design-system';
```

- [ ] **Step 4: Verify no type errors**

Run: `pnpm tsc --noEmit`
Expected: No new errors. Old imports still resolve via deprecated re-exports.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/tokens.ts packages/ui/src/design-system/tokens.ts packages/ui/src/index.ts
git commit -m "refactor(tokens): deprecate old token files, wire new token system

Old tokens.ts and design-system/tokens.ts preserved with @deprecated
annotations. New tokens/ directory is the source of truth."
```

---

## Chunk 2: Core Components

All components go in `packages/ui/src/components/`. They use Tailwind classes referencing the CSS custom properties from Chunk 1. Each component is a single `.tsx` file with co-located `.test.tsx`.

**Shared pattern:** Every component accepts `className?: string` for composition and forwards refs where appropriate. Use `clsx` (already in apps/web deps) for conditional classes. Import `clsx` in packages/ui — add it as a dependency first.

### Task 6: Install component dependencies + create component barrel

**Files:**
- Modify: `packages/ui/package.json`
- Create: `packages/ui/src/components/index.ts`

- [ ] **Step 1: Install clsx and tailwind-merge**

```bash
pnpm --filter @life-design/ui add clsx tailwind-merge
```

- [ ] **Step 2: Create cn utility**

Create `packages/ui/src/utils/cn.ts`:

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Create empty component barrel**

Create `packages/ui/src/components/index.ts`:

```typescript
// Components are exported as they're built
```

- [ ] **Step 4: Update packages/ui/src/index.ts**

Add to `packages/ui/src/index.ts`:

```typescript
export { cn } from './utils/cn';
export * from './components';
```

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/utils/ packages/ui/src/components/index.ts packages/ui/src/index.ts packages/ui/package.json pnpm-lock.yaml
git commit -m "chore(ui): add cn utility and component barrel"
```

---

### Task 7: Button component

**Files:**
- Create: `packages/ui/src/components/Button.tsx`
- Create: `packages/ui/src/components/Button.test.tsx`
- Modify: `packages/ui/src/components/index.ts`

**Spec reference:** Section 5.1 — 4 variants (primary/secondary/ghost/destructive), 3 sizes (sm/default/lg), loading + disabled states.

- [ ] **Step 1: Write Button tests**

Create `packages/ui/src/components/Button.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with children text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('applies primary variant classes by default', () => {
    render(<Button>Primary</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-sage-600');
  });

  it('applies secondary variant classes', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-stone-100');
  });

  it('applies ghost variant classes', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('text-sage-500');
  });

  it('applies destructive variant classes', () => {
    render(<Button variant="destructive">Delete</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-[#CC3333]');
  });

  it('applies size classes', () => {
    render(<Button size="lg">Large</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('px-7');
  });

  it('shows loading spinner and hides text', () => {
    render(<Button loading>Submit</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn.querySelector('svg')).toBeInTheDocument();
  });

  it('disables button when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls onClick handler', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('merges custom className', () => {
    render(<Button className="mt-4">Styled</Button>);
    expect(screen.getByRole('button').className).toContain('mt-4');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `pnpm --filter @life-design/ui test`
Expected: FAIL — `./Button` module not found.

- [ ] **Step 3: Implement Button**

Create `packages/ui/src/components/Button.tsx`:

```tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'default' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-sage-600 text-white shadow-[0_2px_8px_rgba(90,127,90,0.3)] hover:bg-sage-600/90 focus-visible:ring-sage-500/15',
  secondary: 'bg-stone-100 text-stone-700 border border-stone-200 hover:bg-stone-200/60 focus-visible:ring-sage-500/15',
  ghost: 'bg-transparent text-sage-500 hover:bg-sage-50 focus-visible:ring-sage-500/15',
  destructive: 'bg-[#CC3333] text-white hover:bg-[#CC3333]/90 focus-visible:ring-[#CC3333]/15',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-1.5 text-xs',
  default: 'px-5 py-2.5 text-[13px]',
  lg: 'px-7 py-3 text-sm',
};

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'default', loading, disabled, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-semibold rounded-[8px] transition-all',
          'focus-visible:outline-none focus-visible:ring-[3px]',
          'disabled:opacity-50 disabled:pointer-events-none',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {loading ? <Spinner /> : children}
      </button>
    );
  },
);

Button.displayName = 'Button';
```

- [ ] **Step 4: Export from barrel**

Add to `packages/ui/src/components/index.ts`:

```typescript
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';
```

- [ ] **Step 5: Run tests — verify they pass**

Run: `pnpm --filter @life-design/ui test`
Expected: All 10 Button tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/components/Button.tsx packages/ui/src/components/Button.test.tsx packages/ui/src/components/index.ts
git commit -m "feat(ui): add Button component with 4 variants, 3 sizes, loading state"
```

---

### Task 8: Card component

**Files:**
- Create: `packages/ui/src/components/Card.tsx`
- Create: `packages/ui/src/components/Card.test.tsx`
- Modify: `packages/ui/src/components/index.ts`

**Spec reference:** Section 5.2 — 4 variants (default/raised/sunken/dimension), hover scale, dimension-tinted shadows.

- [ ] **Step 1: Write Card tests**

Create `packages/ui/src/components/Card.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Content</Card>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('applies default variant styles', () => {
    const { container } = render(<Card>Default</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-white');
    expect(card.className).toContain('border-stone-200');
  });

  it('applies raised variant', () => {
    const { container } = render(<Card variant="raised">Raised</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('shadow-[0_4px_12px');
  });

  it('applies sunken variant', () => {
    const { container } = render(<Card variant="sunken">Sunken</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-stone-100');
  });

  it('applies dimension variant with tinted border', () => {
    const { container } = render(<Card variant="dimension" dimension="career">Career</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('border');
  });

  it('merges custom className', () => {
    const { container } = render(<Card className="mt-8">Styled</Card>);
    expect((container.firstChild as HTMLElement).className).toContain('mt-8');
  });

  it('applies hover classes when hoverable', () => {
    const { container } = render(<Card hoverable>Hover me</Card>);
    expect((container.firstChild as HTMLElement).className).toContain('hover:scale-[1.01]');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `pnpm --filter @life-design/ui test`
Expected: FAIL — Card module not found.

- [ ] **Step 3: Implement Card**

Create `packages/ui/src/components/Card.tsx`:

```tsx
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../utils/cn';
import { dimensionPalettes, dimensionShadow } from '../tokens/dimensions';
import type { Dimension } from '@life-design/core';

export type CardVariant = 'default' | 'raised' | 'sunken' | 'dimension';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  dimension?: Dimension;
  hoverable?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white border border-stone-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]',
  raised: 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]',
  sunken: 'bg-stone-100 shadow-none',
  dimension: 'bg-white',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', dimension, hoverable, className, style, children, ...props }, ref) => {
    const dimStyles = variant === 'dimension' && dimension ? {
      borderColor: dimensionPalettes[dimension].border,
      boxShadow: dimensionShadow(dimension),
    } : {};

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-[16px] p-6',
          variantStyles[variant],
          variant === 'dimension' && 'border',
          hoverable && 'transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]',
          className,
        )}
        style={{ ...dimStyles, ...style }}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';
```

- [ ] **Step 4: Export from barrel + run tests**

Add to `packages/ui/src/components/index.ts`:
```typescript
export { Card } from './Card';
export type { CardProps, CardVariant } from './Card';
```

Run: `pnpm --filter @life-design/ui test`
Expected: All Card tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/components/Card.tsx packages/ui/src/components/Card.test.tsx packages/ui/src/components/index.ts
git commit -m "feat(ui): add Card component with default/raised/sunken/dimension variants"
```

---

### Task 9: Input, Textarea, Select components

**Files:**
- Create: `packages/ui/src/components/Input.tsx`
- Create: `packages/ui/src/components/Input.test.tsx`
- Modify: `packages/ui/src/components/index.ts`

**Spec reference:** Section 5.3 — Label, field styling, focus ring, error state, helper text.

- [ ] **Step 1: Write Input tests**

Create `packages/ui/src/components/Input.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { Input, Textarea, FormField } from './Input';

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('applies error styling when error prop is set', () => {
    render(<Input error />);
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('border-[#CC3333]');
  });
});

describe('Textarea', () => {
  it('renders a textarea element', () => {
    render(<Textarea placeholder="Write here" />);
    expect(screen.getByPlaceholderText('Write here')).toBeInTheDocument();
  });
});

describe('FormField', () => {
  it('renders label and input', () => {
    render(<FormField label="Email"><Input /></FormField>);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<FormField label="Name" error="Required"><Input error /></FormField>);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('shows helper text', () => {
    render(<FormField label="Bio" helper="Max 200 chars"><Textarea /></FormField>);
    expect(screen.getByText('Max 200 chars')).toBeInTheDocument();
  });
});

describe('Select', () => {
  it('renders a select element', () => {
    render(<Select><option>Option 1</option></Select>);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('applies error styling', () => {
    render(<Select error><option>A</option></Select>);
    expect(screen.getByRole('combobox').className).toContain('border-[#CC3333]');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `pnpm --filter @life-design/ui test`
Expected: FAIL — Input module not found.

- [ ] **Step 3: Implement Input components**

Create `packages/ui/src/components/Input.tsx`:

```tsx
import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../utils/cn';

const fieldBase = 'w-full rounded-[8px] border border-stone-300 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-500 transition-all duration-150 focus:border-sage-500 focus:ring-[3px] focus:ring-sage-500/15 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';
const fieldError = 'border-[#CC3333] focus:border-[#CC3333] focus:ring-[#CC3333]/15';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldBase, error && fieldError, className)} {...props} />
  ),
);
Input.displayName = 'Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldBase, 'min-h-[80px] resize-y', error && fieldError, className)} {...props} />
  ),
);
Textarea.displayName = 'Textarea';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, className, children, ...props }, ref) => (
    <select ref={ref} className={cn(fieldBase, 'appearance-none bg-[url("data:image/svg+xml,%3Csvg width=\'12\' height=\'8\' viewBox=\'0 0 12 8\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1.5L6 6.5L11 1.5\' stroke=\'%236B6459\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")] bg-[length:12px] bg-[right_16px_center] bg-no-repeat pr-10', error && fieldError, className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export interface FormFieldProps {
  label: string;
  error?: string;
  helper?: string;
  children: ReactNode;
}

export function FormField({ label, error, helper, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-semibold text-stone-700">{label}</label>
      {children}
      {error && <p className="text-[11px] text-[#CC3333] font-medium">{error}</p>}
      {helper && !error && <p className="text-[11px] text-stone-500">{helper}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Export + run tests**

Add to barrel:
```typescript
export { Input, Textarea, Select, FormField } from './Input';
export type { InputProps, TextareaProps, SelectProps, FormFieldProps } from './Input';
```

Run: `pnpm --filter @life-design/ui test`
Expected: All Input tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/components/Input.tsx packages/ui/src/components/Input.test.tsx packages/ui/src/components/index.ts
git commit -m "feat(ui): add Input, Textarea, FormField with error/helper states"
```

---

### Task 10: Badge component

**Files:**
- Create: `packages/ui/src/components/Badge.tsx`
- Create: `packages/ui/src/components/Badge.test.tsx`
- Modify: `packages/ui/src/components/index.ts`

**Spec reference:** Section 5.4 — 7 variants.

- [ ] **Step 1: Write Badge tests**

Create `packages/ui/src/components/Badge.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders text', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies sage variant by default', () => {
    const { container } = render(<Badge>Default</Badge>);
    expect((container.firstChild as HTMLElement).className).toContain('bg-sage-100');
  });

  it('applies warm variant', () => {
    const { container } = render(<Badge variant="warm">Warm</Badge>);
    expect((container.firstChild as HTMLElement).className).toContain('bg-warm-100');
  });

  it('applies destructive variant', () => {
    const { container } = render(<Badge variant="destructive">Error</Badge>);
    expect((container.firstChild as HTMLElement).className).toContain('bg-red-50');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `pnpm --filter @life-design/ui test`
Expected: FAIL — Badge module not found.

- [ ] **Step 3: Implement Badge**

Create `packages/ui/src/components/Badge.tsx`:

```tsx
import type { HTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export type BadgeVariant = 'sage' | 'warm' | 'accent' | 'stone' | 'success' | 'warning' | 'destructive';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  sage: 'bg-sage-100 text-sage-600',
  warm: 'bg-warm-100 text-warm-500',
  accent: 'bg-accent-400/20 text-accent-600',
  stone: 'bg-stone-100 text-stone-600',
  success: 'bg-sage-100 text-sage-600',
  warning: 'bg-warm-100 text-warm-500',
  destructive: 'bg-red-50 text-[#CC3333]',
};

export function Badge({ variant = 'sage', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 4: Export from barrel**

Add to `packages/ui/src/components/index.ts`:
```typescript
export { Badge } from './Badge';
export type { BadgeProps, BadgeVariant } from './Badge';
```

- [ ] **Step 5: Run tests — verify they pass**

Run: `pnpm --filter @life-design/ui test`
Expected: All Badge tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/components/Badge.tsx packages/ui/src/components/Badge.test.tsx packages/ui/src/components/index.ts
git commit -m "feat(ui): add Badge component with 7 semantic variants"
```

---

### Task 11: Skeleton component

**Files:**
- Create: `packages/ui/src/components/Skeleton.tsx`
- Create: `packages/ui/src/components/Skeleton.test.tsx`
- Modify: `packages/ui/src/components/index.ts`

**Spec reference:** Section 5.8 — Pulse animation, card/sparkline/ring/schedule/dashboard skeletons.

- [ ] **Step 1: Write Skeleton tests**

Create `packages/ui/src/components/Skeleton.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { Skeleton, CardSkeleton } from './Skeleton';

describe('Skeleton', () => {
  it('renders with pulse animation', () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    expect((container.firstChild as HTMLElement).className).toContain('animate-pulse-skeleton');
  });

  it('renders with custom dimensions', () => {
    const { container } = render(<Skeleton className="h-8 w-full" />);
    expect((container.firstChild as HTMLElement).className).toContain('h-8');
  });
});

describe('CardSkeleton', () => {
  it('renders title and body lines', () => {
    const { container } = render(<CardSkeleton />);
    const lines = container.querySelectorAll('[class*="animate-pulse-skeleton"]');
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Implement Skeleton**

Create `packages/ui/src/components/Skeleton.tsx`:

```tsx
import { cn } from '../utils/cn';

export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('bg-stone-200 rounded-[8px] animate-pulse-skeleton', className)} />
  );
}

export function CardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('bg-stone-100 rounded-[16px] p-6 space-y-4', className)}>
      <Skeleton className="h-4 w-2/5" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-3 w-3/5" />
    </div>
  );
}

export function SparklineSkeleton({ className }: SkeletonProps) {
  return <Skeleton className={cn('h-6 w-[120px]', className)} />;
}

export function ProgressRingSkeleton({ className }: SkeletonProps) {
  return <Skeleton className={cn('h-11 w-11 rounded-full', className)} />;
}

export function ScheduleWidgetSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-1 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Export from barrel**

Add to `packages/ui/src/components/index.ts`:
```typescript
export { Skeleton, CardSkeleton, SparklineSkeleton, ProgressRingSkeleton, ScheduleWidgetSkeleton } from './Skeleton';
export type { SkeletonProps } from './Skeleton';
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `pnpm --filter @life-design/ui test`
Expected: All Skeleton tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/components/Skeleton.tsx packages/ui/src/components/Skeleton.test.tsx packages/ui/src/components/index.ts
git commit -m "feat(ui): add Skeleton loading state components"
```

---

### Task 12: Modal component

**Files:**
- Create: `packages/ui/src/components/Modal.tsx`
- Create: `packages/ui/src/components/Modal.test.tsx`
- Modify: `packages/ui/src/components/index.ts`

**Spec reference:** Section 5.6 — Overlay backdrop-blur, radius-xl, elevation-3, close button.

- [ ] **Step 1: Write Modal tests**

Create `packages/ui/src/components/Modal.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(<Modal open={false} onClose={() => {}}>Content</Modal>);
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('renders children when open', () => {
    render(<Modal open onClose={() => {}}>Content</Modal>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders title', () => {
    render(<Modal open onClose={() => {}} title="Confirm">Body</Modal>);
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  it('calls onClose when overlay clicked', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose}>Body</Modal>);
    fireEvent.click(screen.getByTestId('modal-overlay'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Test">Body</Modal>);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Implement Modal**

Create `packages/ui/src/components/Modal.tsx`:

```tsx
import { type ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, footer, className }: ModalProps) {
  if (!open) return null;

  return (
    <>
      <div
        data-testid="modal-overlay"
        className="fixed inset-0 z-[55] bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div
          className={cn(
            'bg-white rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)] max-w-lg w-full p-8',
            className,
          )}
          onClick={e => e.stopPropagation()}
        >
          {title && (
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-xl">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="text-stone-400 hover:text-stone-700 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          {children}
          {footer && <div className="flex justify-end gap-3 mt-6">{footer}</div>}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Export from barrel**

Add to `packages/ui/src/components/index.ts`:
```typescript
export { Modal } from './Modal';
export type { ModalProps } from './Modal';
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `pnpm --filter @life-design/ui test`
Expected: All Modal tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/components/Modal.tsx packages/ui/src/components/Modal.test.tsx packages/ui/src/components/index.ts
git commit -m "feat(ui): add Modal component with overlay, title, footer slots"
```

---

### Task 13: Tooltip component

**Files:**
- Create: `packages/ui/src/components/Tooltip.tsx`
- Modify: `packages/ui/src/components/index.ts`

**Spec reference:** Section 5.7 — Tooltip (dark bg, white text) and Popover (white bg, border).

- [ ] **Step 1: Write Tooltip tests**

Create `packages/ui/src/components/Tooltip.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Tooltip, Popover } from './Tooltip';

describe('Tooltip', () => {
  it('renders trigger content', () => {
    render(<Tooltip content="Help text"><button>Hover me</button></Tooltip>);
    expect(screen.getByText('Hover me')).toBeInTheDocument();
  });

  it('shows tooltip on mouse enter', () => {
    render(<Tooltip content="Help text"><button>Hover me</button></Tooltip>);
    fireEvent.mouseEnter(screen.getByText('Hover me').closest('span')!);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('Help text')).toBeInTheDocument();
  });

  it('hides tooltip on mouse leave', () => {
    render(<Tooltip content="Help text"><button>Hover me</button></Tooltip>);
    const trigger = screen.getByText('Hover me').closest('span')!;
    fireEvent.mouseEnter(trigger);
    fireEvent.mouseLeave(trigger);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});

describe('Popover', () => {
  it('renders trigger', () => {
    render(<Popover content={<div>Details</div>}><button>Open</button></Popover>);
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('shows popover on click', () => {
    render(<Popover content={<div>Details</div>}><button>Open</button></Popover>);
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByText('Details')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `pnpm --filter @life-design/ui test`
Expected: FAIL — Tooltip module not found.

- [ ] **Step 3: Implement Tooltip + Popover**

Create `packages/ui/src/components/Tooltip.tsx`:

```tsx
'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative inline-flex" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && (
        <span
          role="tooltip"
          className={cn(
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-[8px]',
            'bg-stone-800 text-white text-[11px] font-medium whitespace-nowrap',
            'shadow-[0_8px_24px_rgba(0,0,0,0.08)] z-50',
            className,
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}

export interface PopoverProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Popover({ content, children, className }: PopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <span onClick={() => setOpen(!open)}>{children}</span>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={cn(
              'absolute top-full left-1/2 -translate-x-1/2 mt-2 p-4 rounded-[12px]',
              'bg-white border border-stone-200',
              'shadow-[0_8px_24px_rgba(0,0,0,0.08)] z-50',
              className,
            )}
          >
            {content}
          </div>
        </>
      )}
    </span>
  );
}
```

- [ ] **Step 4: Export from barrel**

Add to `packages/ui/src/components/index.ts`:
```typescript
export { Tooltip, Popover } from './Tooltip';
export type { TooltipProps, PopoverProps } from './Tooltip';
```

- [ ] **Step 5: Run tests — verify they pass**

Run: `pnpm --filter @life-design/ui test`
Expected: All Tooltip and Popover tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/components/Tooltip.tsx packages/ui/src/components/Tooltip.test.tsx packages/ui/src/components/index.ts
git commit -m "feat(ui): add Tooltip and Popover components"
```

---

## Chunk 3: Data Visualization Components

Custom SVG components for charts and data displays. These live in `packages/ui/src/components/data-viz/`. They import dimension palettes from the token system for colors.

### Task 14: RadarChart (Wheel of Life)

**Files:**
- Create: `packages/ui/src/components/data-viz/RadarChart.tsx`
- Create: `packages/ui/src/components/data-viz/RadarChart.test.tsx`
- Create: `packages/ui/src/components/data-viz/index.ts`

**Spec reference:** Section 6.1 — 8 axes, polygon fill, vertex dots with dimension colors, grid rings, hover tooltip, morph animation.

- [ ] **Step 1: Write RadarChart tests**

Create `packages/ui/src/components/data-viz/RadarChart.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { RadarChart } from './RadarChart';
import type { Dimension } from '@life-design/core';

const mockScores: Record<Dimension, number> = {
  career: 7, finance: 5, health: 8, fitness: 6,
  family: 9, social: 4, romance: 6, growth: 7,
};

describe('RadarChart', () => {
  it('renders an SVG element', () => {
    const { container } = render(<RadarChart scores={mockScores} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders 8 axis labels', () => {
    render(<RadarChart scores={mockScores} />);
    expect(screen.getByText('Career')).toBeInTheDocument();
    expect(screen.getByText('Health')).toBeInTheDocument();
    expect(screen.getByText('Romance')).toBeInTheDocument();
  });

  it('renders 3 grid rings', () => {
    const { container } = render(<RadarChart scores={mockScores} />);
    const circles = container.querySelectorAll('circle[class*="grid"]');
    expect(circles.length).toBe(3);
  });

  it('renders the data polygon', () => {
    const { container } = render(<RadarChart scores={mockScores} />);
    expect(container.querySelector('polygon')).toBeInTheDocument();
  });

  it('renders 8 vertex dots', () => {
    const { container } = render(<RadarChart scores={mockScores} />);
    const dots = container.querySelectorAll('circle[data-dimension]');
    expect(dots.length).toBe(8);
  });

  it('accepts custom size', () => {
    const { container } = render(<RadarChart scores={mockScores} size={400} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('400');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `pnpm --filter @life-design/ui test`
Expected: FAIL — RadarChart module not found.

- [ ] **Step 3: Implement RadarChart**

Create `packages/ui/src/components/data-viz/RadarChart.tsx`:

```tsx
import { type Dimension, ALL_DIMENSIONS, DIMENSION_LABELS } from '@life-design/core';
import { dimensionPalettes } from '../../tokens/dimensions';
import { colors } from '../../tokens/colors';

export interface RadarChartProps {
  scores: Partial<Record<Dimension, number>>;
  size?: number;
  className?: string;
}

const GRID_LEVELS = [3.33, 6.67, 10]; // 3 rings at 1/3, 2/3, full

export function RadarChart({ scores, size = 300, className }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.38; // leave room for labels
  const labelR = size * 0.48;

  function polarToXY(angle: number, value: number, radius = maxR) {
    const r = (value / 10) * radius;
    const rad = (angle - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const step = 360 / ALL_DIMENSIONS.length;

  // Build polygon points
  const points = ALL_DIMENSIONS.map((dim, i) => {
    const score = scores[dim] ?? 0;
    const { x, y } = polarToXY(i * step, score);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
      {/* Grid rings */}
      {GRID_LEVELS.map((level) => (
        <circle
          key={level}
          cx={cx} cy={cy}
          r={(level / 10) * maxR}
          fill="none"
          stroke={colors.stone[200]}
          strokeWidth="0.5"
          className="grid"
        />
      ))}

      {/* Axis lines */}
      {ALL_DIMENSIONS.map((_, i) => {
        const end = polarToXY(i * step, 10);
        return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke={colors.stone[200]} strokeWidth="0.5" />;
      })}

      {/* Data polygon */}
      <polygon
        points={points}
        fill="rgba(90,127,90,0.12)"
        stroke={colors.sage[500]}
        strokeWidth="1.5"
        style={{ transition: 'all 300ms ease' }}
      />

      {/* Vertex dots */}
      {ALL_DIMENSIONS.map((dim, i) => {
        const score = scores[dim] ?? 0;
        const { x, y } = polarToXY(i * step, score);
        return (
          <circle
            key={dim}
            data-dimension={dim}
            cx={x} cy={y} r={4}
            fill={dimensionPalettes[dim].accent}
          />
        );
      })}

      {/* Axis labels */}
      {ALL_DIMENSIONS.map((dim, i) => {
        const { x, y } = polarToXY(i * step, 10, labelR);
        return (
          <text
            key={dim}
            x={x} y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={dimensionPalettes[dim].text}
            fontSize="11"
            fontWeight="500"
            fontFamily="'DM Sans', sans-serif"
          >
            {DIMENSION_LABELS[dim]}
          </text>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 4: Create data-viz barrel export**

Create `packages/ui/src/components/data-viz/index.ts`:

```typescript
export { RadarChart } from './RadarChart';
export type { RadarChartProps } from './RadarChart';
```

Update `packages/ui/src/components/index.ts` to add:
```typescript
export * from './data-viz';
```

- [ ] **Step 5: Run tests + commit**

Run: `pnpm --filter @life-design/ui test`
Expected: All RadarChart tests PASS.

```bash
git add packages/ui/src/components/data-viz/
git commit -m "feat(ui): add RadarChart (Wheel of Life) with dimension-colored vertices"
```

---

### Task 15: Sparkline component

**Files:**
- Create: `packages/ui/src/components/data-viz/Sparkline.tsx`
- Modify: `packages/ui/src/components/data-viz/index.ts`

**Spec reference:** Section 6.2 — Inline SVG 120×24px, 2px stroke, end dot, trend badge.

- [ ] **Step 1: Implement Sparkline**

Create `packages/ui/src/components/data-viz/Sparkline.tsx`:

```tsx
import type { Dimension } from '@life-design/core';
import { dimensionPalettes } from '../../tokens/dimensions';
import { cn } from '../../utils/cn';

export interface SparklineProps {
  data: number[];
  dimension?: Dimension;
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({
  data, dimension, color, width = 120, height = 24, className,
}: SparklineProps) {
  if (data.length < 2) return null;

  const strokeColor = color ?? (dimension ? dimensionPalettes[dimension].accent : '#5A7F5A');
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  const lastPoint = points[points.length - 1].split(',');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn('inline-block', className)}>
      <polyline points={points.join(' ')} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastPoint[0]} cy={lastPoint[1]} r="3" fill={strokeColor} />
    </svg>
  );
}
```

- [ ] **Step 2: Export + commit**

Add to `packages/ui/src/components/data-viz/index.ts`:
```typescript
export { Sparkline } from './Sparkline';
export type { SparklineProps } from './Sparkline';
```

```bash
git add packages/ui/src/components/data-viz/Sparkline.tsx packages/ui/src/components/data-viz/index.ts
git commit -m "feat(ui): add Sparkline inline chart component"
```

---

### Task 16: ProgressRing (Life Score)

**Files:**
- Create: `packages/ui/src/components/data-viz/ProgressRing.tsx`
- Create: `packages/ui/src/components/data-viz/ProgressRing.test.tsx`
- Modify: `packages/ui/src/components/data-viz/index.ts`

**Spec reference:** Section 6.3 — SVG circle, gradient stroke, center data text.

- [ ] **Step 1: Write ProgressRing tests**

Create `packages/ui/src/components/data-viz/ProgressRing.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { ProgressRing } from './ProgressRing';

describe('ProgressRing', () => {
  it('renders the score value', () => {
    render(<ProgressRing value={7.2} max={10} />);
    expect(screen.getByText('7.2')).toBeInTheDocument();
  });

  it('renders "of 10" caption', () => {
    render(<ProgressRing value={7.2} max={10} />);
    expect(screen.getByText('of 10')).toBeInTheDocument();
  });

  it('renders SVG with circles', () => {
    const { container } = render(<ProgressRing value={5} max={10} />);
    expect(container.querySelectorAll('circle').length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Implement ProgressRing**

Create `packages/ui/src/components/data-viz/ProgressRing.tsx`:

```tsx
import { cn } from '../../utils/cn';

export interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  className?: string;
}

export function ProgressRing({ value, max = 10, size = 44, className }: ProgressRingProps) {
  const r = 15;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const offset = circumference * (1 - pct);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="progress-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5A7F5A" />
            <stop offset="100%" stopColor="#9BB89B" />
          </linearGradient>
        </defs>
        <circle cx="18" cy="18" r={r} fill="none" stroke="#E8E4DD" strokeWidth="2.5" />
        <circle
          cx="18" cy="18" r={r} fill="none"
          stroke="url(#progress-grad)" strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 300ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-base font-bold text-stone-900 leading-none">
          {value % 1 === 0 ? value : value.toFixed(1)}
        </span>
        <span className="text-[11px] text-stone-500 mt-0.5">of {max}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Export + run tests + commit**

Add to data-viz barrel. Run `pnpm --filter @life-design/ui test`. Commit:

```bash
git add packages/ui/src/components/data-viz/ProgressRing.tsx packages/ui/src/components/data-viz/ProgressRing.test.tsx packages/ui/src/components/data-viz/index.ts
git commit -m "feat(ui): add ProgressRing (Life Score) with gradient stroke"
```

---

### Task 17: TrendBar component

**Files:**
- Create: `packages/ui/src/components/data-viz/TrendBar.tsx`
- Modify: `packages/ui/src/components/data-viz/index.ts`

**Spec reference:** Section 6.4 — Horizontal bar, dimension gradient fill.

- [ ] **Step 1: Implement TrendBar**

Create `packages/ui/src/components/data-viz/TrendBar.tsx`:

```tsx
import type { Dimension } from '@life-design/core';
import { dimensionPalettes } from '../../tokens/dimensions';
import { cn } from '../../utils/cn';

export interface TrendBarProps {
  dimension: Dimension;
  value: number;
  max?: number;
  label?: string;
  className?: string;
}

export function TrendBar({ dimension, value, max = 10, label, className }: TrendBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  const palette = dimensionPalettes[dimension];

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-stone-700">{label}</span>
          <span className="font-mono text-sm font-semibold text-stone-800">{value.toFixed(1)}</span>
        </div>
      )}
      <div className="h-1 w-full rounded-full bg-stone-200 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${palette.accent}, ${palette.bg})` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Export + commit**

Add to data-viz barrel, commit:

```bash
git add packages/ui/src/components/data-viz/TrendBar.tsx packages/ui/src/components/data-viz/index.ts
git commit -m "feat(ui): add TrendBar dimension score bar"
```

---

### Task 18: Heatmap (Correlation Grid)

**Files:**
- Create: `packages/ui/src/components/data-viz/Heatmap.tsx`
- Modify: `packages/ui/src/components/data-viz/index.ts`

**Spec reference:** Section 6.5 — Grid of cells, sage for positive, warm for negative correlations, hover tooltip.

- [ ] **Step 1: Implement Heatmap**

Create `packages/ui/src/components/data-viz/Heatmap.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { type Dimension, ALL_DIMENSIONS, DIMENSION_LABELS } from '@life-design/core';
import { dimensionPalettes } from '../../tokens/dimensions';
import { cn } from '../../utils/cn';

export interface HeatmapCell {
  dim1: Dimension;
  dim2: Dimension;
  coefficient: number;
}

export interface HeatmapProps {
  data: HeatmapCell[];
  className?: string;
}

function cellColor(coeff: number): string {
  const abs = Math.abs(coeff);
  if (coeff >= 0) {
    // Sage scale: stronger = more opaque
    return `rgba(90, 127, 90, ${abs * 0.6 + 0.05})`;
  }
  // Warm scale
  return `rgba(154, 91, 45, ${abs * 0.6 + 0.05})`;
}

export function Heatmap({ data, className }: HeatmapProps) {
  const [hover, setHover] = useState<HeatmapCell | null>(null);

  const lookup = new Map<string, number>();
  data.forEach(c => {
    lookup.set(`${c.dim1}-${c.dim2}`, c.coefficient);
    lookup.set(`${c.dim2}-${c.dim1}`, c.coefficient);
  });

  return (
    <div className={cn('relative', className)}>
      <div className="grid gap-1" style={{ gridTemplateColumns: `60px repeat(${ALL_DIMENSIONS.length}, 1fr)` }}>
        {/* Header row */}
        <div />
        {ALL_DIMENSIONS.map(d => (
          <div key={d} className="text-[11px] font-medium text-stone-500 text-center truncate px-0.5">
            {DIMENSION_LABELS[d].slice(0, 3)}
          </div>
        ))}

        {/* Data rows */}
        {ALL_DIMENSIONS.map(row => (
          <>
            <div key={`label-${row}`} className="text-[11px] font-medium text-stone-600 flex items-center">
              {DIMENSION_LABELS[row].slice(0, 6)}
            </div>
            {ALL_DIMENSIONS.map(col => {
              const isDiagonal = row === col;
              const coeff = isDiagonal ? 1 : (lookup.get(`${row}-${col}`) ?? 0);
              return (
                <div
                  key={`${row}-${col}`}
                  className="aspect-square rounded-[4px] flex items-center justify-center text-[11px] font-mono cursor-default transition-transform hover:scale-110"
                  style={{
                    backgroundColor: isDiagonal ? dimensionPalettes[row].accent : cellColor(coeff),
                    color: isDiagonal ? 'white' : (Math.abs(coeff) > 0.4 ? 'white' : 'transparent'),
                  }}
                  onMouseEnter={() => setHover({ dim1: row, dim2: col, coefficient: coeff })}
                  onMouseLeave={() => setHover(null)}
                >
                  {isDiagonal ? '—' : coeff.toFixed(2)}
                </div>
              );
            })}
          </>
        ))}
      </div>

      {/* Tooltip */}
      {hover && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-stone-800 text-white text-[11px] font-medium whitespace-nowrap z-10 shadow-lg">
          {DIMENSION_LABELS[hover.dim1]} × {DIMENSION_LABELS[hover.dim2]}: {hover.coefficient.toFixed(3)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Export + commit**

```bash
git add packages/ui/src/components/data-viz/Heatmap.tsx packages/ui/src/components/data-viz/index.ts
git commit -m "feat(ui): add Heatmap correlation grid with sage/warm scales"
```

---

### Task 19: BarStack (Time Allocation)

**Files:**
- Create: `packages/ui/src/components/data-viz/BarStack.tsx`
- Modify: `packages/ui/src/components/data-viz/index.ts`

**Spec reference:** Section 6.6 — Horizontal stacked bar, 28px height, dimension colors, actual vs suggested.

- [ ] **Step 1: Implement BarStack**

Create `packages/ui/src/components/data-viz/BarStack.tsx`:

```tsx
import { type Dimension, DIMENSION_LABELS } from '@life-design/core';
import { dimensionPalettes } from '../../tokens/dimensions';
import { cn } from '../../utils/cn';

export interface BarSegment {
  dimension: Dimension;
  hours: number;
}

export interface BarStackProps {
  segments: BarSegment[];
  variant?: 'actual' | 'suggested';
  className?: string;
}

export function BarStack({ segments, variant = 'actual', className }: BarStackProps) {
  const total = segments.reduce((sum, s) => sum + s.hours, 0);
  if (total === 0) return null;

  return (
    <div className={cn('flex h-7 rounded-[8px] overflow-hidden', variant === 'suggested' && 'opacity-50 border border-dashed border-stone-300', className)}>
      {segments.map(seg => {
        const pct = (seg.hours / total) * 100;
        if (pct < 2) return null;
        const abbr = DIMENSION_LABELS[seg.dimension][0];
        return (
          <div
            key={seg.dimension}
            className="flex items-center justify-center text-[11px] font-semibold text-white"
            style={{ width: `${pct}%`, backgroundColor: dimensionPalettes[seg.dimension].accent }}
            title={`${DIMENSION_LABELS[seg.dimension]}: ${seg.hours}h`}
          >
            {pct > 8 ? abbr : ''}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Add to data-viz barrel**

Add to `packages/ui/src/components/data-viz/index.ts`:
```typescript
export { BarStack } from './BarStack';
export type { BarStackProps, BarSegment } from './BarStack';
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/components/data-viz/BarStack.tsx packages/ui/src/components/data-viz/index.ts
git commit -m "feat(ui): add BarStack time allocation chart"
```

---

## Chunk 4: Navigation, Toast, and Schedule

### Task 20: Install Phosphor Icons + refactor navigation

**Files:**
- Modify: `packages/ui/package.json` (add @phosphor-icons/react)
- Modify: `apps/web/package.json` (add @phosphor-icons/react)
- Modify: `apps/web/src/app/(protected)/protected-layout-client.tsx`

**Spec reference:** Sections 4, 9.1, 9.2 — Phosphor Icons regular weight, sidebar styling, bottom nav with token colors.

- [ ] **Step 1: Install Phosphor Icons**

```bash
pnpm --filter @life-design/web add @phosphor-icons/react && pnpm --filter @life-design/ui add @phosphor-icons/react
```

- [ ] **Step 2: Replace inline SVG icons with Phosphor**

In `apps/web/src/app/(protected)/protected-layout-client.tsx`:

1. Remove ALL inline SVG icon function components (LeafIcon, HomeIcon, TargetIcon, SunIcon, FlameIcon, TrophyIcon, SettingsIcon, ChatIcon, BeakerIcon, MoreIcon — lines 12-98)
2. Add Phosphor imports at the top:

```typescript
import { House, Target, Sun, ChatCircle, Flask, Fire, Trophy, Gear, DotsThreeVertical, Leaf, CalendarBlank } from '@phosphor-icons/react';
```

3. Update `navItems` to use Phosphor icons:

```typescript
const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: House },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/checkin', label: 'Check-in', icon: Sun },
  { href: '/mentor', label: 'Mentor', icon: ChatCircle },
  { href: '/schedule', label: 'Schedule', icon: CalendarBlank },
  { href: '/simulator', label: 'Simulate', icon: Flask },
  { href: '/challenges', label: 'Challenges', icon: Fire },
  { href: '/achievements', label: 'Badges', icon: Trophy },
  { href: '/settings', label: 'Settings', icon: Gear },
];
```

4. Update the `NavItem` type's `icon` to `React.ComponentType<{ className?: string; size?: number; weight?: string }>`.

5. Replace `<item.icon className="..." />` usages in sidebar with `<item.icon size={20} weight="regular" className="..." />` and in mobile nav with `<item.icon size={20} weight="regular" />`.

- [ ] **Step 3: Apply design system token colors to navigation**

In the same file, replace hardcoded hex values with Tailwind token classes:

- Sidebar active: `bg-sage-100 text-sage-600` (was `bg-[#F4F7F4] text-[#5A7F5A]`)
- Sidebar inactive: `text-stone-500 hover:bg-stone-100 hover:text-stone-800` (was `text-[#7D756A] hover:bg-[#F5F3EF] hover:text-[#3D3833]`)
- Sidebar inactive icon: `text-stone-500` (was `text-[#A8A198]` — updated for 3:1 compliance)
- Mobile active: `text-sage-600` (was `text-[#5A7F5A]`)
- Mobile inactive: `text-stone-500` (was `text-[#A8A198]`)
- Sidebar border: `border-stone-200` (was `border-[#E8E4DD]`)
- Logo: Replace LeafIcon SVG with `<Leaf size={20} weight="regular" className="text-white" />`
- "More" button: Replace MoreIcon with `<DotsThreeVertical size={20} weight="regular" />`

- [ ] **Step 4: Update mobile bottom nav**

Set mobile nav to show 5 items per spec: Dashboard, Goals, Check-in, Mentor, More.
Update `mobileMainItems` to first 4 (Home, Goals, Check-in, Mentor), `mobileMoreItems` to the rest (Schedule, Simulate, Challenges, Badges, Settings).

Mobile active item gets `sage-50 bg pill` per spec: when active, wrap icon+label in a `bg-sage-50 rounded-xl px-3` container.

- [ ] **Step 5: Verify build + commit**

Run: `pnpm --filter @life-design/web build`
Expected: Build succeeds, no missing icon errors.

```bash
git add apps/web/src/app/(protected)/protected-layout-client.tsx apps/web/package.json packages/ui/package.json pnpm-lock.yaml
git commit -m "feat(nav): replace inline SVGs with Phosphor Icons, apply token colors

Add Schedule to nav items. Use stone-500 for inactive icons (3:1 AA compliance).
Replace all hardcoded hex values with Tailwind token classes."
```

---

### Task 21: Toast component + ToastProvider

**Files:**
- Create: `packages/ui/src/components/Toast.tsx`
- Create: `packages/ui/src/components/Toast.test.tsx`
- Create: `apps/web/src/components/toast/ToastProvider.tsx`
- Modify: `apps/web/src/components/app-providers.tsx`
- Modify: `packages/ui/src/components/index.ts`

**Spec reference:** Section 5.5 + 8.1 — Fixed top-right, z-50, max 3 visible, slide-in, auto-dismiss, 5 variants.

- [ ] **Step 1: Write Toast tests**

Create `packages/ui/src/components/Toast.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { Toast } from './Toast';

describe('Toast', () => {
  it('renders message text', () => {
    render(<Toast variant="success" message="Saved!" onDismiss={() => {}} />);
    expect(screen.getByText('Saved!')).toBeInTheDocument();
  });

  it('applies success variant with sage border', () => {
    const { container } = render(<Toast variant="success" message="OK" onDismiss={() => {}} />);
    expect((container.firstChild as HTMLElement).className).toContain('border-l-sage-500');
  });

  it('applies error variant with red border', () => {
    const { container } = render(<Toast variant="error" message="Fail" onDismiss={() => {}} />);
    expect((container.firstChild as HTMLElement).className).toContain('border-l-[#CC3333]');
  });

  it('renders dismiss button', () => {
    render(<Toast variant="info" message="Note" onDismiss={() => {}} />);
    expect(screen.getByLabelText('Dismiss')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement Toast component**

Create `packages/ui/src/components/Toast.tsx`:

```tsx
import { Check, Warning, X, Info } from '@phosphor-icons/react';
import { cn } from '../utils/cn';

export type ToastVariant = 'success' | 'warning' | 'error' | 'info' | 'achievement';

export interface ToastProps {
  variant: ToastVariant;
  message: string;
  description?: string;
  emoji?: string;
  onDismiss: () => void;
  className?: string;
}

const borderColor: Record<ToastVariant, string> = {
  success: 'border-l-sage-500',
  warning: 'border-l-warm-500',
  error: 'border-l-[#CC3333]',
  info: 'border-l-accent-600',
  achievement: 'border-l-sage-500',
};

const iconMap: Record<string, React.ComponentType<{ size: number; className?: string }>> = {
  success: Check,
  warning: Warning,
  error: X,
  info: Info,
};

export function Toast({ variant, message, description, emoji, onDismiss, className }: ToastProps) {
  const Icon = iconMap[variant];

  return (
    <div
      className={cn(
        'flex items-start gap-3 w-full max-w-sm p-4 bg-white rounded-[12px] border-l-[3px]',
        'shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)]',
        'animate-[slideIn_300ms_ease-out]',
        borderColor[variant],
        variant === 'achievement' && 'bg-gradient-to-r from-sage-50 to-sage-100',
        className,
      )}
      role="alert"
    >
      {variant === 'achievement' && emoji ? (
        <span className="text-xl">{emoji}</span>
      ) : Icon ? (
        <Icon size={18} className="mt-0.5 shrink-0 text-stone-600" />
      ) : null}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-800">{message}</p>
        {description && <p className="text-[13px] text-stone-600 mt-0.5">{description}</p>}
      </div>
      <button onClick={onDismiss} aria-label="Dismiss" className="shrink-0 text-stone-400 hover:text-stone-700 transition-colors">
        <X size={16} />
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Add slideIn keyframe to globals.css**

Add to `apps/web/src/app/globals.css` animations section:

```css
@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
```

- [ ] **Step 4: Create ToastProvider**

Create `apps/web/src/components/toast/ToastProvider.tsx`:

```tsx
'use client';

import { createContext, useContext, useCallback, useState, type ReactNode } from 'react';
import { Toast, type ToastVariant } from '@life-design/ui';

interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: string;
  description?: string;
  emoji?: string;
}

interface ToastContextValue {
  toast: (variant: ToastVariant, message: string, opts?: { description?: string; emoji?: string; duration?: number }) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((variant: ToastVariant, message: string, opts?: { description?: string; emoji?: string; duration?: number }) => {
    const id = nextId++;
    const item: ToastItem = { id, variant, message, ...opts };
    setToasts(prev => [...prev.slice(-2), item]); // max 3 visible
    const duration = variant === 'achievement' ? 8000 : (opts?.duration ?? 5000);
    setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <Toast variant={t.variant} message={t.message} description={t.description} emoji={t.emoji} onDismiss={() => dismiss(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
```

- [ ] **Step 5: Wire ToastProvider into app-providers.tsx**

Read `apps/web/src/components/app-providers.tsx`. Add `<ToastProvider>` as an inner wrapper around `{children}`:

```typescript
import { ToastProvider } from '@/components/toast/ToastProvider';
// ... existing imports

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ExistingProviders>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ExistingProviders>
  );
}
```

- [ ] **Step 6: Export Toast + run tests + commit**

Add Toast to `packages/ui/src/components/index.ts`. Run tests. Commit:

```bash
git add packages/ui/src/components/Toast.tsx packages/ui/src/components/Toast.test.tsx packages/ui/src/components/index.ts apps/web/src/components/toast/ apps/web/src/components/app-providers.tsx apps/web/src/app/globals.css
git commit -m "feat(ui): add Toast notification system with 5 variants and ToastProvider

Auto-dismiss, max 3 visible, slide-in animation.
Achievement variant with gradient bg and emoji."
```

---

### Task 22: Schedule database schema

**Files:**
- Modify: `apps/web/src/lib/db/schema.ts`

**Spec reference:** Section 7.6 — DBScheduleBlock interface and Dexie table.

- [ ] **Step 1: Read current schema**

Read `apps/web/src/lib/db/schema.ts` to understand the current version and table definitions.

- [ ] **Step 2: Add DBScheduleBlock interface**

Add above the `LifeDesignDB` class:

```typescript
export interface DBScheduleBlock {
  id?: number;
  date: string;          // YYYY-MM-DD
  startTime: string;     // HH:mm
  endTime: string;       // HH:mm
  title: string;
  dimension: Dimension;
  source: 'google' | 'apple' | 'manual' | 'ai-suggested';
  calendarEventId?: string;
  confirmed: boolean;
  createdAt: Date;
}
```

- [ ] **Step 3: Add scheduleBlocks table to schema**

In the `LifeDesignDB` class:
1. Add `scheduleBlocks!: Dexie.Table<DBScheduleBlock, number>;`
2. Increment schema version (currently v3 → v4)
3. In the new version's `stores()` call, add:
```typescript
scheduleBlocks: '++id, date, dimension, source, calendarEventId'
```

- [ ] **Step 4: Verify no type errors**

Run: `pnpm tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/db/schema.ts
git commit -m "feat(db): add scheduleBlocks table for time allocation tracking"
```

---

### Task 23: Schedule dashboard widget

**Files:**
- Create: `apps/web/src/components/schedule/ScheduleWidget.tsx`

**Spec reference:** Section 7.2 — Today's Schedule header, time blocks with dimension borders, Time Allocation bars.

- [ ] **Step 1: Implement ScheduleWidget**

Create `apps/web/src/components/schedule/ScheduleWidget.tsx`:

```tsx
'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';
import { db } from '@/lib/db/schema';
import { DIMENSION_LABELS } from '@life-design/core';
import { dimensionPalettes } from '@life-design/ui';
import { BarStack, type BarSegment } from '@life-design/ui';
import { ScheduleWidgetSkeleton } from '@life-design/ui';
import { ArrowRight } from '@phosphor-icons/react';

export function ScheduleWidget() {
  const today = new Date().toISOString().split('T')[0];

  const blocks = useLiveQuery(
    () => db.scheduleBlocks.where('date').equals(today).sortBy('startTime'),
    [today],
  );

  if (!blocks) return <ScheduleWidgetSkeleton />;

  // Compute time allocation per dimension
  const allocation = new Map<string, number>();
  blocks.forEach(b => {
    const [sh, sm] = b.startTime.split(':').map(Number);
    const [eh, em] = b.endTime.split(':').map(Number);
    const hours = (eh * 60 + em - sh * 60 - sm) / 60;
    allocation.set(b.dimension, (allocation.get(b.dimension) ?? 0) + hours);
  });

  const segments: BarSegment[] = Array.from(allocation.entries())
    .map(([dimension, hours]) => ({ dimension: dimension as any, hours }))
    .sort((a, b) => b.hours - a.hours);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-700">Today&apos;s Schedule</h3>
        <Link href="/schedule" className="text-[11px] text-sage-500 font-medium flex items-center gap-1 hover:text-sage-600">
          View all <ArrowRight size={12} />
        </Link>
      </div>

      {blocks.length === 0 ? (
        <p className="text-[13px] text-stone-500 italic">No blocks scheduled today</p>
      ) : (
        <div className="space-y-2">
          {blocks.slice(0, 5).map(block => (
            <div key={block.id} className="flex items-center gap-3">
              <div
                className="w-[3px] h-8 rounded-full shrink-0"
                style={{
                  backgroundColor: dimensionPalettes[block.dimension].accent,
                  borderStyle: block.source === 'ai-suggested' ? 'dashed' : 'solid',
                  opacity: block.confirmed ? 1 : 0.7,
                }}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-[13px] text-stone-700 truncate ${!block.confirmed ? 'italic' : ''}`}>
                  {block.title}
                </p>
                <p className="text-[11px] text-stone-500">{block.startTime}–{block.endTime}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {segments.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-stone-200">
          <p className="text-[11px] text-stone-500 font-medium">Time Allocation</p>
          <BarStack segments={segments} variant="actual" />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build + commit**

Run: `pnpm --filter @life-design/web build`
Expected: Build succeeds.

```bash
git add apps/web/src/components/schedule/ScheduleWidget.tsx
git commit -m "feat(schedule): add ScheduleWidget dashboard compact view"
```

---

### Task 24: Schedule full page

**Files:**
- Create: `apps/web/src/components/schedule/DayView.tsx`
- Create: `apps/web/src/components/schedule/WeekView.tsx`
- Create: `apps/web/src/app/(protected)/schedule/page.tsx`

**Spec reference:** Section 7.3 — Day/Week toggle, vertical timeline, current time indicator.

- [ ] **Step 1: Implement DayView**

Create `apps/web/src/components/schedule/DayView.tsx`:

```tsx
'use client';

import { dimensionPalettes } from '@life-design/ui';
import { DIMENSION_LABELS } from '@life-design/core';
import type { DBScheduleBlock } from '@/lib/db/schema';

interface DayViewProps {
  blocks: DBScheduleBlock[];
  date: string;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6am–10pm

function timeToY(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return ((h - 6) * 60 + m) / (16 * 60) * 100; // % of 6am–10pm range
}

export function DayView({ blocks, date }: DayViewProps) {
  const now = new Date();
  const isToday = date === now.toISOString().split('T')[0];
  const nowY = isToday ? timeToY(`${now.getHours()}:${now.getMinutes()}`) : -1;

  return (
    <div className="relative" style={{ minHeight: '680px' }}>
      {/* Hour lines */}
      {HOURS.map(h => (
        <div key={h} className="absolute w-full flex items-center" style={{ top: `${((h - 6) / 16) * 100}%` }}>
          <span className="text-[11px] text-stone-500 w-12 shrink-0 text-right pr-3 font-mono">
            {h > 12 ? `${h - 12}pm` : h === 12 ? '12pm' : `${h}am`}
          </span>
          <div className="flex-1 border-t border-stone-200" />
        </div>
      ))}

      {/* Current time indicator */}
      {isToday && nowY >= 0 && nowY <= 100 && (
        <div className="absolute w-full flex items-center z-10" style={{ top: `${nowY}%` }}>
          <span className="text-[11px] font-bold text-[#CC3333] w-12 text-right pr-2">NOW</span>
          <div className="flex-1 border-t-2 border-[#CC3333]" />
          <div className="w-2 h-2 rounded-full bg-[#CC3333] -ml-1" />
        </div>
      )}

      {/* Schedule blocks */}
      {blocks.map(block => {
        const top = timeToY(block.startTime);
        const bottom = timeToY(block.endTime);
        const height = bottom - top;
        const palette = dimensionPalettes[block.dimension];
        return (
          <div
            key={block.id}
            className="absolute left-14 right-2 rounded-[8px] px-3 py-1.5 overflow-hidden"
            style={{
              top: `${top}%`,
              height: `${Math.max(height, 3)}%`,
              backgroundColor: palette.bg,
              borderLeft: `3px ${block.confirmed ? 'solid' : 'dashed'} ${palette.accent}`,
              opacity: block.confirmed ? 1 : 0.7,
            }}
          >
            <p className={`text-[13px] font-medium truncate ${!block.confirmed ? 'italic' : ''}`} style={{ color: palette.text }}>
              {block.title}
            </p>
            <p className="text-[11px] text-stone-500">
              {DIMENSION_LABELS[block.dimension]} · {block.startTime}–{block.endTime}
            </p>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Implement WeekView**

Create `apps/web/src/components/schedule/WeekView.tsx`:

```tsx
'use client';

import { dimensionPalettes } from '@life-design/ui';
import { BarStack, type BarSegment } from '@life-design/ui';
import type { DBScheduleBlock } from '@/lib/db/schema';
import type { Dimension } from '@life-design/core';

interface WeekViewProps {
  blocksByDate: Record<string, DBScheduleBlock[]>;
  weekDates: string[];
}

function computeSegments(blocks: DBScheduleBlock[]): BarSegment[] {
  const map = new Map<Dimension, number>();
  blocks.forEach(b => {
    const [sh, sm] = b.startTime.split(':').map(Number);
    const [eh, em] = b.endTime.split(':').map(Number);
    const hours = (eh * 60 + em - sh * 60 - sm) / 60;
    map.set(b.dimension, (map.get(b.dimension) ?? 0) + hours);
  });
  return Array.from(map.entries()).map(([dimension, hours]) => ({ dimension, hours }));
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeekView({ blocksByDate, weekDates }: WeekViewProps) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {weekDates.map((date, i) => {
        const blocks = blocksByDate[date] ?? [];
        const segments = computeSegments(blocks);
        const day = new Date(date + 'T00:00').getDate();
        const isToday = date === new Date().toISOString().split('T')[0];

        return (
          <div key={date} className="space-y-2">
            <div className="text-center">
              <p className="text-[11px] text-stone-500 font-medium">{DAYS[i]}</p>
              <p className={`text-sm font-mono font-semibold ${isToday ? 'text-sage-600' : 'text-stone-700'}`}>{day}</p>
            </div>
            <div className="space-y-1">
              {blocks.slice(0, 4).map(b => (
                <div key={b.id} className="h-1.5 rounded-full" style={{ backgroundColor: dimensionPalettes[b.dimension].accent }} />
              ))}
            </div>
            {segments.length > 0 && <BarStack segments={segments} className="h-5" />}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Create schedule page**

Create `apps/web/src/app/(protected)/schedule/page.tsx`:

```tsx
'use client';

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/schema';
import { DayView } from '@/components/schedule/DayView';
import { WeekView } from '@/components/schedule/WeekView';
import { Card } from '@life-design/ui';

type ViewMode = 'day' | 'week';

function getWeekDates(anchor: Date): string[] {
  const d = new Date(anchor);
  d.setDate(d.getDate() - d.getDay() + 1); // Monday
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    return day.toISOString().split('T')[0];
  });
}

export default function SchedulePage() {
  const [view, setView] = useState<ViewMode>('day');
  const today = new Date().toISOString().split('T')[0];
  const weekDates = useMemo(() => getWeekDates(new Date()), []);

  const allBlocks = useLiveQuery(
    () => db.scheduleBlocks.where('date').between(weekDates[0], weekDates[6], true, true).toArray(),
    [weekDates],
  );

  const todayBlocks = allBlocks?.filter(b => b.date === today).sort((a, b) => a.startTime.localeCompare(b.startTime)) ?? [];

  const blocksByDate: Record<string, typeof todayBlocks> = {};
  allBlocks?.forEach(b => {
    (blocksByDate[b.date] ??= []).push(b);
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-stone-900">Schedule</h1>
        <div className="flex bg-stone-100 rounded-[8px] p-0.5">
          {(['day', 'week'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 text-[13px] font-medium rounded-[6px] transition-all ${
                view === v ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <Card>
        {view === 'day' ? (
          <DayView blocks={todayBlocks} date={today} />
        ) : (
          <WeekView blocksByDate={blocksByDate} weekDates={weekDates} />
        )}
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Verify build + commit**

Run: `pnpm --filter @life-design/web build`
Expected: Build succeeds. `/schedule` route is listed in the output.

```bash
git add apps/web/src/components/schedule/ apps/web/src/app/(protected)/schedule/
git commit -m "feat(schedule): add full Schedule page with DayView and WeekView

Vertical timeline, current time indicator, day/week toggle.
Dimension-colored blocks with confirmed/suggested visual differentiation."
```

---

## Chunk 5: Page Migrations

Migrate existing pages from hardcoded hex values and ad-hoc components to the new design system tokens and components. Each migration follows the same pattern: read the page, replace old components/colors/classes, verify build, commit.

**Important context for all migration tasks:**
- Replace `bg-[#FAFAF8]` → `bg-surface-page` or `bg-stone-50`
- Replace `text-[#2A2623]` → `text-text-primary` or `text-stone-800`
- Replace `text-[#7D756A]` → `text-stone-500` (was `text-[#A8A198]` or `text-[#7D756A]`)
- Replace `text-[#5C554C]` → `text-stone-600`
- Replace `border-[#E8E4DD]` → `border-stone-200`
- Replace `bg-[#F5F3EF]` → `bg-stone-100`
- Replace `GlassCard` → `Card` (default variant)
- Replace `StatCard` → `Card` (dimension variant)
- Replace `ScoreRing` → `ProgressRing`
- Replace `DimensionBadge` → `Badge` (with dimension-appropriate variant)
- Replace `SectionHeader` → direct heading with `font-serif text-xl text-stone-800`
- Replace `TrendIndicator` → `Sparkline` + `Badge`
- Replace `glass-card` class → `Card` component
- Replace hardcoded `shadow-*` → elevation token classes
- Replace `rounded-[2rem]` → `rounded-[16px]` or `rounded-[20px]` per component spec
- All `lucide-react` icon imports → `@phosphor-icons/react` equivalent with `weight="regular"`
- **Before each task:** Grep the page for `#` hex values, `glass`, `lucide`, old design-system imports to find all spots needing migration.

### Task 25: Dashboard page migration

**Files:**
- Modify: `apps/web/src/app/(protected)/dashboard/page.tsx`
- Modify: `apps/web/src/components/dashboard/wheel-of-life.tsx`
- Modify: `apps/web/src/components/dashboard/correlation-cards.tsx`
- Modify: `apps/web/src/components/dashboard/trend-sparkline.tsx`
- Modify: `apps/web/src/components/dashboard/streak-counter.tsx`
- Modify: `apps/web/src/components/dashboard/DashboardInsightsFeed.tsx`

- [ ] **Step 1: Read all dashboard files**

Read each file to identify all hardcoded hex values, old component imports, and glass utilities.

- [ ] **Step 2: Migrate dashboard page**

In `dashboard/page.tsx`:
- Replace `GlassCard`/`glass-card` with `Card`
- Replace `ScoreRing` with `ProgressRing`
- Replace hardcoded colors with token classes
- Add `ScheduleWidget` to the dashboard sidebar area
- Import new components from `@life-design/ui`

- [ ] **Step 3: Replace wheel-of-life.tsx**

If using Recharts RadarChart, replace with the new custom `RadarChart` from `@life-design/ui`. Pass `scores` from the dashboard data. Delete the old Recharts-based implementation.

- [ ] **Step 4: Migrate sparkline and trend components**

In `trend-sparkline.tsx`:
- Replace with `Sparkline` from `@life-design/ui`
- Pass dimension and data array

In `correlation-cards.tsx`:
- Replace with `Heatmap` from `@life-design/ui` or use `Card` (dimension variant) for individual correlation displays

In `streak-counter.tsx`:
- Replace hardcoded colors with token classes
- Replace any lucide icons with Phosphor

In `DashboardInsightsFeed.tsx`:
- Replace `InsightCardDS` / `InsightCard` with `Card` + content layout
- Replace colors with semantic tokens

- [ ] **Step 5: Verify build + visual check + commit**

Run: `pnpm --filter @life-design/web build`
Expected: Build succeeds.

Run: `pnpm --filter @life-design/web dev` → navigate to `/dashboard` → verify visual correctness.

```bash
git add apps/web/src/app/(protected)/dashboard/ apps/web/src/components/dashboard/
git commit -m "feat(dashboard): migrate to design system tokens and components

Replace GlassCard→Card, ScoreRing→ProgressRing, add ScheduleWidget.
All hex values replaced with Tailwind token classes."
```

---

### Task 26: Check-in page migration

**Files:**
- Modify: `apps/web/src/app/(protected)/checkin/checkin-client.tsx`
- Modify: `apps/web/src/components/checkin/checkin-form.tsx`
- Modify: `apps/web/src/components/checkin/dimension-card.tsx`
- Modify: `apps/web/src/components/checkin/mood-slider.tsx`
- Modify: `apps/web/src/components/checkin/journal-preview.tsx`

- [ ] **Step 1: Read all checkin files, identify hardcoded values**
- [ ] **Step 2: Migrate components**

Replace in all checkin files:
- Hardcoded hex colors → Tailwind token classes
- `glass-card` → `Card` component
- Dimension-specific colors → use `dimensionPalettes[dim].accent/text/bg`
- Form inputs → `Input`, `Textarea`, `FormField` from `@life-design/ui`
- Buttons → `Button` from `@life-design/ui`
- Icons → Phosphor equivalents

- [ ] **Step 3: Verify build + commit**

```bash
git add apps/web/src/app/(protected)/checkin/ apps/web/src/components/checkin/
git commit -m "feat(checkin): migrate to design system tokens and components"
```

---

### Task 27: Goals pages migration

**Files:**
- Modify: `apps/web/src/app/(protected)/goals/page.tsx`
- Modify: `apps/web/src/app/(protected)/goals/new/page.tsx`
- Modify: `apps/web/src/app/(protected)/goals/[goalId]/page.tsx`
- Modify: `apps/web/src/app/(protected)/goals/[goalId]/goal-detail-client.tsx`
- Modify: `apps/web/src/components/goals/goal-card.tsx`
- Modify: `apps/web/src/components/goals/goal-form.tsx`
- Modify: `apps/web/src/components/goals/scenario-comparison.tsx`

- [ ] **Step 1: Read all goals files, identify hardcoded values**
- [ ] **Step 2: Migrate components**

Same pattern: hex→tokens, glass→Card, old components→new, lucide→Phosphor, inputs→FormField+Input, buttons→Button.

- [ ] **Step 3: Verify build + commit**

```bash
git add apps/web/src/app/(protected)/goals/ apps/web/src/components/goals/
git commit -m "feat(goals): migrate to design system tokens and components"
```

---

### Task 28: Remaining pages migration

**Files to migrate (one commit per logical group):**

**Group A — Mentor + Insights:**
- `apps/web/src/app/(protected)/mentor/mentor-client.tsx`
- `apps/web/src/components/mentor/*.tsx`
- `apps/web/src/app/(protected)/insights/insights-client.tsx`
- `apps/web/src/components/insights/insight-card.tsx`

**Group B — Simulator + Challenges + Achievements:**
- `apps/web/src/app/(protected)/simulator/page.tsx`
- `apps/web/src/components/simulator/life-simulator.tsx`
- `apps/web/src/app/(protected)/challenges/page.tsx`
- `apps/web/src/components/challenges/*.tsx`
- `apps/web/src/app/(protected)/achievements/page.tsx`
- `apps/web/src/components/achievements/*.tsx`

**Group C — Settings + Profile + Other:**
- `apps/web/src/app/(protected)/settings/settings-client.tsx`
- `apps/web/src/components/settings/*.tsx`
- `apps/web/src/app/(protected)/profile/page.tsx`
- `apps/web/src/app/(protected)/correlations/page.tsx`
- `apps/web/src/app/(protected)/dimensions/[dimension]/*.tsx`

- [ ] **Step 1: Migrate Group A — Mentor + Insights**

Read files, replace hex→tokens, glass→Card, old components→new, icons→Phosphor. Commit:

```bash
git commit -m "feat(mentor/insights): migrate to design system"
```

- [ ] **Step 2: Migrate Group B — Simulator + Challenges + Achievements**

Same pattern. Commit:

```bash
git commit -m "feat(simulator/challenges/achievements): migrate to design system"
```

- [ ] **Step 3: Migrate Group C — Settings + Profile + Other**

Same pattern. Commit:

```bash
git commit -m "feat(settings/profile): migrate to design system"
```

- [ ] **Step 4: Migrate NudgeCard**

Read `apps/web/src/components/nudge/NudgeCard.tsx`. Redesign per spec section 8.2:
- Fixed bottom-right, z-45, max-w-sm
- Elevation-3, radius-xl
- Type badge using caption token
- Dimension badge if applicable
- "Got it" secondary button + "Talk to mentor" primary button
- Slide-in from bottom animation

Commit:

```bash
git commit -m "feat(nudge): redesign NudgeCard with design system tokens"
```

- [ ] **Step 5: Full build verification**

Run: `pnpm --filter @life-design/web build`
Expected: Build succeeds with all pages.

---

## Chunk 6: Onboarding, Storybook, and Cleanup

### Task 29: Onboarding flow redesign

**Files:**
- Modify: `apps/web/src/app/(protected)/onboarding/page.tsx`
- Modify: `apps/web/src/components/onboarding/flow-state.tsx`
- Modify: `apps/web/src/components/onboarding/step-dots.tsx`
- Modify: `apps/web/src/components/onboarding/glass-container.tsx`

**Spec reference:** Section 10 — 5-step wizard, centered card, step indicator dots, calendar connect step.

- [ ] **Step 1: Read all onboarding files**

Read each file to understand current flow structure.

- [ ] **Step 2: Redesign step indicator**

In `step-dots.tsx`, replace with spec's horizontal dots pattern:
- Done: `bg-sage-500 rounded-full w-2 h-2`
- Active: `bg-sage-600 rounded-full w-6 h-2` (wider pill)
- Pending: `bg-stone-200 rounded-full w-2 h-2`

- [ ] **Step 3: Replace glass-container**

In `glass-container.tsx`, replace glass morphism with:
- `max-w-lg mx-auto bg-white rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.06)] p-8`
- This matches Card (raised variant) with radius-xl

- [ ] **Step 4: Migrate form elements**

Replace all form inputs with `Input`, `Textarea`, `FormField` from `@life-design/ui`.
Replace all buttons with `Button` from `@life-design/ui`.
Replace dimension selection cards with `Card` (dimension variant) with `hoverable`.

- [ ] **Step 5: Add Calendar Connect step**

If not already present, add step 4 "Calendar Connect" to the onboarding flow:
- Google Calendar OAuth button (primary)
- Apple Calendar button (secondary)
- "Skip" ghost button

This step only needs the UI — the actual OAuth integration is a separate spec.

- [ ] **Step 6: Verify build + commit**

```bash
git add apps/web/src/app/(protected)/onboarding/ apps/web/src/components/onboarding/
git commit -m "feat(onboarding): redesign with design system tokens and step indicator

5-step wizard, centered cards, dimension selection, calendar connect placeholder."
```

---

### Task 30: Storybook setup

**Files:**
- Create: `packages/ui/.storybook/main.ts`
- Create: `packages/ui/.storybook/preview.ts`
- Create: `packages/ui/src/stories/Button.stories.tsx`
- Create: `packages/ui/src/stories/Card.stories.tsx`
- Create: `packages/ui/src/stories/Badge.stories.tsx`
- Create: `packages/ui/src/stories/Input.stories.tsx`
- Create: `packages/ui/src/stories/Toast.stories.tsx`
- Create: `packages/ui/src/stories/Modal.stories.tsx`
- Create: `packages/ui/src/stories/RadarChart.stories.tsx`
- Create: `packages/ui/src/stories/ProgressRing.stories.tsx`
- Modify: `packages/ui/package.json`

**Spec reference:** Section 11 — Storybook 8, a11y addon.

- [ ] **Step 1: Install Storybook**

```bash
cd /c/Users/Aaron/life-design/packages/ui && npx storybook@latest init --type react --builder vite --skip-install
pnpm --filter @life-design/ui add -D @storybook/addon-a11y
```

- [ ] **Step 2: Configure main.ts**

Create `packages/ui/.storybook/main.ts`:

```typescript
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
  ],
  framework: '@storybook/react-vite',
};

export default config;
```

- [ ] **Step 3: Configure preview.ts**

Create `packages/ui/.storybook/preview.ts`:

```typescript
import type { Preview } from '@storybook/react';
import '../../../apps/web/src/app/globals.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#FAFAF8' },
        { name: 'dark', value: '#1A1816' },
        { name: 'white', value: '#FFFFFF' },
      ],
    },
  },
};

export default preview;
```

- [ ] **Step 4: Write core component stories**

Create `packages/ui/src/stories/Button.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../components/Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'destructive'] },
    size: { control: 'select', options: ['sm', 'default', 'lg'] },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { children: 'Primary Button', variant: 'primary' } };
export const Secondary: Story = { args: { children: 'Secondary', variant: 'secondary' } };
export const Ghost: Story = { args: { children: 'Ghost', variant: 'ghost' } };
export const Destructive: Story = { args: { children: 'Delete', variant: 'destructive' } };
export const Loading: Story = { args: { children: 'Saving...', loading: true } };
export const Small: Story = { args: { children: 'Small', size: 'sm' } };
export const Large: Story = { args: { children: 'Large', size: 'lg' } };
```

Create similar stories for Card, Badge, Input, Toast, Modal, RadarChart, ProgressRing — each with all variants as separate story exports.

- [ ] **Step 5: Add Storybook scripts to package.json**

In `packages/ui/package.json`:
```json
"storybook": "storybook dev -p 6006",
"build-storybook": "storybook build"
```

- [ ] **Step 6: Verify Storybook builds**

Run: `pnpm --filter @life-design/ui build-storybook`
Expected: Build succeeds with zero a11y violations.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/.storybook/ packages/ui/src/stories/ packages/ui/package.json pnpm-lock.yaml
git commit -m "feat(storybook): set up Storybook 8 with a11y addon and component stories"
```

---

### Task 31: Contrast audit + cleanup pass

**Files:**
- Possibly modify: any file found with contrast issues
- Delete: old design-system components after migration confirmed

- [ ] **Step 1: Automated contrast grep**

Search the entire `apps/web/src` for any remaining hardcoded hex values:

```bash
grep -rn '#[A-Fa-f0-9]\{6\}' apps/web/src/ --include='*.tsx' --include='*.ts' | grep -v 'node_modules\|.test.\|__mocks__'
```

For each found:
- If it's a design token color → replace with Tailwind token class
- If it's a one-off color with no token → check if it should be a token, or if it's used for an SVG/chart/external purpose

- [ ] **Step 2: Check minimum text size**

Search for any text below 11px:

```bash
grep -rn 'text-\[9px\]\|text-\[10px\]\|text-\[8px\]\|font-size:\s*[89]px\|font-size:\s*10px' apps/web/src/ --include='*.tsx' --include='*.css'
```

Replace any violations with minimum 11px (`text-[11px]` or `caption` token).

- [ ] **Step 3: Check banned color combinations**

Search for `stone-400`, `sage-300`, `warm-300`, `accent-400` used as text color:

```bash
grep -rn 'text-stone-400\|text-sage-300\|text-warm-300\|text-accent-400' apps/web/src/ --include='*.tsx'
```

Replace with AA-compliant alternatives (stone-500, sage-500, warm-500, accent-600).

- [ ] **Step 4: Remove deprecated old components**

After confirming no remaining imports:

```bash
grep -rn 'GlassCard\|StatCard\|ScoreRing\|DimensionBadge\|SectionHeader\|TrendIndicator\|InsightCardDS' apps/web/src/ --include='*.tsx' --include='*.ts'
```

If grep returns empty (no more usage), delete:
- `packages/ui/src/design-system/GlassCard.tsx`
- `packages/ui/src/design-system/StatCard.tsx`
- `packages/ui/src/design-system/ScoreRing.tsx`
- `packages/ui/src/design-system/DimensionBadge.tsx`
- `packages/ui/src/design-system/SectionHeader.tsx`
- `packages/ui/src/design-system/TrendIndicator.tsx`
- `packages/ui/src/design-system/InsightCard.tsx`

Update `packages/ui/src/design-system/index.ts` to remove their exports.

- [ ] **Step 5: Remove old token files**

Delete `packages/ui/src/design-system/tokens.ts` (the old Cabinet Grotesk/glass system).
Update `packages/ui/src/design-system/index.ts` to remove token exports.
Remove the compatibility shim in `packages/ui/src/tokens.ts` if no code references the deprecated exports.

- [ ] **Step 6: Run full test suite**

Run: `pnpm test` (all packages)
Expected: All tests pass.

Run: `pnpm tsc --noEmit`
Expected: No type errors.

- [ ] **Step 7: Production build verification**

Run: `pnpm --filter @life-design/web build`
Expected: Build succeeds. Check route list includes all pages including `/schedule`.

- [ ] **Step 8: Commit**

```bash
git add packages/ui/src/design-system/ packages/ui/src/tokens.ts packages/ui/src/index.ts apps/web/src/
git commit -m "chore: contrast audit, remove deprecated components, cleanup

Remove old GlassCard/StatCard/ScoreRing/DimensionBadge/TrendIndicator.
Delete legacy design-system token files.
Fix remaining contrast and minimum text size violations."
```

---

## Verification Checklist

After all tasks are complete, verify against spec acceptance criteria:

- [ ] Every text/foreground color passes WCAG AA (4.5:1) against its background
- [ ] All interactive elements have visible focus indicators (3:1 minimum)
- [ ] No text below 11px anywhere in the app
- [ ] All components use tokens — no hardcoded hex values in page files
- [ ] Storybook builds with zero accessibility violations
- [ ] `pnpm tsc --noEmit` passes with zero errors
- [ ] All existing tests continue to pass
- [ ] Production build succeeds
- [ ] Schedule widget displays on dashboard with sample data
- [ ] `/schedule` page renders day and week views
- [ ] Toast notifications work for check-in save, achievement, and warning scenarios
- [ ] Onboarding flow completes end-to-end with step indicator
