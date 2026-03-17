# Development Round 2 — Design Spec

**Date:** 2026-03-17
**Status:** Approved
**Author:** Aaron + Claude

---

## Objective

Execute three sequential phases to consolidate prior work, rebuild the onboarding experience, and implement the full predictive engine.

---

## Phase 1: Branch Consolidation

### Goal
Merge both outstanding feature branches to `main` and establish a clean baseline.

### Steps

1. **Merge `feature/visual-design-system` → `main`**
   - 37 commits: full design token system, new UI component library, migration of all pages to design system, Storybook setup, Schedule page (DayView/WeekView), Phosphor Icons
   - Resolve any conflicts with existing `main`

2. **Merge `feature/voice-mentors` → `main`**
   - 16 commits on top of visual-design: ElevenLabs TTS proxy, `useElevenLabsTTS` hook, MentorAvatar component, VoiceSettingsPanel, archetype resolution, code review fixes
   - This branch already includes the visual-design-system merge

3. **Post-merge cleanup**
   - Delete local and remote feature branches
   - Remove `.worktrees/visual-design-system` and `.worktrees/voice-mentors`
   - Verify: `pnpm install`, `pnpm build`, `pnpm test` all pass on unified `main`

### Risks
- Merge conflicts in shared files (middleware.ts, schema.ts, navigation)
- Build failures from incompatible dependencies between branches
- Mitigation: merge visual-design first (foundation), then voice-mentors (builds on it)

---

## Phase 2: Onboarding Rebuild

### Goal
Replace the voice-first conversational onboarding with a clean, traditional multi-step form that works on all browsers and gets users to the dashboard in under 30 seconds.

### Current Problems
- Missing video assets (`brain-cinematic.mp4`, `beach-hero.mp4`) degrade first impression
- Speech Recognition only works in Chrome/Edge (~70% of users)
- Duplicate component files (`onboarding-client.tsx` + `voice-onboarding-agent.tsx`)
- No progress indicator, no back navigation
- Complex AI extraction logic is fragile
- Over-engineered for what should be a simple profile capture

### Architecture

**Replace** `apps/web/src/components/onboarding/voice-onboarding-agent.tsx` (519 lines) with a simpler `apps/web/src/components/onboarding/onboarding-wizard.tsx`.

**Keep:**
- `FlowStateProvider` context (simplify states to match new flow)
- `GUEST_ONBOARDED_COOKIE` middleware gate (unchanged)
- Guest mode localStorage persistence via `GuestProvider`
- Mentor card voice preview (from voice-mentors branch)

**Delete:**
- `apps/web/src/components/onboarding-client.tsx` (old duplicate, unused)
- `apps/web/src/components/cinematic-opener.tsx` (old duplicate in root components/)
- Speech recognition dependency in onboarding flow
- Video file requirements and `BeachBackground` if only used here
- Complex AI profile extraction logic

### New Onboarding Flow (5 steps)

#### Step 1: Welcome
- App name + tagline, centered layout
- Subtle gradient background using design system tokens
- Single "Get Started" CTA button
- No video, no heavy animation

#### Step 2: Your Name
- Heading: "What should we call you?"
- Single text input (first name), auto-focused
- Continue button (disabled until name entered)
- Back arrow in header

#### Step 3: About You
- Profession text input (required)
- Optional interest tag chips (pre-defined categories + custom input)
- Optional postcode/location
- These feed downstream AI mentor context and dimension weighting

#### Step 4: Choose Your Mentor
- Three `MentorCard` components (reuse from voice-mentors work)
- Eleanor (Compassionate Therapist), Theo (Focused Coach), Maya (Reflective Sage)
- Voice preview via "Hear Voice" button (ElevenLabs TTS with browser fallback)
- Select one → highlight with accent ring
- Brief description of each mentor's personality and approach

