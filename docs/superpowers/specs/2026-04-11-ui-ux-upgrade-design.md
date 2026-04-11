# Opt In — UI/UX Upgrade Design Spec

**Date:** 2026-04-11
**Status:** Approved
**Approach:** Library-First (Approach 1)

---

## 1. Design Direction

**Aesthetic:** Organic Intelligence — soft curves, warm neutrals, biomorphic shapes, tactile feel.

**Emotional register:** Grounded calm. Quiet confidence. Warm intelligence.

**Target audience:** Reflective adults (25-55) seeking intentional life improvement.

---

## 2. Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `packages/ui` scope | Web-only (Tailwind + CVA) | Mobile (React Native) can't consume Tailwind classes; build mobile components separately when needed |
| Storybook | Full with interaction tests (play functions) | Doubles as component test suite |
| Accent color | Keep warm orange `#D4864A` | Existing palette works; no change needed |
| Dark mode | Deferred to future phase | Cuts scope; ship light theme perfectly first |
| Active component directories | All 30+ are in use | Full library required |
| Build order | Bottom-up primitives first | Build library, then migrate all flows in parallel |
| Implementation strategy | Library-First (Approach 1) | Clean foundation before any migration |
| Icon system | Lucide only | Tree-shakeable, consistent, MIT; no icon font or sprite sheet |
| `packages/ui` contents | Primitives + feature components | Single package for everything |
| Feature component pattern | Smart/dumb split | `component.tsx` (UI, props) + `component.connected.tsx` (data wiring) |

---

## 3. Design Token System

### Palette — No Changes

The existing palette is locked:

- **Stone** (50-900): Neutrals
- **Sage** (50-600): Primary / interactive
- **Warm** (50-600): Secondary / accent CTAs
- **Accent** (400-600): Soft blue / info
- **Dimension colors**: 8 sets with AA-safe text variants and soft backgrounds
- **Semantic tokens**: Surfaces (page, raised, sunken), text (primary, secondary, muted, inverse), borders (default, subtle), interactive (primary, hover, destructive)

### New Tokens

Add to `globals.css` `@theme` block:

```css
--color-interactive-active: #3D5A3D;   /* sage-700 equivalent — pressed state */
--color-focus-ring: #9BB89B;            /* sage-300 — visible on both light backgrounds */
```

### Token Hygiene

- Replace ALL hardcoded hex values in components with Tailwind token classes
- `from-[#9BB89B]` → `from-sage-300`
- `bg-[#F0EDE8]` → `bg-stone-100`
- Add `cursor-pointer` to every interactive element
- Update scrollbar thumb from `#D4CFC5` to `var(--color-stone-300)`

---

## 4. Typography

### Fonts — No Changes

- **Display/Headings:** Instrument Serif
- **Body:** DM Sans
- **Monospace:** DM Mono

### Type Scale

| Level | Size | Leading | Font | Weight |
|-------|------|---------|------|--------|
| Display | text-4xl (36px) | leading-tight | font-serif | normal |
| Heading | text-2xl (24px) | leading-snug | font-serif | normal |
| Subhead | text-lg (18px) | leading-relaxed | font-sans | medium |
| Body | text-base (16px) | leading-relaxed | font-sans | normal |
| Caption | text-sm (14px) | leading-normal | font-sans | normal |
| Micro | text-xs (12px) | leading-tight | font-sans | normal |

### Refinements

- Add `max-w-prose` (65ch) to all body text containers
- Ensure consistent `h1` → `h2` → `h3` hierarchy on every page (no skips)
- Letter-spacing: headings get `tracking-tight` (-0.025em)

---

## 5. Motion System

### Kept (no changes)

| Animation | Duration | Use |
|-----------|----------|-----|
| `fadeUp` | 600ms ease-out | Page mount entry |
| `fadeIn` | 500ms ease-out | Simple appear |
| `float` | 6s infinite | Ambient floating |
| `breathe` | 4s infinite | Ambient pulsing |
| `cardSlideIn` | 400ms spring | Onboarding card transitions |
| `badgeReveal` | 600ms spring | Achievement celebrations |
| `confettiFall` | 3s | Completion celebrations |
| `mentorSpeaking` | 1.2s infinite | Mentor avatar glow |
| `mentorBreathing` | 3s infinite | Mentor avatar idle |
| `pulseSkeleton` | 1.5s infinite | Loading skeletons |

