# Life Design (Opt In) — 3 Redesign Variants

> Prepared overnight for morning review. Each variant keeps the existing
> sage/stone/warm earth-tone palette and DM Sans typography but reimagines
> layout, information hierarchy, and interaction patterns.

---

## Current State Summary

- **Navigation**: Bottom tab bar (mobile-first) with 7 items + overflow "More" menu
- **Dashboard**: Dense card grid — dimension scores, streak counter, mood chart,
  insights list, goals summary, weekly digest, nudges
- **Pages**: Check-in, Journal, Goals, Insights, Mentor, Companion (Aria), Settings
- **Component library**: Custom components + @life-design/ui (Card, Badge, Skeleton)
- **Charts**: Recharts (dynamically imported, SSR-safe)
- **Style**: Clean, minimal, stone-50 backgrounds, rounded-2xl cards, subtle borders

---

## Variant A: "Sanctuary" — Calm Single-Focus Layout

### Philosophy
Reduce cognitive load. Show one thing at a time. Inspired by meditation
apps (Calm, Headspace) and journaling apps (Day One). The dashboard
becomes a "daily intention" screen rather than a data dump.

### Key Changes

**Navigation → Full-screen drawer (left swipe)**
- Remove bottom tab bar entirely
- Replace with a floating action button (bottom-right) that opens a
  full-screen sage-tinted drawer
- Drawer shows all nav items as large, spaced-out rows with icons
- Active page shown as a subtle header breadcrumb

**Dashboard → Daily Focus**
- Hero section: greeting + today's date + weather mood
- Single "Focus Card" showing the most relevant action:
  - Haven't checked in today? → Check-in CTA
  - New insight? → Insight preview
  - Goal milestone due? → Goal nudge
  - Nothing urgent? → Reflective prompt from Aria
- Below the focus card: a "pulse" — 8 small dimension dots in a circle,
  colored by recent scores (think Apple Watch activity rings but as dots)
- Swipe left/right to see yesterday/last week
- No charts on dashboard. Charts live on their own "Trends" page

**Companion (Aria) → Always-accessible**
- Small floating Aria avatar (bottom-left, above the FAB)
- Tap to expand into a slide-up chat sheet (60% screen height)
- Can chat from any page without leaving context
- Aria's messages use a distinct warm-50 background to feel personal

**Check-in → Guided flow**
- Full-screen, one question per screen with large touch targets
- Progress indicator as a thin sage line at top
- Dimension scoring as draggable sliders with haptic-style animations
- Journal entry at the end with voice option prominent

**Color refinements**
- Page background: stone-50 → warm-50 (warmer, more inviting)
- Cards: white → warm-50/80 with warm-200 borders (softer)
- Primary actions: sage-500 stays, but buttons become pill-shaped

### Pros
- Dramatically reduced overwhelm for new users
- Feels more therapeutic/safe — matches the wellness positioning
- Aria companion is always one tap away

### Cons
- Power users may find it too minimal
- Hides data behind extra taps
- Navigation drawer pattern is less discoverable on mobile

---

## Variant B: "Command Center" — Data-Rich Modular Dashboard

### Philosophy
Lean into the quantified-self aspect. Give users a customizable,
information-dense experience inspired by Notion, Linear, and Apple Health.
Users who track their life want to see their data.

### Key Changes

**Navigation → Collapsible sidebar (desktop) + bottom tabs (mobile)**
- Desktop: persistent left sidebar (240px) with icon+label items
- Sidebar sections: "Daily" (Dashboard, Check-in, Journal),
  "Growth" (Goals, Insights, Trends), "Support" (Aria, Mentor),
  "System" (Settings)
- Sidebar collapses to icon-only (64px) on smaller screens
- Mobile: keep bottom tabs but reorganize into 4 items:
  Home, Track, Grow, Aria

**Dashboard → Modular widget grid**
- 2-column grid on mobile, 3-column on desktop
- Draggable/reorderable widgets (persisted in Dexie):
  - **Mood Spark**: tiny sparkline of last 7 days + today's score
  - **Dimension Radar**: radar chart of all 8 dimensions
  - **Streak**: flame icon + count + best streak
  - **Active Goals**: progress bars with completion %
  - **Recent Journal**: last 2 entries as truncated cards
  - **Pattern Alert**: AI-detected patterns (from DRM)
  - **Upcoming**: next scheduled activity or milestone
  - **Quick Actions**: 2x2 grid of Check-in, Journal, Goals, Aria
- "Customize" button to add/remove/reorder widgets
- Each widget has a "..." menu to expand to full view

