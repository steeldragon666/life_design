# Opt In — UI/UX Upgrade Plan

**Date:** 2026-04-11
**Methodology:** Sovereign Design System (Tier 1) + UI UX Pro Max + Frontend Design Principles
**Status:** Research & Planning Complete — Ready for Implementation

---

## 1. Design Direction: Organic Intelligence

**Chosen aesthetic pole:** Organic Intelligence
> Soft curves, warm neutrals, biomorphic shapes, tactile feel — for health, wellness, productivity, AI assistants.

This is the clear fit for Opt In. The app is a life-design platform that helps users reflect, track, and grow across 8 life dimensions. The UI should feel like a calm, intelligent companion — not a corporate dashboard or a flashy consumer app.

**Emotional register:** Grounded calm. Quiet confidence. Warm intelligence.
**Target audience:** Reflective adults (25-55) seeking intentional life improvement.
**Industry context:** Wellness/productivity/AI assistant hybrid.

---

## 2. Current State Audit

### What Works Well

| Element | Assessment |
|---------|-----------|
| **Color foundation** | Stone/sage palette is excellent — warm, organic, differentiated |
| **Typography choices** | DM Sans + Instrument Serif is a strong pairing (humanist sans + elegant serif) |
| **Design token system** | Comprehensive `@theme` block with semantic layers (surfaces, text, borders, interactive) |
| **Dimension colors** | 8-color system with AA-safe text variants and soft backgrounds — thoughtful |
| **Spacing/radius** | 4px grid, generous radii (8-20px) — matches organic aesthetic |
| **Glass utilities** | Well-implemented glassmorphism with proper vendor prefixes |
| **Motion library** | Rich animation set (fadeUp, float, breathe, badgeReveal, mentorSpeaking) |
| **Noise texture** | Subtle SVG noise overlay adds tactile warmth |

### What Needs Work

| Issue | Severity | Location |
|-------|----------|----------|
| **Hardcoded hex colors** | High | Components use `from-[#9BB89B]`, `bg-[#F0EDE8]` instead of tokens |
| **No shared component library** | High | `packages/ui/src/` is empty — every component is bespoke |
| **No dark mode** | Medium | Single theme only, no `prefers-color-scheme` support |
| **Missing cursor-pointer** | Medium | Interactive cards/buttons lack `cursor-pointer` class |
| **Inline SVG icons** | Medium | Icons are hardcoded inline SVGs, no icon system |
| **No component consistency** | Medium | Each onboarding card has different layout/spacing patterns |
| **Limited responsive testing** | Medium | Mobile-first but no breakpoint-specific refinements |
| **Glass-dark misleading** | Low | `glass-dark` is actually a *more opaque* light glass, not dark mode |
| **Stagger classes limited** | Low | Only 5 stagger delays (0.1-0.5s), could be generated |
| **No focus ring styles** | Low | Default browser focus, no custom accessible focus states |
| **scrollbar-thumb hardcoded** | Low | Uses hex `#D4CFC5` instead of `var(--color-stone-300)` |

---

## 3. Design System Foundation (Locked)

### Color System — Evolve, Don't Replace

The existing stone/sage palette is genuinely good. The upgrade should **refine and extend**, not replace.

```
CANVAS:
  Page background:     --color-surface-page     (#FAFAF8) ✅ Keep
  Card surface:        --color-surface-raised    (#FFFFFF) ✅ Keep
  Sunken surface:      --color-surface-sunken    (#F5F3EF) ✅ Keep

PRIMARY (Sage):
  Interactive:         --color-sage-500          (#5A7F5A) ✅ Keep
  Hover:               --color-sage-600          (#476447) ✅ Keep
  Subtle:              --color-sage-100          (#E4ECE4) ✅ Keep

ACCENT — NEW: Warm Gold (replace current warm-orange for CTAs)
  CTA accent:          #C49A3C (warm gold — more refined than orange)
  CTA hover:           #A8832F
  CTA subtle:          #FDF8EE

NEUTRALS (Stone):
  Full scale ✅ Keep as-is (stone-50 through stone-900)

STATUS:
  Success:             --color-sage-500   (green already in palette)
  Warning:             --color-warm-400   (#D4864A)
  Error:               --color-destructive (#CC3333) ✅ Keep
  Info:                --color-accent-500 (#5E9BC4) ✅ Keep

DARK MODE — NEW:
  Page background:     #1A1816 (stone-900)
  Card surface:        #2A2623 (stone-800)
  Sunken surface:      #1A1816
  Text primary:        #F5F3EF (stone-100)
  Text secondary:      #A8A198 (stone-400)
  Border:              rgba(232, 228, 221, 0.1)
```