### Changed

- Stagger delays: 100ms → 60ms increments
- Stagger classes: expand from `stagger-1..5` to `stagger-1..10`

### New — Interaction Feedback

Added as `@utility` blocks in `globals.css`:

- **`hover-lift`**: `translateY(-2px)` + `elevation-2` shadow, `300ms ease-out`
- **`press-depth`**: `scale(0.98)` on `:active`, `100ms ease-out`

### New — Scroll-Triggered Animations

- Intersection Observer API via reusable `useScrollReveal` hook
- Elements `fadeUp` as they enter viewport
- Applied to: dashboard cards, insight feed items, settings sections

### New — Lottie Animations

- `lottie-react` for complex animations where CSS/SVG isn't sufficient
- Use cases: onboarding illustrations, mentor avatar expressions, achievement badges
- JSON-based format keeps file sizes small

### Accessibility — Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Global kill switch. All animations collapse to instant. Skeleton loading remains functional (static state).

---

## 6. Accessibility

### Focus Management

- Custom focus-visible: `ring-2 ring-sage-300 ring-offset-2` applied globally
- Every `packages/ui` primitive includes focus-visible styles
- Tab order follows visual order (audit and fix any `tabIndex` misuse)

### Interactive Elements

- All buttons, cards, links, selectable items: `cursor-pointer`
- All icon-only buttons: `aria-label`
- Disabled states: `aria-disabled` + visual `opacity-40 cursor-not-allowed`

### Semantic HTML

- Heading hierarchy: `h1` → `h2` → `h3` on every page, no skips
- Form inputs: associated `<label>` elements
- Landmark elements: `<main>`, `<nav>`, `<header>` in page shells

### Skip-to-Content

Skip link in page shell:
```html
<a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-sage-500 focus:text-white focus:rounded-lg">
  Skip to content
</a>
```

### ARIA Live Regions

- Mentor chat: `aria-live="polite"` on message container — announces new messages
- Toast notifications: `aria-live="assertive"` — announces immediately
- Progress updates: `aria-live="polite"` on wizard progress bar

### Screen Reader Testing

- `@storybook/addon-a11y` with axe-core integration
- Every component story runs automated accessibility audit
- Violations surface as warnings in Storybook UI

### Color Contrast

No changes needed — existing palette exceeds 4.5:1 for all text/background combinations. Dimension text colors are already AA-safe.

---

## 7. Icon System

### Primary: Lucide React

- Tree-shakeable SVG components
- Consistent 24x24 grid, 2px stroke
- Import individual icons: `import { ChevronLeft } from 'lucide-react'`

### Icon Wrapper

`packages/ui/src/primitives/icon.tsx`:

```tsx
import { type LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';

interface IconProps {
  icon: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = { sm: 16, md: 20, lg: 24 };

export function Icon({ icon: LucideIcon, size = 'md', className }: IconProps) {
  return <LucideIcon size={sizeMap[size]} className={cn('shrink-0', className)} />;
}
```

### Dimension Icons

Custom SVG components in `packages/ui/src/primitives/icons/dimensions/`:

- `career-icon.tsx`, `finance-icon.tsx`, `health-icon.tsx`, `fitness-icon.tsx`
- `family-icon.tsx`, `social-icon.tsx`, `romance-icon.tsx`, `growth-icon.tsx`
- Consistent API: accept `size` and `className` props
- Use dimension colors from the token system

### Migration

- Map each existing inline SVG to its Lucide equivalent
- Any without a match → custom SVG component in `packages/ui`
- Remove all inline `<svg>` elements from feature components

---

## 8. Sound & Haptics

### Sound Effects

Web Audio API — no heavy libraries.

| Trigger | Sound | Duration |
|---------|-------|----------|
| Onboarding completion | Soft chime (ascending tone) | ~600ms |
| Streak increment | Gentle tick | ~200ms |
| Check-in submission | Warm ambient tone | ~400ms |
| Achievement unlock | Bright sparkle | ~500ms |

