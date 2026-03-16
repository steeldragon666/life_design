# Visual Design System Rebuild — Specification

## Goal

Rebuild Life Design's visual layer as a proper design system in `@life-design/ui`. Evolve the existing warm stone/sage/earth palette into a premium, WCAG AA–compliant system with consistent tokens, a shared component library, polished data visualization, schedule/time-allocation features, notification system, and redesigned onboarding. Light theme only.

## Architecture

The design system lives in `packages/ui` as the single source of truth. All visual tokens (colors, typography, spacing, elevation, radius) are defined as CSS custom properties and consumed by Tailwind. Components are built as React components with Storybook documentation. The web app (`apps/web`) imports from `@life-design/ui` — no more ad-hoc inline styles or component-local design decisions.

**Three-layer token hierarchy:**
1. **Primitive tokens** — raw values (stone-50, sage-500, etc.)
2. **Semantic tokens** — purpose-mapped (text-primary, surface-raised, border-subtle)
3. **Component tokens** — specific (card-bg, button-primary-bg, input-border-focus)

## Tech Stack

- Tailwind CSS v4 with native `@theme` directive for tokens (CSS-first config, no tailwind.config.ts)
- React components in `@life-design/ui`
- Storybook for component documentation
- Phosphor Icons (`@phosphor-icons/react`, regular weight, monochrome)
- Recharts for charts (existing), custom SVG for radar/sparkline/progress ring

---

## 1. Color Palette

### 1.1 Core Scales

**Stone (Neutrals):**
| Token | Hex | Use |
|-------|-----|-----|
| stone-50 | #FAFAF8 | Page background |
| stone-100 | #F5F3EF | Sunken surfaces, input bg |
| stone-200 | #E8E4DD | Borders, dividers |
| stone-300 | #D4CFC5 | Disabled states, decorative borders |
| stone-400 | #A8A198 | **Background-only** — fails AA for text |
| stone-500 | #6B6459 | Secondary text (5.3:1 on white — passes AA on all surfaces) |
| stone-600 | #5C554C | Body text, descriptions |
| stone-700 | #3D3833 | Strong text, labels |
| stone-800 | #2A2623 | Headings, primary text |
| stone-900 | #1A1816 | Display text, maximum contrast |

**Sage (Primary):**
| Token | Hex | Use |
|-------|-----|-----|
| sage-50 | #F4F7F4 | Primary tinted bg |
| sage-100 | #E4ECE4 | Badge bg, active nav bg |
| sage-200 | #C4D5C4 | Borders on sage surfaces |
| sage-300 | #9BB89B | **Background-only** — fails AA for text |
| sage-400 | #739A73 | Decorative only |
| sage-500 | #5A7F5A | Primary actions, links (4.6:1 — passes AA) |
| sage-600 | #476447 | Primary text on sage bg, button bg |

**Warm (Secondary):**
| Token | Hex | Use |
|-------|-----|-----|
| warm-50 | #FEF7F0 | Warm tinted bg |
| warm-100 | #FCE8D5 | Badge bg, warning bg |
| warm-200 | #F5C9A3 | Decorative only |
| warm-300 | #E8A46D | **Background-only** — fails AA for text |
| warm-400 | #D4864A | Decorative only |
| warm-500 | #9A5B2D | Warm text, warning text (5.4:1 — passes AA) |
| warm-600 | #A05E30 | Strong warm text |

**Accent (Soft Blue):**
| Token | Hex | Use |
|-------|-----|-----|
| accent-400 | #85B8D8 | **Background-only** — fails AA |
| accent-500 | #5E9BC4 | Decorative accents |
| accent-600 | #3A7199 | Accent text (5.2:1 — passes AA) |

### 1.2 Dimension Colors

Each dimension gets a mini-palette (background, border, text, dot) to ensure contrast compliance everywhere.

**Note:** These match the existing `Dimension` enum in `packages/core/src/enums.ts`: Career, Finance, Health, Fitness, Family, Social, Romance, Growth.

| Dimension | Dot/Accent | Text (AA-safe) | Background | Border |
|-----------|-----------|----------------|------------|--------|
| Career | #5E9BC4 | #3A6A8A | #EFF4F8 | rgba(94,155,196,0.15) |
| Finance | #C4783A | #8A5A30 | #FDF5EE | rgba(196,120,58,0.15) |
| Health | #5A7F5A | #476447 | #F4F7F4 | rgba(90,127,90,0.15) |
| Fitness | #4A8A4A | #3A6A3A | #F0F5F0 | rgba(74,138,74,0.15) |
| Family | #D4864A | #8A5A30 | #FEF7F0 | rgba(212,134,74,0.15) |
| Social | #8B7BA8 | #6B5B88 | #F3F0F6 | rgba(139,123,168,0.15) |
| Romance | #C4607A | #8A3A50 | #FDF0F3 | rgba(196,96,122,0.15) |
| Growth | #4A86B0 | #3A6A8A | #EDF3F8 | rgba(74,134,176,0.15) |