### Typography — Keep + Refine

```
DISPLAY:    Instrument Serif   ✅ Keep — elegant, characterful
BODY:       DM Sans            ✅ Keep — excellent humanist sans
MONOSPACE:  DM Mono            ✅ Keep — matches DM Sans family

SCALE (refine from current):
  Display:   text-4xl (36px) / leading-tight / font-serif
  Heading:   text-2xl (24px) / leading-snug / font-serif
  Subhead:   text-lg (18px) / leading-relaxed / font-sans / font-medium
  Body:      text-base (16px) / leading-relaxed / font-sans
  Caption:   text-sm (14px) / leading-normal / font-sans / text-muted
  Micro:     text-xs (12px) / leading-tight / font-sans / text-muted

LINE LENGTH: max-w-prose (65ch) for body text — currently unconstrained
```

### Motion — Refine + Add Orchestration

```
ENTRY:
  Page mount:          fadeUp 600ms ease-out (✅ exists)
  Stagger cascade:     50ms increments (currently 100ms — tighten)
  Card enter:          cardSlideIn 400ms spring (✅ exists)

INTERACTION:
  Hover lift:          translate-y -2px + elevation-2 shadow (NEW)
  Press depth:         scale(0.98) 100ms (NEW)
  Toggle:              150ms ease-out (✅ --transition-fast)
  Focus ring:          ring-2 ring-sage-300 ring-offset-2 (NEW)

AMBIENT:
  Breathe:             4s ease-in-out infinite (✅ exists)
  Float:               6s ease-in-out infinite (✅ exists)

RESPECT:
  prefers-reduced-motion: disable all non-essential animations (NEW — CRITICAL)
```

### Spatial System

```
BASE UNIT: 4px ✅ Keep
LAYOUT:    Centered single-column for onboarding, sidebar+main for dashboard
DENSITY:   Airy — generous padding (p-6 to p-8 on cards), relaxed line-height
MAX WIDTH: max-w-lg (512px) for wizard, max-w-4xl for dashboard, max-w-6xl for settings
```

---

## 4. Component Library Architecture

### Tier 1: Foundational Primitives (packages/ui)

Build a shared component library in `packages/ui/src/` that both `apps/web` and `apps/mobile` can consume.

```
packages/ui/src/
├── primitives/
│   ├── button.tsx          # Primary, secondary, ghost, destructive variants
│   ├── card.tsx            # Surface, glass, dimension-colored variants
│   ├── input.tsx           # Text, number, textarea with label + error
│   ├── select.tsx          # Single + multi-select with search
│   ├── slider.tsx          # Range slider (for Likert scales)
│   ├── badge.tsx           # Status, dimension, streak badges
│   ├── avatar.tsx          # User + mentor avatars with status ring
│   ├── icon.tsx            # Icon wrapper (Lucide integration)
│   ├── skeleton.tsx        # Loading skeletons
│   └── separator.tsx       # Horizontal/vertical dividers
├── feedback/
│   ├── toast.tsx           # Success/error/info notifications
│   ├── progress-bar.tsx    # Linear + circular progress
│   ├── empty-state.tsx     # Illustrated empty states
│   └── error-boundary.tsx  # Graceful error display
├── layout/
│   ├── page-shell.tsx      # Page wrapper with nav + main
│   ├── section.tsx         # Content section with optional heading
│   ├── stack.tsx           # Vertical/horizontal stack with gap
│   └── container.tsx       # Max-width centered container
├── data-display/
│   ├── stat-card.tsx       # Metric display with trend indicator
│   ├── dimension-card.tsx  # Life dimension score card
│   ├── sparkline.tsx       # Inline trend chart
│   └── wheel-chart.tsx     # Wheel of life radar chart
└── index.ts                # Barrel exports
```

### Tier 2: Feature Components (apps/web/src/components)

Composed from primitives, specific to web app features:

