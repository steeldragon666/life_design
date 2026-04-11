# Onboarding Redesign — Opt In

**Date:** 2026-04-11
**Status:** Approved
**Approach:** Linear Carousel (Approach A) — 8 full-screen cards in a single flow

---

## Brand Change

The application is being renamed from **Life Design** to **Opt In**.

---

## Overview

Replace the existing question-only `ProfilingWizard` with an 8-card guided onboarding flow that wraps the profiling wizard with context, privacy messaging, feature introductions, and interactive first-use experiences. The flow is fully linear — users progress through all 8 cards. Save-and-resume is supported via the existing onboarding API.

---

## Card 1: Welcome & Privacy Promise

**Purpose:** Set the tone, explain what Opt In does, build trust immediately.

**Content:**
- **Headline:** "Welcome to Opt In"
- **Subheadline:** "Your AI-powered personal analytics companion"
- **3 blocks with icons:**
  1. **How it works** — Check in daily across 8 life dimensions. AI finds patterns, correlations, and insights.
  2. **AI that works for you** — AI learns from your data to become more helpful over time, like a mentor that knows your story.
  3. **Your data is yours** — No selling to third parties. No using data to improve products. AES-256 encrypted. Only viewable to systems when logged in. Cannot be accessed by staff. Log in more = better help.
- **CTA:** "Let's get started"
- **Footer:** Links to Privacy Policy and Terms

---

## Card 2: Set Expectations — "Your Adventure Starts Here"

**Purpose:** Explain that profiling matters, set time expectations, frame as personalised choose-your-own-adventure.

**Content:**
- **Headline:** "This is your story to write"
- **Subheadline:** "We're about to ask you some questions — please take your time."
- **3 blocks:**
  1. **Why it matters** — Answers form the foundation. Every user gets a completely different experience.
  2. **Be honest, not perfect** — No right answers. Uses validated psychology instruments.
  3. **How long** — ~10-15 minutes across 7 sections. Progress saved automatically.
- **Visual:** Section overview — Goal, Wellbeing, Personality, Drive, Satisfaction, Needs, Style + new Baseline section
- **CTA:** "I'm ready"

---

## Card 3: Deep Profiling + Data Import

**Purpose:** The core profiling wizard enhanced with data imports and additional research-backed questions.

### Addition 1: Pre-profiling Data Import Prompt

Before the first question, offer optional data imports:

- **Headline:** "Want to give us a head start?"
- **Subheadline:** "Connect your apps so we can learn from your history — not just your answers."
- **Available imports:**
  - Apple Health — sleep, steps, heart rate, workouts (existing)
  - Strava — fitness activity history (existing)
  - Spotify — listening habits, mood patterns (existing)
  - Google Calendar — how you spend your time (existing)
  - Google Fit / Samsung Health — additional health data (new connector needed)
  - Screen Time — device usage patterns (new — iOS Screen Time API / Android Digital Wellbeing)
- **Skip option:** "Skip for now — you can connect these later in Settings"
- **Privacy reminder:** "We only read your data. We never post, modify, or share it."

### Addition 2: Research-Backed Additional Questions (~17 new)

New **"Your Baseline"** section inserted between Wellbeing and Personality:

| Instrument | Items | Scale | Purpose |
|-----------|-------|-------|---------|
| MEQ-SA Chronotype (Horne & Ostberg) | ~3 | Categorical | Optimise nudge timing and ritual scheduling |
| PSQI Short Form (Sleep Quality) | 4 | 0-3 | Health dimension baseline — sleep is #1 correlate |
| PSS-4 Perceived Stress (Cohen) | 4 | 0-4 | Calibrate goal-pushing aggressiveness |
| SCS-SF Self-Compassion (Neff) | 6 | 1-5 | Determine mentor tone — harsh vs gentle |
| Brief IPC Locus of Control (Levenson) | 3 | 1-6 | Frame insights as agency vs coping |

### Existing Profiling Sections (59 questions)

Embedded via the existing `ProfilingWizard` component:

1. **Goal** (3 questions) — domain, importance, urgency
2. **Wellbeing** (15 questions) — PERMA Profiler (Butler & Kern, 2016)
3. **Your Baseline** (17 questions) — NEW section (see above)
4. **Personality** (10 questions) — TIPI (Gosling et al., 2003)
5. **Drive** (8 questions) — Short Grit Scale (Duckworth & Quinn, 2009)
6. **Satisfaction** (5 questions) — SWLS (Diener et al., 1985)
7. **Needs** (12 questions) — BPNS (Deci & Ryan)
8. **Style** (6 questions) — Custom behavioural profiling

**Total: ~76 questions across 8 sections.**

---

## Card 4: Check-ins — Your Daily Story

**Purpose:** Explain check-ins, why they matter, and walk through the first one.

### Sub-screen 1: Explanation

- **Headline:** "Check-ins build your daily story"
- **Subheadline:** "This is how Opt In knows what's happening in your life."
- **4 blocks:**
  1. **The what** — Rate mood and 8 dimensions daily. ~2 minutes.
  2. **The why** — How we know when, where, and how to help. Without them, we're guessing.
  3. **The when** — Whenever suits you. We learn your rhythm and nudge at the right time.
  4. **Missed a day?** — No stress. Quick catch-up when you return.
- **CTA:** "Let's do your first one"

### Sub-screen 2: First Check-in

- Embeds existing `CheckInForm` with `MoodSegment` (1-10 numbered selector, not slider)
- Default to `DurationType.Quick` with option to expand
- Tooltip hint on mood segment: "Tap the number that matches how you're feeling right now"
- Journal prompt active with smart-prompts

### Sub-screen 3: Celebration