#### Step 5: Complete
- "Welcome, {name}!" confirmation with selected mentor avatar
- Brief summary: "Your mentor {mentorName} is ready to help you track your life dimensions"
- "Go to Dashboard" CTA
- On completion:
  - Save profile to `GuestProvider` context (localStorage) for guests
  - For authed users: save to Supabase `profiles` table
  - Mentor selection: save to `user_mentors` table or localStorage
  - Set `GUEST_ONBOARDED_COOKIE`

### Progress Indicator
- Dot indicators at bottom: `● ● ○ ○ ○` (filled = completed/current, empty = upcoming)
- Step label in header: "Step 2 of 5"
- Back navigation arrow on steps 2-5

### File Manifest

#### New Files
| File | Purpose |
|------|---------|
| `apps/web/src/components/onboarding/onboarding-wizard.tsx` | Main wizard component with 5-step flow |
| `apps/web/src/components/onboarding/steps/welcome-step.tsx` | Step 1: Welcome screen |
| `apps/web/src/components/onboarding/steps/name-step.tsx` | Step 2: Name input |
| `apps/web/src/components/onboarding/steps/about-step.tsx` | Step 3: Profession + interests |
| `apps/web/src/components/onboarding/steps/mentor-step.tsx` | Step 4: Mentor selection with voice preview |
| `apps/web/src/components/onboarding/steps/complete-step.tsx` | Step 5: Confirmation + redirect |
| `apps/web/src/components/onboarding/progress-dots.tsx` | Step indicator dots component |

#### Modified Files
| File | Change |
|------|--------|
| `apps/web/src/app/` (login or onboarding route) | Point to new `onboarding-wizard.tsx` |
| `FlowStateProvider` | Simplify states: `welcome → name → about → mentor → complete → dashboard` |

#### Deleted Files
| File | Reason |
|------|--------|
| `apps/web/src/components/onboarding-client.tsx` | Old duplicate, unused |
| `apps/web/src/components/cinematic-opener.tsx` | Old duplicate in root components/ |
| `apps/web/src/components/onboarding/voice-onboarding-agent.tsx` | Replaced by onboarding-wizard |
| `public/videos/brain-cinematic.mp4` (if exists) | No longer needed |
| `public/videos/beach-hero.mp4` (if exists) | No longer needed |

### Design Principles
- Works on all browsers (no Speech Recognition dependency)
- Fast: user to dashboard in < 30 seconds
- Uses design system tokens (from Phase 1 merge)
- Leverages MentorCard + voice preview (from Phase 1 merge)
- Progressive: minimal required fields, everything else discoverable in-app

---

## Phase 3: Predictive Engine (Full Build)

### Goal
Implement all 6 subsystems from the approved predictive engine spec (`docs/superpowers/specs/2026-03-16-predictive-engine-design.md`, Rev 3).

### Reference Spec
This phase implements the spec exactly as written. No modifications to the approved design. The spec defines:

- **19 new files** across 6 subsystems
- **4 modified files**
- **0 new npm dependencies** (Dexie already installed)
- **6 new Dexie tables** (version 4 migration)

### Subsystem Summary

#### Subsystem 1: Foundation — Types & Persistence
- `apps/web/src/lib/ml/types.ts` — 11 interfaces/types for ML pipeline
- `apps/web/src/lib/db/schema.ts` — Version 4 migration with `featureLogs`, `mlModelWeights`, `guardianLogs`, `seasons`, `normalisationStats`, `spotifyReflections` tables
- Add `ai_accepted` field to `DBCheckIn`

#### Subsystem 2: Feature Pipeline
- `apps/web/src/lib/ml/normalization-store.ts` — Rolling stats persistence (Dexie-backed)
- `apps/web/src/lib/ml/feature-pipeline.ts` — `FeaturePipeline` class: Z-score normalization, cyclic time encoding, missing data imputation
- Feature confidence gate: skip predictions when < 30% real data

#### Subsystem 3: Local Inference Engine
- `apps/web/src/lib/ml/trainer.ts` — `LocalTrainer` with 3-tier pipeline (cold → warm → personalised)
- `apps/web/src/workers/training-worker.ts` — Separate Web Worker for numerical ML
- `apps/web/src/lib/ml/training-client.ts` — Worker client wrapper (like `AILocalClient`)
- `apps/web/src/lib/ml/models/weights.json` — Default heuristic weights
- Pure TypeScript gradient boosting (~300 lines, no XGBoost-WASM)
- Model versioning with rollback, `navigator.locks` for concurrency