```
components/
├── onboarding/
│   ├── wizard-shell.tsx        # Shared layout for all wizard phases
│   ├── question-card.tsx       # Standardized question presentation
│   └── cards/                  # Onboarding info cards (refactored)
├── dashboard/
│   ├── dashboard-shell.tsx     # Dashboard layout with sidebar
│   ├── dimension-grid.tsx      # 8-dimension overview grid
│   ├── daily-pulse.tsx         # Today's check-in prompt
│   └── insight-feed.tsx        # AI-generated insights stream
├── mentor/
│   ├── mentor-avatar.tsx       # Animated mentor with speaking state
│   ├── chat-bubble.tsx         # Message bubble with typing indicator
│   └── mentor-panel.tsx        # Full mentor interaction panel
└── shared/
    ├── nav-bar.tsx             # Top navigation
    ├── bottom-nav.tsx          # Mobile bottom navigation
    └── theme-toggle.tsx        # Light/dark mode switch
```

---

## 5. Upgrade Roadmap

### Phase 1: Foundation (1-2 weeks)

**Goal:** Establish the design system infrastructure without changing user-facing UI.

1. **Create `packages/ui` package**
   - Set up package.json, tsconfig, Tailwind config
   - Build 5 foundational primitives: Button, Card, Input, Badge, Skeleton
   - Add Storybook for component development and documentation

2. **Fix design token hygiene**
   - Replace all hardcoded hex values in components with Tailwind token classes
   - Remove `from-[#9BB89B]` patterns → `from-sage-300`
   - Add `cursor-pointer` to all interactive elements
   - Replace scrollbar hardcoded hex with CSS variable

3. **Add accessibility foundations**
   - Custom focus ring styles (sage-colored, visible on both light/dark)
   - `prefers-reduced-motion` media query to disable animations
   - Verify all buttons have accessible names
   - Add `aria-label` to icon-only buttons

4. **Icon system**
   - Install Lucide React (tree-shakeable, consistent, MIT)
   - Replace inline SVGs with Lucide components
   - Create Icon wrapper component for consistent sizing

### Phase 2: Dark Mode + Polish (1-2 weeks)

**Goal:** Ship dark mode and elevate the existing light theme.

1. **Dark mode implementation**
   - Add CSS custom properties for dark palette (stone-900 canvas, stone-800 cards)
   - Use `@media (prefers-color-scheme: dark)` + manual toggle
   - Update glass utilities for dark mode (darker blur, lighter borders)
   - Test all dimension colors for contrast in dark mode

2. **Motion refinement**
   - Tighten stagger delays to 50ms increments
   - Add hover lift effect (translateY -2px + shadow transition)
   - Add press depth effect (scale 0.98)
   - Generate stagger classes dynamically (stagger-1 through stagger-12)

3. **Glass card system upgrade**
   - Rename `glass-dark` → `glass-opaque` (semantic clarity)
   - Add `glass-dim-{dimension}` variants with dimension color tinting
   - Ensure glass cards are usable in both light and dark modes

4. **Typography polish**
   - Add `max-w-prose` to all body text containers
   - Ensure consistent heading hierarchy across all pages
   - Add letter-spacing refinements for headings (slightly tighter)

### Phase 3: Component Migration (2-3 weeks)

**Goal:** Replace bespoke components with shared library components.

1. **Onboarding flow refactor**
   - Extract shared `WizardShell` layout (progress bar + navigation + content area)
   - Standardize all 8 onboarding cards to use shared Card + Button components
   - Ensure consistent padding, animation, and interaction patterns

2. **Dashboard components**
   - Build DimensionCard component (used across dashboard, insights, goals)
   - Build StatCard for metric display
   - Refactor Wheel of Life to use shared chart primitives
   - Build InsightCard for AI-generated insights

3. **Mentor UI upgrade**
   - Refine mentor avatar with dimension-colored status rings
   - Add typing indicator animation
   - Build chat interface with proper message bubbles

### Phase 4: Signature Moments (1 week)

**Goal:** Add the memorable design elements that make Opt In feel premium.

1. **Onboarding completion celebration**
   - Orchestrated reveal: profile summary cards appear in staggered cascade
   - Wheel of Life animates from zero to scored state
   - Subtle confetti with dimension colors (not generic)