### 1.3 Semantic Tokens

| Token | Value | Purpose |
|-------|-------|---------|
| text-primary | stone-800 (#2A2623) | Headings, primary content |
| text-secondary | stone-600 (#5C554C) | Body text, descriptions |
| text-muted | stone-500 (#6B6459) | Metadata, timestamps (5.3:1 on white, 4.8:1 on surface-page, 4.5:1 on surface-sunken) |
| text-inverse | #FFFFFF | Text on dark/colored bg |
| surface-default | #FFFFFF | Cards, containers |
| surface-page | stone-50 (#FAFAF8) | Page background |
| surface-sunken | stone-100 (#F5F3EF) | Inset areas, input bg |
| surface-raised | #FFFFFF | Elevated cards (with shadow) |
| border-default | stone-200 (#E8E4DD) | Standard borders |
| border-subtle | rgba(232,228,221,0.6) | Light dividers |
| interactive-primary | sage-500 (#5A7F5A) | Buttons, links, focus rings |
| interactive-hover | sage-600 (#476447) | Hover states |
| destructive | #CC3333 | Delete, error states (5.0:1 on white — passes AA) |

### 1.4 Contrast Rules

- All text on its background: minimum 4.5:1 (WCAG AA)
- Large text (18px+ or 14px bold): minimum 3:1
- Interactive element boundaries: minimum 3:1 against adjacent colors
- Focus rings: 3px sage-500/15% outline, meets 3:1
- **Banned combinations:** stone-400, sage-300, warm-300, accent-400 as text on white
- A Tailwind plugin runs at build time and warns on any text/bg pair below 4.5:1

---

## 2. Typography

### 2.1 Font Stack

| Role | Font | Source | Weights |
|------|------|--------|---------|
| Headings | Instrument Serif | Google Fonts | 400, 400i |
| Body | DM Sans | Google Fonts | 300, 400, 500, 600, 700 |
| Data/Mono | DM Mono | Google Fonts | 300, 400, 500 |

### 2.2 Type Scale

| Token | Size | Line Height | Weight | Font | Use |
|-------|------|-------------|--------|------|-----|
| display | 32px (2rem) | 1.2 | 400 | Instrument Serif | Page titles |
| heading-lg | 24px (1.5rem) | 1.25 | 400 | Instrument Serif | Section headers |
| heading-md | 20px (1.25rem) | 1.3 | 400 | Instrument Serif | Card titles |
| heading-sm | 16px (1rem) | 1.4 | 600 | DM Sans | Sub-sections |
| body-lg | 16px (1rem) | 1.5 | 400 | DM Sans | Primary body |
| body | 14px (0.875rem) | 1.5 | 400 | DM Sans | Default body |
| body-sm | 13px (0.8125rem) | 1.5 | 400 | DM Sans | Secondary text |
| caption | 11px (0.6875rem) | 1.4 | 500 | DM Sans | Labels, badges |
| data-sm | 14px (0.875rem) | 1.2 | 500 | DM Mono | Inline metrics |
| data-md | 16px (1rem) | 1.2 | 600 | DM Mono | Card scores |
| data-lg | 20px (1.25rem) | 1.2 | 700 | DM Mono | Hero numbers, life score |
| data-xl | 24px (1.5rem) | 1.2 | 700 | DM Mono | Dashboard primary score |

**Minimum text size:** 11px. Nothing smaller anywhere in the app.

### 2.3 Font Loading

Switch from Google Fonts `<link>` to `next/font` for self-hosted fonts (eliminates render-blocking request, improves LCP). Define in layout.tsx with `display: 'swap'`.

---

## 3. Spacing & Layout

### 3.1 Spacing Scale

4px base unit. Only these values are used for padding, margins, and gaps:

| Token | Value |
|-------|-------|
| space-1 | 4px |
| space-2 | 8px |
| space-3 | 12px |
| space-4 | 16px |
| space-5 | 20px |
| space-6 | 24px |
| space-8 | 32px |
| space-10 | 40px |
| space-12 | 48px |

### 3.2 Border Radius

| Token | Value | Use |
|-------|-------|-----|
| radius-sm | 8px | Buttons, badges, inputs |
| radius-md | 12px | Small cards, dropdowns |
| radius-lg | 16px | Standard cards |
| radius-xl | 20px | Feature cards, modals |
| radius-full | 9999px | Avatars, pills |

### 3.3 Responsive Breakpoints

| Token | Value | Use |
|-------|-------|-----|
| bp-sm | 640px | Mobile landscape |
| bp-md | 768px | Tablet — switch from bottom nav to sidebar |
| bp-lg | 1024px | Desktop — full sidebar |
| bp-xl | 1280px | Wide desktop — optional wider content |

### 3.4 Z-Index Scale

| Token | Value | Use |
|-------|-------|-----|
| z-base | 0 | Default content |
| z-nav | 40 | Sidebar, bottom nav |
| z-nudge | 45 | Nudge cards (below toasts) |
| z-toast | 50 | Toast notifications |
| z-modal-overlay | 55 | Modal backdrop |
| z-modal | 60 | Modal content |

### 3.5 Transition Tokens

| Token | Value | Use |
|-------|-------|-----|
| transition-fast | 150ms ease | Hover states, focus rings |
| transition-default | 300ms ease | Card hover, elevation change |
| transition-slow | 500ms ease-out | Page transitions, large animations |

### 3.6 Elevation

| Token | Shadow | Use |
|-------|--------|-----|
| elevation-0 | none (bg: stone-100) | Sunken/inset surfaces |
| elevation-1 | 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02) | Default cards |
| elevation-2 | 0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04) | Raised cards, hover |
| elevation-3 | 0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04) | Modals, popovers, toasts |

**Dimension-tinted shadows:** Dimension cards use `0 4px 12px rgba(<dim-color>,0.1)` for elevation-2.

---

## 4. Iconography

- **Library:** Phosphor Icons (`@phosphor-icons/react`)
- **Weight:** Regular (1.5px stroke) — monochrome, no color fills
- **Default color:** inherits from text — stone-600 default, stone-800 on hover, sage-600 for active nav
- **Sizes:** 16px (inline), 20px (nav/buttons), 24px (feature headers)
- **Custom SVGs:** 15-20 Life Design–specific icons for concepts Phosphor doesn't cover (balance wheel glyph, dimension symbols, life score indicator)
- No duotone, no colored icons — color comes from surrounding context (card borders, tinted shadows, badges)

---

## 5. Core Components

All components live in `packages/ui/src/components/`. Each exports a React component with typed props and is documented in Storybook.

### 5.1 Button

Variants: `primary`, `secondary`, `ghost`, `destructive`
Sizes: `sm` (6px 14px, 12px text), `default` (10px 20px, 13px text), `lg` (12px 28px, 14px text)

- Primary: `bg gradient(135deg, sage-600, sage-600)`, white text, sage-tinted shadow (sage-600 #476447 gives 7.2:1 — comfortably passes AA)
- Secondary: `bg stone-100`, stone-700 text, stone-200 border
- Ghost: transparent bg, sage-500 text
- Destructive: `bg #CC3333`, white text (5.0:1 — passes AA)
- All: radius-sm, 600 weight, focus ring (3px sage-500/15%)
- Loading state: spinner replaces text, button stays same width
- Disabled: 50% opacity, no pointer events

### 5.2 Card

Variants: `default`, `raised`, `sunken`, `dimension`

- Default: white bg, stone-200 border, elevation-1, radius-lg, space-6 padding
- Raised: white bg, sage-tinted border, elevation-2, radius-lg
- Sunken: stone-100 bg, no border, elevation-0, radius-lg
- Dimension: white bg, dimension-tinted border + shadow, radius-lg
- Hover: scale(1.01), transition to elevation-2 (300ms ease)

### 5.3 Input / Textarea / Select

- Label: body-sm, font-weight 600, stone-700
- Field: space-3 vertical padding, space-4 horizontal, radius-sm, stone-300 border, stone-100 bg on focus
- Focus: sage-500 border, 3px sage-500/15% ring
- Error: #CC3333 border, error message in 11px #CC3333 (5.0:1 — passes AA)
- Helper text: caption size, stone-500
- Placeholder: stone-500 (placeholder text is exempt from WCAG 1.4.3 per spec note, but we use stone-500 anyway for legibility)

### 5.4 Badge

Variants: `sage`, `warm`, `accent`, `stone`, `success`, `warning`, `destructive`

- Padding: 3px 10px, radius-full, 11px font, 600 weight
- Each variant: light background + dark text from same scale (e.g., sage-100 bg + sage-600 text)

### 5.5 Toast / Notification

- Position: fixed top-right, z-50
- Width: max-w-sm
- Elevation-3 shadow
- Left border accent (3px): sage-500 (success), warm-500 (warning), #CC3333 (error), accent-600 (info)
- Achievement variant: gradient sage-50→sage-100 bg, sage border, emoji + text
- Auto-dismiss: configurable, progress bar at bottom
- Slide-in animation from right, 300ms ease-out

### 5.6 Modal

- Overlay: black/20% backdrop-blur
- Container: white, radius-xl, elevation-3, max-w-lg, space-8 padding
- Header: heading-md, close button top-right
- Footer: flex end, button gap space-3

### 5.7 Tooltip / Popover

- Tooltip: stone-800 bg, white text, caption size, radius-sm, elevation-3
- Popover: white bg, stone-200 border, radius-md, elevation-3

### 5.8 Skeleton / Loading States

Every data-dependent component has a skeleton variant:
- **Card skeleton:** stone-100 bg with pulsing stone-200 content lines (radius-sm, 40% width for title, 80% for body)
- **Sparkline skeleton:** stone-100 rectangle pulsing
- **ProgressRing skeleton:** stone-200 full track, no progress, pulsing
- **Schedule widget skeleton:** 3 placeholder time blocks with stone-100 bars
- **Dashboard skeleton:** grid of card skeletons matching actual layout
- Pulse animation: opacity oscillates 0.4→1.0, 1.5s ease-in-out infinite

---

## 6. Data Visualization Components

### 6.1 RadarChart (Wheel of Life)

Custom SVG component (not Recharts — custom gives us dimension-colored vertices and gradient fill).

- 8 axes, one per dimension
- Polygon fill: `rgba(sage-500, 0.12)`, stroke: sage-500 1.5px
- Vertex dots: 4px radius, dimension accent color
- Axis labels: caption size, dimension text color (AA-safe)
- Grid rings: stone-200, 0.5px stroke, 3 levels
- Hover: tooltip with dimension name + score + trend
- Animation: polygon morphs on data change (300ms ease)

### 6.2 Sparkline

Inline SVG, 120×24px default.

- Line: 2px stroke, dimension accent color, rounded caps
- End dot: 3px radius, same color
- Trend badge beside: sage (up), warm (down), stone (stable)

### 6.3 ProgressRing (Life Score)

- SVG circle, gradient stroke (sage-500 → sage-300)
- Track: stone-200, 2.5px
- Progress: gradient, 2.5px, round linecap
- Center: data token (24px DM Mono 700) + "of 10" caption
- Animation: stroke-dasharray animates on mount

### 6.4 TrendBar (Dimension Score)

- Horizontal bar, dimension gradient fill (500 → 300)
- Track: stone-200
- Height: 4px, radius-full
- Label above: dimension name + score

### 6.5 Heatmap (Correlation Grid)

- Grid of cells, color intensity maps to correlation coefficient
- Positive: sage scale (stronger = darker sage)
- Negative: warm scale (stronger = darker warm)
- Diagonal: dimension accent color, white text
- Cell: radius-sm, caption size
- Hover: tooltip with exact coefficient

### 6.6 BarStack (Time Allocation)

- Horizontal stacked bar, 28px height, radius-sm
- Segments: dimension accent colors
- Labels: single letter abbreviation inside (11px, white, 600 weight) — meets minimum text size rule
- Two bars: "Actual" (solid) and "Suggested" (50% opacity, dashed border)

---

## 7. Schedule & Time Allocation

### 7.1 Data Sources

**Primary:** Google Calendar and Apple Calendar via OAuth integration (built as minimum viable connector in this phase — full integrations platform is a separate spec).

**Secondary:** Manual user input — add/edit/delete time blocks directly.

**AI-Suggested:** During onboarding, AI extracts time approximations from the conversational dialogue and asks clarifying questions. The system generates suggested time blocks based on goals, check-in patterns, and dimension balance targets. All users see premium features during testing.

### 7.2 Dashboard Widget (Compact)

Lives in the dashboard sidebar/panel. Shows:

- **Today's Schedule** header with "View all →" link to /schedule
- **Time blocks** — vertical list, dimension-colored left border (3px), title + time range
  - Confirmed blocks: solid border, white bg tinted with dimension color
  - AI-suggested blocks: dashed border, italic text, 70% opacity
- **Time Allocation bars** — two horizontal stacked bars:
  - "Actual" — solid colors, shows tracked time
  - "Suggested" — 50% opacity, dashed border, shows AI-recommended balance
  - Labels: dimension abbreviation + hours tracked

### 7.3 Full Schedule Page (`/schedule`)

- **Day/Week toggle** tabs
- **Day view:** Vertical timeline with time axis (6am–10pm), dimension-colored blocks positioned by time
  - Current time indicator: red line + dot + "NOW" label
  - Blocks: gradient bg from dimension palette, title + dimension + duration
  - Suggested blocks: dashed border, italic, lower opacity
  - Drag-to-adjust duration (future enhancement)
- **Week view:** 7-column grid, each day shows compressed blocks + total allocation bar

### 7.4 Overlap Handling

When time blocks overlap:
- **Calendar events always win** over AI-suggested blocks — the suggested block is hidden or moved
- **Two calendar events** overlap: both render, offset horizontally (side-by-side, each 50% width)
- **Manual + calendar overlap:** both shown, manual block gets a subtle warning indicator
- **AI suggestions** check for existing blocks before suggesting and avoid overlap

### 7.5 Calendar Connector (Minimum Viable)

Scope for this spec (detailed integrations platform is a separate spec):
- **Google Calendar:** OAuth2 read-only access (`calendar.events.readonly` scope). Fetch today's events + next 7 days. One-way sync (Google → app). No event creation.
- **Apple Calendar:** Via CalDAV or EventKit (mobile). Read-only, same scope as Google.
- **Sync frequency:** On app open + every 15 minutes while active
- **Dimension mapping:** AI auto-classifies calendar events to dimensions based on title/description. User can manually re-assign.

### 7.6 Schedule Database

Stored in Dexie (IndexedDB), same pattern as check-ins:

```typescript
interface DBScheduleBlock {
  id?: number;
  date: string;          // YYYY-MM-DD
  startTime: string;     // HH:mm
  endTime: string;       // HH:mm
  title: string;
  dimension: Dimension;
  source: 'google' | 'apple' | 'manual' | 'ai-suggested';
  calendarEventId?: string;  // external calendar ID for sync
  confirmed: boolean;    // false for AI suggestions until user accepts
  createdAt: Date;
}
```

---

## 8. Notification System

### 8.1 Toast Queue

Global toast provider wrapping the app. Toasts stack vertically (top-right), max 3 visible. Auto-dismiss with configurable duration (default 5s). Progress bar at bottom shows remaining time.

Variants:
- **Success:** sage left border, checkmark icon
- **Warning:** warm left border, warning icon
- **Error:** red left border, error icon
- **Achievement:** gradient sage bg, emoji + badge reveal animation, longer duration (8s)
- **Info:** accent left border, info icon

### 8.2 Nudge Cards

Redesigned from current NudgeCard with proper tokens:
- Fixed bottom-right, z-50, max-w-sm
- Elevation-3, radius-xl
- Type badge (morning/evening/boost) using caption token
- Dimension badge if applicable
- "Got it" (secondary button) + "Talk to mentor" (primary button)
- Auto-dismiss progress bar
- Slide-in from bottom, 300ms ease-out

---

## 9. Navigation

### 9.1 Desktop Sidebar

- Width: 240px, collapsible to 64px (icon-only)
- Background: white, elevation-1, stone-200 right border
- Logo: "Life Design" in Instrument Serif 18px
- Items: Phosphor icon (20px, regular weight) + label (13px DM Sans)
  - Default: stone-500 icon + text
  - Hover: stone-100 bg, stone-800 text
  - Active: sage-100 bg, sage-600 icon + text, 600 weight
- Divider before Settings
- Items: Dashboard, Goals, Check-in, Mentor, Schedule, Simulator, Challenges, Badges, Settings

### 9.2 Mobile Bottom Nav

- Fixed bottom, full width, white bg, elevation-3 (shadow upward)
- 5 items: Dashboard, Goals, Check-in, Mentor, More
- "More" opens slide-up drawer with: Schedule, Simulator, Challenges, Badges, Settings
- Active item: sage-600 icon + text, sage-50 bg pill
- Inactive: stone-500 icon + text (meets 3:1 for UI components)
- Active More button shows dot indicator when current route is in overflow group

---

## 10. Onboarding Flow Redesign

### 10.1 Structure

Multi-step wizard (5 steps), each in a centered card (max-w-lg, radius-xl, elevation-2):

1. **Welcome** — name, what brings you here
2. **Dimension Priorities** — rank/select which dimensions matter most
3. **Time Allocation** — "What does a balanced week look like?" Grid of dimension cards with hour inputs. AI pre-fills from conversational context
4. **Calendar Connect** — Google/Apple Calendar OAuth. Optional skip
5. **First Check-in** — initial scores for all 8 dimensions

### 10.2 Visual Elements

- Step indicator: horizontal dots — done (sage-500 filled), active (sage-600, wider pill), pending (stone-200). Step state is also conveyed by size (active is wider) and position, so color alone is not the sole indicator.
- Cards: 2-column grid for selectable options, sage-500 border when selected, stone-200 default
- Continue button: primary-lg, full width
- Skip option: ghost button below

### 10.3 AI Conversation

For premium users (all users during testing), the onboarding includes a brief AI conversation that:
- Asks about daily routine, work patterns, personal goals
- Extracts time allocation estimates
- Pre-fills the schedule with suggested blocks
- Asks 2-3 clarifying questions before finalizing

---

## 11. Storybook

Set up Storybook 8 in `packages/ui` with:
- Stories for every component (default + all variants)
- Design token reference page (colors, typography, spacing, elevation)
- Accessibility addon (`@storybook/addon-a11y`) running on all stories
- Dark background toggle (for testing component isolation, not a dark theme)
- Deployed to a preview URL for team reference

---

## 12. Migration Strategy

### 12.1 Approach

Incremental migration — new components are built in `@life-design/ui`, existing pages are migrated one at a time. During transition, both old inline styles and new component imports coexist.

### 12.2 Token Reconciliation

The existing codebase has two competing token sources:
- `packages/ui/src/tokens.ts` — Cabinet Grotesk/Erode fonts, indigo/violet palette
- `packages/ui/src/design-system/tokens.ts` — similar indigo/glass system

**Action:** Both files are replaced by the new CSS custom property token system in `globals.css` + a new `packages/ui/src/tokens.ts` that exports the token values as TypeScript constants for programmatic use (e.g., chart colors). The old `designTokens` export is preserved as a deprecated re-export pointing to the new tokens for the transition period, then removed in the cleanup pass.

### 12.3 Component Mapping (Old → New)

| Old Component | New Component | Notes |
|---------------|---------------|-------|
| `GlassCard` | `Card` (default variant) | Glass effect replaced by elevation system |
| `StatCard` | `Card` (dimension variant) | Dimension-tinted shadows replace glass |
| `ScoreRing` | `ProgressRing` | Same concept, new tokens |
| `DimensionBadge` | `Badge` (dimension variant) | Uses dimension mini-palette |
| `SectionHeader` | Direct heading tokens | No wrapper component needed |
| `TrendIndicator` | `Sparkline` + `Badge` | Composed from two primitives |
| `InsightCard` | `Card` + content slots | No special card type needed |

Old components are kept during migration with `@deprecated` JSDoc annotations, then removed in step 13.

### 12.4 Order

1. Tokens + Tailwind config (globals.css rewrite, new tokens.ts, deprecate old)
2. Foundation components (Button, Card, Input, Badge, Skeleton, Tooltip, Popover, Modal)
3. Navigation (Sidebar, BottomNav) + Phosphor Icons install
4. Dashboard page (first full migration, including schedule widget)
5. Data viz components (RadarChart, Sparkline, ProgressRing, TrendBar, Heatmap, BarStack)
6. Check-in page
7. Goals pages
8. Remaining pages (Mentor, Simulator, Challenges, Badges, Settings)
9. Onboarding flow
10. Toast/notification system (Toast, NudgeCard)
11. Schedule full page + Google Calendar connector (minimum viable)
12. Storybook documentation
13. Contrast audit + cleanup pass (remove deprecated old components, delete old token files)

---

## 13. Acceptance Criteria

1. Every text/foreground color passes WCAG AA (4.5:1) against its background
2. All interactive elements have visible focus indicators (3:1 minimum)
3. No text below 11px anywhere in the app
4. All components use tokens — no hardcoded hex values in page files
5. Storybook builds with zero accessibility violations
6. `pnpm tsc --noEmit` passes with zero errors
7. All existing tests continue to pass
8. Production build succeeds
9. Schedule widget displays on dashboard with sample data
10. /schedule page renders day and week views
11. Toast notifications work for check-in save, achievement, and warning scenarios
12. Onboarding flow completes end-to-end with step indicator
