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
- `FlowStateProvider` context (rewrite `OnboardingStep` union and `stepOrder` to match new flow)
- `GUEST_ONBOARDED_COOKIE` middleware gate (unchanged)
- Guest mode localStorage persistence via `GuestProvider`
- Mentor card voice preview (browser TTS only during onboarding — see Voice Preview Note below)

**Delete:**
- `apps/web/src/app/(protected)/onboarding/onboarding-client.tsx` (old form-based onboarding, unused)
- `apps/web/src/components/onboarding/cinematic-opener.tsx` (video opener component)
- `apps/web/src/components/cinematic-opener/index.ts` (barrel re-export for above)
- Speech recognition dependency in onboarding flow
- Video file requirements and `BeachBackground` if only used here
- Complex AI profile extraction logic from `apps/web/src/lib/onboarding-session.ts`

**Voice Preview Note:** The `/api/tts` route requires Supabase authentication, which onboarding users don't have yet. The "Hear Voice" button in Step 4 uses **browser `speechSynthesis` only** (not ElevenLabs). The `useElevenLabsTTS` hook already handles this gracefully — when `/api/tts` returns 401/503, it falls back to browser TTS silently. No special handling needed.

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
- Optional interest tag chips from pre-defined list: `['Fitness', 'Meditation', 'Career Growth', 'Relationships', 'Finance', 'Creative Arts', 'Travel', 'Cooking', 'Reading', 'Music', 'Parenting', 'Entrepreneurship']` + custom text input for unlisted interests
- Optional postcode/location
- These feed downstream AI mentor context and dimension weighting

#### Step 4: Choose Your Mentor
- Three `MentorCard` components (reuse from voice-mentors work)
- Eleanor (Compassionate Therapist), Theo (Focused Coach), Maya (Reflective Sage)
- Voice preview via "Hear Voice" button (browser TTS — ElevenLabs requires auth, which onboarding users don't have)
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
| `apps/web/src/app/(protected)/onboarding/page.tsx` | Import and render new `onboarding-wizard.tsx` instead of old client |
| `apps/web/src/components/onboarding/flow-state.tsx` | Rewrite `OnboardingStep` union type to `'welcome' \| 'name' \| 'about' \| 'mentor' \| 'complete'` and update `stepOrder` array. Simplify `goBack()` logic (remove `isVideoComplete` special case). |
| `apps/web/src/lib/onboarding-session.ts` | Update session schema to match new step names. Clear old localStorage session key on first load (migration: if old key exists, delete it and start fresh). |

#### Deleted Files
| File | Reason |
|------|--------|
| `apps/web/src/app/(protected)/onboarding/onboarding-client.tsx` | Old form-based onboarding, replaced by wizard |
| `apps/web/src/components/onboarding/cinematic-opener.tsx` | Video opener component, no longer needed |
| `apps/web/src/components/cinematic-opener/index.ts` | Barrel re-export for cinematic opener |
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

- **17 new files** across 6 subsystems
- **4 modified files**
- **0 new npm dependencies** (Dexie already installed)
- **6 new Dexie tables** (version **5** migration — version 4 is already taken by `scheduleBlocks` from the visual-design-system branch)

### Subsystem Summary

#### Subsystem 1: Foundation — Types & Persistence
- `apps/web/src/lib/ml/types.ts` — 11 interfaces/types for ML pipeline
- `apps/web/src/lib/db/schema.ts` — **Version 5** migration (v4 is taken by `scheduleBlocks`) with `featureLogs`, `mlModelWeights`, `guardianLogs`, `seasons`, `normalisationStats`, `spotifyReflections` tables
- Add `ai_accepted` field to `DBCheckIn`
- **Note:** The companion predictive engine spec (Rev 3) references "version 4" — the implementation must use version 5 instead. This is the only deviation from the approved spec.

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
- `apps/web/src/lib/agents/action-synthesizer.ts` — Contextual intervention generator with `ActionSynthesizer.generate(trigger: { triggerType: GuardianLogEntry['triggerType']; dimensionsAffected: Dimension[]; topFeatures: FeatureWeight[] }): string`
- `apps/web/src/components/notifications/guardian-alert.tsx` — Level 3 intervention modal
- 3-level escalation: observe → nudge → intervene
- Feedback loop: decreases proactivity if ignored

#### Subsystem 6: Life Seasons
- `apps/web/src/lib/context/season-manager.ts` — Season definitions + transition logic
- `apps/web/src/lib/ml/modifiers.ts` — Season bias application. **Note:** `SeasonRecord.weights` is `Record<Dimension, number>` but `computeWeightedScore()` in `@life-design/core/scoring.ts` takes parallel `number[]` arrays. The modifiers module must include a `seasonWeightsToArray(weights: Record<Dimension, number>): number[]` helper that converts using the `ALL_DIMENSIONS` ordering from `@life-design/core`.
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
  ├── Subsystem 1: Types + DB v5 migration
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

## Implementation Notes

### Predictive Engine — Ghost Slider confidence source
The Ghost Slider visual state (solid vs dotted/muted) is driven by **`PredictionResult.confidence[dimension]`** as the primary signal. When `ModelWeightsRecord.subjectivityGaps[dimension]` exceeds a threshold (dampening factor > 0.3), the confidence value for that dimension is clamped to max 0.5, which triggers the "low confidence" dotted visual state. The trainer is responsible for baking the subjectivity gap into the confidence score before it reaches the UI.

### Predictive Engine — Spotify audio features deprecation
The Spotify `/v1/audio-features` and embedded `audio_features` on `/v1/tracks` were both deprecated in Nov 2024. The implementer should verify the current Spotify Web API at implementation time. If valence/energy are no longer available, the `audio_valence` and `audio_energy` fields in `NormalisedMLFeatures` should use imputation (default 0.5) and the `SpotifyReflection` component should rely on the user's subjective mood response instead of raw API audio features.

### Predictive Engine — Season history pagination
The season selector UI should display at most the **10 most recent** seasons. No infinite scroll or pagination needed — seasons change infrequently (monthly at most).

### Testing strategy
- Phase 2 (Onboarding): Create `apps/web/src/components/onboarding/__tests__/onboarding-wizard.test.tsx` with tests for step navigation, back button, form validation, and profile persistence.
- Phase 3 (Predictive Engine): Each subsystem should have co-located tests following the existing pattern (`__tests__/` directories). The companion spec's implementation plan (to be written) will define specific test files per subsystem.

---

## Success Criteria

1. Both feature branches merged to `main` with passing build + tests
2. Onboarding flow works on Chrome, Firefox, Safari, Edge — under 30 seconds to dashboard
3. All 6 predictive engine subsystems implemented and tested
4. Ghost sliders reduce check-in from 12 steps to 5-6 steps (when predictions available)
5. Guardian agent detects anomalies and surfaces nudges
6. Life seasons adjustable via Settings