**Preferences:**
- Muted by default — user opts in via settings
- Respects system volume
- Audio files: WebM (modern browsers), MP3 (fallback), loaded lazily
- Audio files live in `apps/web/public/audio/` (alongside existing voice samples)
- `prefers-reduced-motion` also suppresses non-essential audio cues

### Haptics

`navigator.vibrate()` — progressive enhancement (no-op on desktop/unsupported):

| Trigger | Pattern |
|---------|---------|
| Button press | Short pulse: `[10]` |
| Celebration | Success pattern: `[50, 30, 50]` |
| Error | Double tap: `[30, 50, 30]` |

---

## 9. Signature Moments

### 1. Onboarding Completion Celebration

- Profile summary cards: staggered `fadeUp` cascade (60ms delays)
- Wheel of Life: animate from zero to scored state over 800ms (spokes grow sequentially)
- Confetti: particles use the user's top 3 dimension colors (not generic rainbow)
- "Profile Complete" badge: `badgeReveal` spring animation
- Sound: soft ascending chime
- Haptics: success pattern `[50, 30, 50]`
- Particle burst: dimension-colored floating particles (CSS pseudo-elements)

### 2. Daily Check-in Ritual

- Life Orb: `breathe` animation on the prompt
- Slider: thumb scales `1.15` on grab, track fills with sage gradient
- On submission: streak counter springs with `badgeReveal`, sage pulse on card border
- Sound: warm ambient tone
- Haptics: short pulse on submit

### 3. Dashboard Ambient Life

- Life Orb: breathing intensity reflects overall score (higher = slower, calmer)
- Dimension cards: `hover-lift` on hover
- Insight cards: `fadeUp` + stagger as they appear in feed
- Sparklines: SVG `stroke-dashoffset` transition on first render (line draws itself)
- Scroll reveal: cards `fadeUp` as they enter viewport via `useScrollReveal`

### 4. Page Transitions

- New pages enter with `fadeUp`
- Loading skeletons match actual content layout shapes
- Lottie animations for complex illustrations (onboarding, achievements)

---

## 10. `packages/ui` Architecture

### Package Setup

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
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "lucide-react": "^0.400.0",
    "lottie-react": "^2.4.0"
  },
  "devDependencies": {
    "@storybook/react-vite": "^8.0.0",
    "@storybook/addon-a11y": "^8.0.0",
    "@storybook/test": "^8.0.0"
  }
}
```

### Component API Pattern

Every component uses CVA with smart/dumb split for feature components:

```tsx
// Dumb component — pure UI, props-driven, testable in Storybook
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const variants = cva('base-classes', {
  variants: { variant: { ... }, size: { ... } },
  defaultVariants: { ... },
});

interface Props extends React.HTMLAttributes<HTMLElement>,
  VariantProps<typeof variants> {}

export const Component = React.forwardRef<HTMLElement, Props>(
  ({ className, variant, size, ...props }, ref) => (
    <element ref={ref} className={cn(variants({ variant, size }), className)} {...props} />
  )
);