#### Subsystem 4: Predictive UI
- `ghost-slider.tsx` — Dual-handle slider (ghost prediction + user actual)
- `predictive-slider-group.tsx` — 8-dimension predictor with "Confirm AI Predictions" button
- `explainability-tooltip.tsx` — Top 2-3 feature weights in human-readable form
- `spotify-reflection.tsx` — Active listening reflection during check-in
- Mode A (predictions available): 12-step wizard collapses to 5-6 steps
- Mode B (cold start): existing wizard unchanged
- Anti-anchoring safeguard: Save disabled until user interacts

#### Subsystem 5: Guardian Agent
- `apps/web/src/lib/agents/guardian-core.ts` — Anomaly detection (burnout, isolation, flow state)
- `apps/web/src/lib/agents/action-synthesizer.ts` — Contextual intervention generator
- `apps/web/src/components/notifications/guardian-alert.tsx` — Level 3 intervention modal
- 3-level escalation: observe → nudge → intervene
- Feedback loop: decreases proactivity if ignored

#### Subsystem 6: Life Seasons
- `apps/web/src/lib/context/season-manager.ts` — Season definitions + transition logic
- `apps/web/src/lib/ml/modifiers.ts` — Season bias application
- `apps/web/src/components/settings/season-selector.tsx` — Season picker in Settings
- 4 seasons: Sprint, Recharge, Exploration, Maintenance
- Weighted balance index, Guardian threshold adjustment

### Build Sequence (from spec)
```
Subsystem 1 (Types + DB)
    │
    ▼
Subsystem 2 (Feature Pipeline)
    │
    ▼
Subsystem 3 (Training Engine)
    │
    ├──► Subsystem 4 (Predictive UI)     [parallel]
    │
    └──► Subsystem 5a (Guardian Agent)    [parallel]
              │
              ▼
         Subsystem 5b → 6 (Life Seasons)
```

### Spotify Connector Gap
The spec notes that the Spotify connector (`packages/core/src/connectors.ts`) needs a new `extractSpotifyAudioFeatures()` method for valence/energy. Spotify deprecated `/v1/audio-features` in Nov 2024 — use `/v1/tracks` endpoint instead.

---

## Complete Phase Sequence

```
Phase 1: Branch Consolidation
  ├── Merge visual-design-system → main
  ├── Merge voice-mentors → main
  └── Cleanup worktrees, verify build
        │
        ▼
Phase 2: Onboarding Rebuild
  ├── Create onboarding-wizard.tsx (5-step flow)
  ├── Delete old onboarding components
  └── Test on all browsers
        │
        ▼
Phase 3: Predictive Engine
  ├── Subsystem 1: Types + DB v4 migration
  ├── Subsystem 2: Feature Pipeline
  ├── Subsystem 3: Training Engine + Web Worker
  ├── Subsystem 4: Predictive UI (parallel with 5)
  ├── Subsystem 5: Guardian Agent
  └── Subsystem 6: Life Seasons
```

---

## Out of Scope (This Round)

- Calendar/schedule CRUD (create/edit/delete schedule blocks)
- Embedding persistence pipeline (P2 TODO)
- PostHog telemetry (P3 TODO)
- Push notification infrastructure
- Cross-device model sync
- XGBoost-WASM upgrade
- Mobile app store builds

---

## Success Criteria

1. Both feature branches merged to `main` with passing build + tests
2. Onboarding flow works on Chrome, Firefox, Safari, Edge — under 30 seconds to dashboard
3. All 6 predictive engine subsystems implemented and tested
4. Ghost sliders reduce check-in from 12 steps to 5-6 steps (when predictions available)
5. Guardian agent detects anomalies and surfaces nudges
6. Life seasons adjustable via Settings