2. **Daily check-in ritual**
   - Breathing animation synced with "How are you feeling?" prompt
   - Smooth slider with haptic-like visual feedback
   - Completion celebration (streak counter increment with spring animation)

3. **Dashboard ambient life**
   - Life Orb with subtle breathing animation reflecting overall score
   - Dimension cards with micro-interaction on hover (slight tilt + glow)
   - Insight cards that slide in as they're generated

4. **Page transitions**
   - Smooth cross-fade between pages (Next.js App Router + CSS transitions)
   - Maintain scroll position on back navigation
   - Loading skeletons that match the actual content layout

---

## 6. Anti-Patterns to Avoid

| Anti-Pattern | Why It's Wrong for Opt In |
|---|---|
| Purple gradients on white | Generic AI aesthetic, not organic/wellness |
| System fonts (Inter, Roboto) | We have DM Sans + Instrument Serif — use them |
| Aggressive hover scales | Causes layout shift, feels frantic not calm |
| Neon accent colors | Breaks the warm, natural palette |
| Dense data tables | This isn't enterprise software — use cards and visualizations |
| Cookie-cutter shadcn defaults | We need warmth and character, not sterile utility |
| Emoji as icons | Use SVG (Lucide) — emojis are inconsistent across platforms |
| Flat/boring loading states | Use skeleton screens that mirror content layout |

---

## 7. Technical Implementation Notes

### Tailwind v4 Compatibility

The project uses Tailwind CSS v4 with `@import "tailwindcss"` and `@theme` blocks. New design tokens should be added to the existing `@theme` block, NOT as separate CSS custom properties. This ensures they work with Tailwind's utility class generation.

```css
/* In globals.css @theme block — add these for dark mode */
--color-dark-surface-page: #1A1816;
--color-dark-surface-raised: #2A2623;
--color-dark-text-primary: #F5F3EF;
--color-dark-text-secondary: #A8A198;
--color-dark-border-default: rgba(232, 228, 221, 0.1);
```

### packages/ui Setup

```json
{
  "name": "@life-design/ui",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "dependencies": {
    "lucide-react": "^0.400.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  }
}
```

Use `class-variance-authority` (CVA) for component variants — it's the industry standard for building typed Tailwind component APIs and works perfectly with the existing token system.

### Component API Pattern

Every shared component should follow this pattern:

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-300 focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        primary: 'bg-sage-500 text-white hover:bg-sage-600 active:scale-[0.98]',
        secondary: 'bg-stone-100 text-stone-800 hover:bg-stone-200',
        ghost: 'text-stone-600 hover:bg-stone-100',
        destructive: 'bg-destructive text-white hover:bg-red-700',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
```

---

## 8. Success Criteria

### Design Gate
- [ ] All components use design tokens — zero hardcoded hex values
- [ ] Typography uses Instrument Serif (headings) and DM Sans (body) consistently
- [ ] Color system applied via CSS variables / Tailwind tokens
- [ ] Every element has intentional sizing, positioning, and color
- [ ] Dark mode works across all pages

### Production Gate
- [ ] All shared components are TypeScript with proper prop interfaces
- [ ] Responsive across 375px, 768px, 1024px, 1440px
- [ ] `prefers-reduced-motion` respected for all animations
- [ ] Lucide icons used consistently (no inline SVGs)
- [ ] No console errors or TypeScript errors

### Experience Gate
- [ ] First impression feels premium — like a $50K design agency delivered it
- [ ] At least one signature moment per user flow (onboarding celebration, check-in ritual)
- [ ] Motion feels earned and purposeful, not decorative
- [ ] Information hierarchy guides the eye correctly
- [ ] A sophisticated user would feel proud to use this

---

## 9. Estimated Effort

| Phase | Duration | Complexity |
|-------|----------|-----------|
| Phase 1: Foundation | 1-2 weeks | Medium — infrastructure + token cleanup |
| Phase 2: Dark Mode + Polish | 1-2 weeks | Medium — CSS custom properties + testing |
| Phase 3: Component Migration | 2-3 weeks | High — systematic refactor of all pages |
| Phase 4: Signature Moments | 1 week | Medium — animation + delight work |
| **Total** | **5-8 weeks** | |

Phase 1 and 2 can partially overlap. Phase 3 is the largest chunk — it touches every component in the app. Phase 4 is the fun part.