// Connected wrapper — wires data fetching, lives alongside the dumb component
// component.connected.tsx
'use client';
export function ComponentConnected() {
  const data = useSomething();
  return <Component {...data} />;
}
```

### File Structure

```
packages/ui/
├── package.json
├── tsconfig.json
├── .storybook/
│   ├── main.ts               # Vite builder, imports globals.css
│   └── preview.ts             # Global decorators, a11y addon
├── src/
│   ├── utils/
│   │   └── cn.ts
│   ├── hooks/
│   │   ├── use-scroll-reveal.ts
│   │   ├── use-sound.ts       # Web Audio API wrapper
│   │   └── use-haptics.ts     # navigator.vibrate wrapper
│   ├── primitives/
│   │   ├── button.tsx + .stories.tsx
│   │   ├── card.tsx + .stories.tsx
│   │   ├── input.tsx + .stories.tsx
│   │   ├── select.tsx + .stories.tsx
│   │   ├── slider.tsx + .stories.tsx
│   │   ├── badge.tsx + .stories.tsx
│   │   ├── avatar.tsx + .stories.tsx
│   │   ├── icon.tsx + .stories.tsx
│   │   ├── skeleton.tsx + .stories.tsx
│   │   ├── separator.tsx + .stories.tsx
│   │   └── icons/
│   │       └── dimensions/    # 8 custom dimension SVG components
│   ├── feedback/
│   │   ├── toast.tsx + .stories.tsx
│   │   ├── progress-bar.tsx + .stories.tsx
│   │   ├── empty-state.tsx + .stories.tsx
│   │   └── error-boundary.tsx + .stories.tsx
│   ├── layout/
│   │   ├── page-shell.tsx + .stories.tsx
│   │   ├── section.tsx + .stories.tsx
│   │   ├── stack.tsx + .stories.tsx
│   │   └── container.tsx + .stories.tsx
│   ├── data-display/
│   │   ├── stat-card.tsx + .stories.tsx
│   │   ├── dimension-card.tsx + .stories.tsx
│   │   ├── sparkline.tsx + .stories.tsx
│   │   └── wheel-chart.tsx + .stories.tsx
│   ├── onboarding/
│   │   ├── wizard-shell.tsx + .connected.tsx + .stories.tsx
│   │   ├── question-card.tsx + .stories.tsx
│   │   ├── welcome-card.tsx + .stories.tsx
│   │   ├── expectations-card.tsx + .stories.tsx
│   │   ├── data-import-card.tsx + .stories.tsx
│   │   ├── checkin-intro-card.tsx + .stories.tsx
│   │   ├── streaks-card.tsx + .stories.tsx
│   │   ├── connect-apps-card.tsx + .stories.tsx
│   │   ├── dashboard-tour-card.tsx + .stories.tsx
│   │   ├── ai-mentor-card.tsx + .stories.tsx
│   │   └── profile-summary.tsx + .connected.tsx + .stories.tsx
│   ├── dashboard/
│   │   ├── dashboard-shell.tsx + .connected.tsx + .stories.tsx
│   │   ├── dimension-grid.tsx + .connected.tsx + .stories.tsx
│   │   ├── daily-pulse.tsx + .connected.tsx + .stories.tsx
│   │   └── insight-feed.tsx + .connected.tsx + .stories.tsx
│   ├── mentor/
│   │   ├── mentor-avatar.tsx + .stories.tsx
│   │   ├── chat-bubble.tsx + .stories.tsx
│   │   └── mentor-panel.tsx + .connected.tsx + .stories.tsx
│   ├── shared/
│   │   ├── nav-bar.tsx + .connected.tsx + .stories.tsx
│   │   └── bottom-nav.tsx + .connected.tsx + .stories.tsx
│   └── index.ts
└── tailwind.config.ts
```

---

## 11. Implementation Phases

### Phase 1: Foundation (2 weeks)

**Goal:** Design system infrastructure, primitives, Storybook.

1. Create `packages/ui` package (package.json, tsconfig, tailwind config)
2. Set up Storybook 8 with Vite builder, a11y addon, globals.css import
3. Build `cn()` utility
4. Build 10 primitives with stories + interaction tests:
   - Button, Card, Input, Select, Slider, Badge, Avatar, Icon, Skeleton, Separator
5. Build 3 hooks: `useScrollReveal`, `useSound`, `useHaptics`
6. Build 8 dimension icon components
7. Fix token hygiene across all existing components (hardcoded hex → token classes)
8. Add `cursor-pointer` to all interactive elements
9. Update scrollbar thumb to use CSS variable

### Phase 2: Polish + Accessibility (1 week)

**Goal:** Motion refinements, accessibility foundations, sound/haptics infrastructure.

1. Tighten stagger delays (100ms → 60ms), expand to `stagger-1..10`
2. Add `hover-lift` and `press-depth` utility classes
3. Add `prefers-reduced-motion` global media query
4. Add custom focus-visible styles globally
5. Add skip-to-content link to page shell
6. Add ARIA live regions (mentor chat, toasts, progress)
7. Audit heading hierarchy and form labels across all pages
8. Set up screen reader testing (axe-core in Storybook)
9. Integrate `useSound` with audio assets (chime, tick, tone, sparkle)
10. Integrate `useHaptics` with interaction triggers
11. Icon migration: replace all inline SVGs with Lucide components
12. Install and configure `lottie-react`

### Phase 3: Component Migration (3 weeks)

**Goal:** Migrate all existing feature components to use shared primitives.

1. Build feedback components: Toast, ProgressBar, EmptyState, ErrorBoundary
2. Build layout components: PageShell, Section, Stack, Container
3. Build data display components: StatCard, DimensionCard, Sparkline, WheelChart
4. Build onboarding components: WizardShell, QuestionCard, all 8 info cards, ProfileSummary
5. Build dashboard components: DashboardShell, DimensionGrid, DailyPulse, InsightFeed
6. Build mentor components: MentorAvatar, ChatBubble, MentorPanel
7. Build shared components: NavBar, BottomNav, ThemeToggle
8. Wire connected variants for all feature components
9. Replace existing `apps/web/src/components/` with imports from `@life-design/ui`

### Phase 4: Signature Moments (1 week)

**Goal:** Celebrations, ambient life, scroll reveals, Lottie animations.

1. Onboarding completion: staggered reveal, wheel animation, dimension confetti, chime + haptics
2. Daily check-in: breathing prompt, slider feedback, streak spring, tone + haptics
3. Dashboard ambient: orb breathing, hover-lift cards, sparkline draw, scroll reveals
4. Page transitions: consistent fadeUp entry, layout-matched skeletons
5. Lottie animations: onboarding illustrations, mentor expressions, achievement badges
6. Particle system: dimension-colored floating particles on dashboard, sparkle on achievements

---

## 12. Anti-Patterns

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
| Sound on by default | Muted by default, user opts in — respect their environment |
| Heavy animation libraries | Lottie for complex only; CSS/SVG for everything else |

---

## 13. Success Criteria

### Design Gate

- [ ] All components use design tokens — zero hardcoded hex values
- [ ] Typography uses Instrument Serif (headings) and DM Sans (body) consistently
- [ ] Color system applied via Tailwind tokens — no arbitrary values
- [ ] Every element has intentional sizing, positioning, and color

### Production Gate

- [ ] All shared components are TypeScript with proper prop interfaces
- [ ] All components have Storybook stories with interaction tests
- [ ] axe-core accessibility audit passes for all stories
- [ ] Responsive across 375px, 768px, 1024px, 1440px
- [ ] `prefers-reduced-motion` respected for all animations
- [ ] Lucide icons used consistently (no inline SVGs)
- [ ] No console errors or TypeScript errors

### Accessibility Gate

- [ ] Skip-to-content link present and functional
- [ ] ARIA live regions on mentor chat, toasts, and progress
- [ ] All icon-only buttons have `aria-label`
- [ ] Heading hierarchy is correct on every page
- [ ] All form inputs have associated labels
- [ ] Custom focus-visible styles on all interactive elements

### Experience Gate

- [ ] First impression feels premium
- [ ] At least one signature moment per user flow
- [ ] Sound effects are subtle and opt-in
- [ ] Motion feels earned and purposeful, not decorative
- [ ] Information hierarchy guides the eye correctly
- [ ] A sophisticated user would feel proud to use this

---

## 14. Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `class-variance-authority` | ^0.7.0 | Typed component variant API |
| `clsx` | ^2.1.0 | Conditional className strings |
| `tailwind-merge` | ^2.2.0 | Merge conflicting Tailwind classes |
| `lucide-react` | ^0.400.0 | Icon library |
| `lottie-react` | ^2.4.0 | Complex JSON-based animations |
| `@storybook/react-vite` | ^8.0.0 | Component development environment |
| `@storybook/addon-a11y` | ^8.0.0 | Automated accessibility auditing |
| `@storybook/test` | ^8.0.0 | Interaction testing (play functions) |

---

## 15. Estimated Effort

| Phase | Duration | Complexity |
|-------|----------|-----------|
| Phase 1: Foundation | 2 weeks | Medium — infrastructure + 10 primitives + token cleanup |
| Phase 2: Polish + Accessibility | 1 week | Medium — motion, a11y, icons, sound/haptics |
| Phase 3: Component Migration | 3 weeks | High — all feature components + connected wrappers |
| Phase 4: Signature Moments | 1 week | Medium — celebrations, ambient, Lottie, particles |
| **Total** | **7 weeks** | |