**Companion (Aria) → Dedicated full page with history**
- Full-page chat at /companion (already built)
- Add session history sidebar (previous conversations)
- Add "Insights from Aria" section showing patterns she's noticed
- Growth narrative displayed as a timeline below the chat

**Trends → New dedicated page**
- Replace the current insights page with a full Trends dashboard
- Filterable by dimension, time range (1w, 1m, 3m, 6m, 1y)
- Stacked area chart showing all dimensions over time
- Correlation matrix heatmap (leveraging existing correlation data)
- Export to PDF button

**Color refinements**
- Keep current stone-50 palette (clean, professional)
- Widget cards get subtle left-border accent in dimension color
- Active nav items get sage-100 background pill

### Pros
- Power users and data enthusiasts will love it
- Customizable = personal = more engagement
- Better desktop experience (current app feels mobile-only)

### Cons
- More complex to implement (drag-and-drop, persistence)
- Can overwhelm new users
- Requires careful responsive design work

---

## Variant C: "Story" — Narrative-First Timeline

### Philosophy
Life is a story, not a spreadsheet. Organize everything chronologically
as a living timeline. Inspired by social media feeds (but private),
health apps like Bearable, and personal wikis. The DRM's Life Story
and Growth Narrative features become the centerpiece.

### Key Changes

**Navigation → Top bar with tabs**
- Thin top bar: logo left, avatar right, search icon
- Below: horizontal scrollable tab pills:
  Today, Timeline, Goals, Aria, Profile
- Active tab highlighted with sage underline
- Feels like a premium mobile app (think Things 3, Bear)

**Dashboard → "Today" feed**
- Vertical scrolling feed of today's events and prompts:
  - Morning: "Good morning, [name]" + weather + quote
  - If not checked in: Check-in card (expandable inline)
  - If checked in: summary card with dimension dots
  - Any active nudges or micro-moments from Aria
  - Journal prompt (expandable inline — write without leaving)
  - Evening: reflection prompt
- Each card is a "moment" with a timestamp and type icon
- Cards can be expanded/collapsed inline

**Timeline → Core experience**
- Infinite scroll of life events, grouped by week
- Week header: "Week of Apr 7" + overall mood indicator
- Event types rendered as distinct card styles:
  - **Check-in**: compact summary with emotion color bar
  - **Journal**: preview text with "Read more" expansion
  - **Goal milestone**: celebration card with confetti accent
  - **Insight**: AI insight with sage-tinted background
  - **Aria conversation**: summarized exchange preview
  - **Growth narrative**: rich card with milestone highlights
- Filter bar: "All", "Check-ins", "Journal", "Goals", "Insights", "Aria"
- Each week shows a mini dimension sparkline in the header

**Companion (Aria) → Contextual + dedicated**
- Aria appears contextually in the timeline (micro-moments, insights)
- Dedicated chat page accessible from tab bar
- After conversations, Aria adds a summary card to the timeline
- Growth narratives appear as "chapter" cards every month

**Goals → Visual progress board**
- Kanban-style columns: "To Start", "In Progress", "Achieved"
- Each goal card shows dimension tags and milestone progress ring
- Drag between columns to update status
- Timeline integration: goal milestones appear in the timeline

**Color refinements**
- Background: gradient from warm-50 (top) to stone-50 (bottom)
- Timeline line: sage-200 vertical line connecting events
- Event cards: white with 1px stone-200 border, no shadow
- Different event types have subtle left-border accents:
  - Check-in: sage, Journal: warm, Goal: accent-blue, Aria: warm-300

### Pros
- Unique differentiator — no other wellness app does this
- Makes the DRM's Life Story feature front and center
- Feels personal and narrative, matches therapeutic goals
- Natural integration point for Aria's micro-moments

### Cons
- Timeline can get long/slow without virtualization
- Less structured for quick data lookups
- More novel = more user education needed

---

## Recommendation

For beta testing, **Variant C ("Story")** is the strongest differentiator
and aligns most naturally with the DRM's therapeutic narrative features.
However, if the primary audience is quantified-self enthusiasts,
**Variant B ("Command Center")** will drive more engagement.

**Variant A ("Sanctuary")** is the safest choice for a wellness app
but risks feeling too minimal for users who want to track progress.

A hybrid approach is also viable: start with Variant C's timeline as the
core, but allow a Variant B-style modular dashboard as an alternative
view toggle (timeline vs. dashboard), with Variant A's floating Aria
chat available everywhere.

---

*Generated 2026-04-13. Review and select a direction for implementation.*