- **Headline:** "Your first check-in — done!"
- Confetti or Life Orb pulse animation
- **Body:** "Do this every day and you'll see patterns within a week."
- **CTA:** "Next"

---

## Card 5: Streaks — Build Your Habits

**Purpose:** Explain streaks and let users create their first custom streak.

**Content:**
- **Headline:** "Streaks keep you accountable"
- **Subheadline:** "Every day you check in, your streak grows."
- **Visual:** Animated `StreakCounter` showing 0 → 1
- **3 blocks:**
  1. **Daily streak** — Check in daily, longest streak tracked forever.
  2. **Streak freeze** — One free freeze per week for missed days.
  3. **Custom streaks** — Add your own for anything — meditation, no alcohol, gym, reading, etc.
- **Interactive element:** Add first custom streak — input field + category picker + "Add streak" button
- **CTA:** "Next"

---

## Card 6: Connect Your World

**Purpose:** Thank them, encourage app connections for richer data.

**Content:**
- **Headline:** "Thank you for sharing your story"
- **Subheadline:** "You've given us an incredible foundation. Now let's make it even better."
- **Body:** "Check-ins tell us how you *feel* — your apps tell us what's actually *happening*."
- **Integration cards grid:**
  - Apple Health — "Sleep, steps, heart rate"
  - Strava — "Workouts and fitness trends"
  - Spotify — "Listening habits and mood patterns"
  - Google Calendar — "How you spend your time"
  - Slack — "Work communication patterns"
  - Notion — "Learning and knowledge work"
  - Instagram — "Social activity"
  - Banking (Open Banking) — "Spending patterns"
- Each card has Connect button → existing OAuth flows. Green checkmark when connected.
- **Skip option:** "I'll do this later in Settings"
- **CTA:** "Next"

---

## Card 7: Dashboard & Goal Setting

**Purpose:** Tour the dashboard and set a first goal.

### Sub-screen 1: Dashboard Tour

- **Headline:** "Your command centre"
- **Subheadline:** "Everything about your life, in one place."
- Stylised dashboard preview with annotated callouts:
  1. **Wheel of Life** — 8 dimensions at a glance
  2. **Streak Counter** — Daily commitment
  3. **Insight Cards** — AI observations that get smarter daily
  4. **Trend Charts** — Score movement over time
  5. **Correlation Cards** — Hidden connections (e.g. sleep → productivity lag)
- **CTA:** "Now let's set a goal"

### Sub-screen 2: First Goal

- **Headline:** "What do you want to achieve?"
- **Subheadline:** "Goals can be aspirational or practical. Dream big or tackle something tough."
- **Preset inspiration cards (tappable):**
  - "Save $10,000" (finance)
  - "Run a half marathon" (fitness)
  - "Read 24 books this year" (growth)
  - "Quit smoking" (health)
  - "Get promoted" (career)
  - "Stop abusing substances" (health)
  - "Improve my relationship" (romance)
- Below presets: full goal creation form (title, description, horizon, tracking type, target date, AI pathway option)
- **Skip option:** "I'll set goals later"
- **CTA:** "Save goal & continue"

---

## Card 8: Your AI Companion

**Purpose:** Explain the AI mentor system and what unfolds as they use the app.

**Content:**
- **Headline:** "You're not doing this alone"
- **Subheadline:** "As we learn about you, something special happens."
- **3 progressive blocks:**
  1. **Insights first** — From day one, AI-generated insights from check-ins — trends, correlations, suggestions.
  2. **Then your mentor evolves** — After enough data, a personalised AI companion shaped to their needs:
     - **A therapist** — reflective, Socratic, wisdom-based (Stoic archetype)
     - **A coach** — action-oriented, goal-focused, accountability-driven (Coach archetype)
     - **A friend** — warm, supportive, conversational (adjusted Sage archetype)
     - Or a blend — based on personality profile, needs scores, and responsiveness.
  3. **It grows with you** — Remembers conversations, tracks progress, adapts approach as life changes.
- **Visual:** Life Orb with gentle pulsing animation
- **CTA:** "Start my journey" → redirect to `/dashboard`

---

## Technical Notes

### Component Architecture

- New `OnboardingFlow` component wraps all 8 cards
- Each card is a separate component: `WelcomeCard`, `ExpectationsCard`, `ProfilingCard`, `CheckInIntroCard`, `StreaksCard`, `ConnectAppsCard`, `DashboardTourCard`, `AIMentorCard`
- Existing `ProfilingWizard` is refactored to be embeddable within Card 3 (remove its own layout/chrome)
- Card transitions: CSS `translateX` with spring-like easing
- Progress indicator: top bar showing card progress (1/8) separate from the profiling wizard's own progress bar

### State Management

- Overall flow position saved to onboarding session (existing API: `/api/onboarding/status`, `/api/onboarding/start`)
- Guest users: `localStorage` (existing pattern)
- New fields on onboarding session: `current_card` (1-8), `first_checkin_completed`, `first_streak_created`, `first_goal_created`, `apps_connected[]`

### New Profiling Questions

- Add 17 questions to `packages/core` question definitions
- New section `baseline` in `SECTIONS` array
- New scoring functions in `packages/core/src/profiling/psychometric-scoring.ts`
- New types: `ChronotypeScore`, `SleepQualityScore`, `StressScore`, `SelfCompassionScore`, `LocusOfControlScore`

### Database Changes

- Extend `onboarding_sessions` (or equivalent state table) with `current_card` field
- New psychometric columns/JSONB for baseline scores

### Reused Existing Components

- `StreakCounter` (dashboard)
- `CheckInForm` with `MoodSegment` (check-in)
- `Life Orb` (dashboard)
- `AppleHealthImport` (connectors)
- All OAuth flows (API routes already exist for Strava, Spotify, Google, Slack, etc.)
