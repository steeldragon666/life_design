# Development Round 2 — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge two feature branches to main, rebuild onboarding as a 5-step traditional wizard, and implement the full predictive engine (6 subsystems) from the approved spec.

**Architecture:** Three sequential phases. Phase 1 consolidates branches. Phase 2 replaces voice-first onboarding with a clean multi-step form using the existing `FlowStateProvider` pattern. Phase 3 builds on-device ML (types → feature pipeline → training engine → predictive UI + guardian agent + life seasons) following the dependency graph from the predictive engine spec.

**Tech Stack:** Next.js 15 / React 19, TypeScript, Dexie 4 (IndexedDB), Vitest + React Testing Library, Web Workers, `@life-design/core` enums/scoring, TailwindCSS.

**Spec:** `docs/superpowers/specs/2026-03-17-development-round-2-design.md`
**Predictive Engine Spec:** `docs/superpowers/specs/2026-03-16-predictive-engine-design.md`

---

## Chunk 1: Phase 1 — Branch Consolidation

### Task 1: Merge `feature/visual-design-system` → `main`

**Files:**
- No file creation — git merge operation

- [ ] **Step 1: Verify clean working tree on `main`**

Run: `git status`
Expected: On branch `main`, clean working tree

- [ ] **Step 2: Merge visual-design-system into main**

```bash
git merge feature/visual-design-system --no-ff -m "merge: integrate visual design system (37 commits)"
```
Expected: Merge succeeds. If conflicts arise, resolve them — likely in `apps/web/src/lib/db/schema.ts` (version 4 adds `scheduleBlocks`), navigation files, or middleware. Keep both sides' additions.

- [ ] **Step 3: Verify build passes**

```bash
pnpm install && pnpm build
```
Expected: Clean build, no errors

- [ ] **Step 4: Run tests**

```bash
pnpm test
```
Expected: All tests pass

---

### Task 2: Merge `feature/voice-mentors` → `main`

**Files:**
- No file creation — git merge operation

- [ ] **Step 1: Merge voice-mentors into main**

This branch already includes visual-design-system, so it should merge cleanly on top of Task 1.

```bash
git merge feature/voice-mentors --no-ff -m "merge: integrate voice mentors (16 commits)"
```
Expected: Clean merge. If conflicts occur, the voice-mentors branch is newer — prefer its versions for files it modified, keep main's additions for anything voice-mentors didn't touch.

- [ ] **Step 2: Verify build and tests**

```bash
pnpm install && pnpm build && pnpm test
```
Expected: All pass

---

### Task 3: Post-merge cleanup

- [ ] **Step 1: Delete worktrees**

```bash
git worktree remove .worktrees/visual-design-system
git worktree remove .worktrees/voice-mentors
```

- [ ] **Step 2: Delete local feature branches**

```bash
git branch -d feature/visual-design-system
git branch -d feature/voice-mentors
```

- [ ] **Step 3: Delete remote feature branches**

```bash
git push origin --delete feature/visual-design-system
git push origin --delete feature/voice-mentors
```

- [ ] **Step 4: Final verification**

```bash
pnpm install && pnpm build && pnpm test
```
Expected: Clean baseline on unified `main` with all design system, voice mentor, and schedule features.

---

## Chunk 2: Phase 2 — Onboarding Rebuild

### Existing Files Reference

Before starting, read these files to understand the current state (all paths relative to monorepo root):
- `apps/web/src/components/onboarding/flow-state.tsx` — `FlowStateProvider` with steps: `['video', 'theme', 'archetype', 'voice', 'conversation', 'complete']`
- `apps/web/src/lib/onboarding-session.ts` — Session persistence with `STEP_ORDER`, `OnboardingFlowSnapshot`, checksum validation
- `apps/web/src/app/(protected)/onboarding/page.tsx` — Currently renders `CinematicOpener` + `VoiceOnboardingAgent`
- `apps/web/src/lib/guest-context.tsx` — `GuestProvider` with `setProfile()`, `setMentorProfile()`, cookie: `life-design-guest-onboarded`

### File Structure (Phase 2)

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `apps/web/src/components/onboarding/progress-dots.tsx` | Dot indicators + step label |
| Create | `apps/web/src/components/onboarding/steps/welcome-step.tsx` | Step 1: Welcome screen |
| Create | `apps/web/src/components/onboarding/steps/name-step.tsx` | Step 2: Name input |
| Create | `apps/web/src/components/onboarding/steps/about-step.tsx` | Step 3: Profession + interests |
| Create | `apps/web/src/components/onboarding/steps/mentor-step.tsx` | Step 4: Mentor selection |
| Create | `apps/web/src/components/onboarding/steps/complete-step.tsx` | Step 5: Completion + redirect |
| Create | `apps/web/src/components/onboarding/onboarding-wizard.tsx` | Main wizard orchestrator |
| Create | `apps/web/src/components/onboarding/__tests__/onboarding-wizard.test.tsx` | Tests for wizard |
| Modify | `apps/web/src/components/onboarding/flow-state.tsx` | Rewrite step types + simplify logic |
| Modify | `apps/web/src/lib/onboarding-session.ts` | Update session schema + migration |
| Modify | `apps/web/src/app/(protected)/onboarding/page.tsx` | Wire new wizard |
| Delete | `apps/web/src/app/(protected)/onboarding/onboarding-client.tsx` | Old form-based onboarding |
| Delete | `apps/web/src/components/onboarding/voice-onboarding-agent.tsx` | Replaced by wizard |
| Delete | `apps/web/src/components/onboarding/cinematic-opener.tsx` | Video opener, no longer needed |
| Delete | `apps/web/src/components/cinematic-opener/index.ts` | Barrel re-export |

---

### Task 4: Rewrite FlowStateProvider for new step types

**Files:**
- Modify: `apps/web/src/components/onboarding/flow-state.tsx`
- Modify: `apps/web/src/lib/onboarding-session.ts`

- [ ] **Step 1: Rewrite `flow-state.tsx`**

Replace the `OnboardingStep` type, `FlowState` interface, `stepOrder`, and simplify all video-related logic. The new steps are `'welcome' | 'name' | 'about' | 'mentor' | 'complete'`.

Key changes:
- `OnboardingStep` becomes `'welcome' | 'name' | 'about' | 'mentor' | 'complete'`
- `stepOrder` becomes `['welcome', 'name', 'about', 'mentor', 'complete']`
- `FlowState` interface: remove `isVideoComplete`, `hasSkippedVideo`, `canSkipVideo`, `selectedTheme`, `selectedVoice`. Add `userName: string | null`, `profession: string | null`, `interests: string[]`, `postcode: string | null`, `selectedMentor: string | null`.
- `FlowContextType`: remove `markVideoComplete`, `skipVideo`, `enableVideoSkip`, `setTheme`, `setVoice`. Add `setUserName`, `setProfession`, `setInterests`, `setPostcode`, `setMentor`.
- `goBack()`: remove the `isVideoComplete` special case — back always goes to previous step.
- Keep `canGoBack = currentIdx > 0` (can't go back from welcome).
- Keep the `mounted` hydration guard, localStorage persistence via `patchQueueRef`, and `onComplete` callback.
- `goBack()` simplifies to: `if (currentIdx > 0) goToStep(stepOrder[currentIdx - 1])` — no special cases.

```typescript
export type OnboardingStep = 'welcome' | 'name' | 'about' | 'mentor' | 'complete';

export const stepOrder: OnboardingStep[] = ['welcome', 'name', 'about', 'mentor', 'complete'];

interface FlowState {
  currentStep: OnboardingStep;
  userName: string | null;
  profession: string | null;
  interests: string[];
  postcode: string | null;
  selectedMentor: string | null;
  isTransitioning: boolean;
}
```

The persistence `useEffect` should write the new shape:
```typescript
patchQueueRef.current.schedule({
  flow: {
    currentStep: state.currentStep,
    userName: state.userName,
    profession: state.profession,
    interests: state.interests,
    postcode: state.postcode,
    selectedMentor: state.selectedMentor,
  },
});
```

- [ ] **Step 2: Update `onboarding-session.ts`**

Key changes:
- Update `STEP_ORDER` to `['welcome', 'name', 'about', 'mentor', 'complete']`
- Bump `ONBOARDING_SESSION_VERSION` to `4`
- Update `OnboardingFlowSnapshot` interface:
  ```typescript
  export interface OnboardingFlowSnapshot {
    currentStep: OnboardingStep;
    userName: string | null;
    profession: string | null;
    interests: string[];
    postcode: string | null;
    selectedMentor: string | null;
  }
  ```
- Rewrite `sanitizeFlow()` to validate new fields instead of video/theme/archetype/voice
- Update `EMPTY_FLOW` to match new shape
- In `loadOnboardingSessionFromStorage()`, add migration: if old session has `isVideoComplete` or `selectedTheme` fields, delete it and return fresh session (clear the old key and start clean)
- The `ExtractedProfile` type import from `@/lib/onboarding-extraction` is still used in `OnboardingSessionPayload`. Keep the type import but remove any runtime dependency on extraction functions. The new flow doesn't need AI profile extraction.
- Keep `migrateLegacyOnboardingSession()` for now (handles v1/v2 sessions) but note that the v3→v4 version bump will automatically invalidate old sessions via checksum mismatch — no explicit migration code needed for the flow shape change.

**Note on `sanitizeFlow`:** The validation logic changes from checking video/theme/archetype/voice dependencies to simpler sequential validation:
```typescript
// If at 'about' step but no name, reset to 'name'
if (STEP_ORDER.indexOf(currentStep) >= STEP_ORDER.indexOf('about') && !userName) currentStep = 'name';
// If at 'mentor' step but no profession, reset to 'about'
if (STEP_ORDER.indexOf(currentStep) >= STEP_ORDER.indexOf('mentor') && !profession) currentStep = 'about';
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/web && pnpm type-check
```
Expected: May show errors in files that import the old `OnboardingStep` type (e.g., `page.tsx`, `voice-onboarding-agent.tsx`). That's expected — those files will be deleted or rewritten in subsequent tasks.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/onboarding/flow-state.tsx apps/web/src/lib/onboarding-session.ts
git commit -m "refactor: rewrite FlowStateProvider for 5-step onboarding wizard"
```

---

### Task 5: Create ProgressDots component

**Files:**
- Create: `apps/web/src/components/onboarding/progress-dots.tsx`

- [ ] **Step 1: Create progress-dots.tsx**

Import `stepOrder` from `flow-state.tsx` (exported in Task 4) to avoid duplication.

```typescript
'use client';

import { useFlowState, stepOrder } from './flow-state';

export default function ProgressDots() {
  const { currentStep } = useFlowState();
  const currentIdx = stepOrder.indexOf(currentStep);

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs text-[#A8A198] font-medium">
        Step {currentIdx + 1} of {stepOrder.length}
      </span>
      <div className="flex gap-2">
        {stepOrder.map((step, idx) => (
          <div
            key={step}
            className={`w-2 h-2 rounded-full transition-colors ${
              idx <= currentIdx ? 'bg-[#5A7F5A]' : 'bg-[#E8E4DD]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/onboarding/progress-dots.tsx
git commit -m "feat: add ProgressDots component for onboarding wizard"
```

---

### Task 6: Create step components (Welcome, Name, About)

**Files:**
- Create: `apps/web/src/components/onboarding/steps/welcome-step.tsx`
- Create: `apps/web/src/components/onboarding/steps/name-step.tsx`
- Create: `apps/web/src/components/onboarding/steps/about-step.tsx`

- [ ] **Step 1: Create welcome-step.tsx**

Centered layout with app name, tagline, and "Get Started" CTA. Uses design system tokens (subtle gradient). No video, no heavy animation. Calls `nextStep()` from `useFlowState()`.

```typescript
'use client';

import { useFlowState } from '../flow-state';

export default function WelcomeStep() {
  const { nextStep } = useFlowState();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#9BB89B] to-[#5A7F5A] flex items-center justify-center mb-6">
        <span className="text-white text-2xl">◉</span>
      </div>
      <h1 className="font-['Instrument_Serif'] text-4xl text-[#1A1816] mb-3">
        Life Design
      </h1>
      <p className="text-[#7D756A] text-lg max-w-md mb-8">
        Track your life dimensions, get AI-powered insights, and design the life you want.
      </p>
      <button
        onClick={nextStep}
        className="px-8 py-3 rounded-2xl bg-gradient-to-r from-[#5A7F5A] to-[#476447] text-white font-medium shadow-sm hover:shadow-md transition-all"
      >
        Get Started
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create name-step.tsx**

Heading: "What should we call you?". Single text input (first name), auto-focused. Continue button disabled until name entered. Uses `setUserName()` from `useFlowState()`.

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { useFlowState } from '../flow-state';

export default function NameStep() {
  const { userName, setUserName, nextStep } = useFlowState();
  const [name, setName] = useState(userName ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleContinue = () => {
    const trimmed = name.trim();
    if (trimmed) {
      setUserName(trimmed);
      nextStep();
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h2 className="font-['Instrument_Serif'] text-3xl text-[#1A1816] mb-2">
          What should we call you?
        </h2>
        <p className="text-sm text-[#A8A198]">Just your first name is fine</p>
      </div>
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
        placeholder="Your name"
        className="w-full px-4 py-3 rounded-xl bg-white border border-[#E8E4DD] text-[#3D3833] focus:outline-none focus:ring-2 focus:ring-[#9BB89B]/50 focus:border-[#9BB89B] placeholder:text-[#C4C0B8]"
        maxLength={50}
      />
      <button
        onClick={handleContinue}
        disabled={!name.trim()}
        className={`w-full px-6 py-3 rounded-2xl text-sm font-medium transition-all ${
          name.trim()
            ? 'bg-gradient-to-r from-[#5A7F5A] to-[#476447] text-white shadow-sm hover:shadow-md'
            : 'bg-[#F5F3EF] text-[#C4C0B8] cursor-not-allowed'
        }`}
      >
        Continue
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create about-step.tsx**

Profession text input (required). Optional interest tag chips from predefined list + custom input. Optional postcode. Uses `setProfession()`, `setInterests()`, `setPostcode()` from `useFlowState()`.

Interest tags: `['Fitness', 'Meditation', 'Career Growth', 'Relationships', 'Finance', 'Creative Arts', 'Travel', 'Cooking', 'Reading', 'Music', 'Parenting', 'Entrepreneurship']`

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { useFlowState } from '../flow-state';

const INTEREST_OPTIONS = [
  'Fitness', 'Meditation', 'Career Growth', 'Relationships',
  'Finance', 'Creative Arts', 'Travel', 'Cooking',
  'Reading', 'Music', 'Parenting', 'Entrepreneurship',
];

export default function AboutStep() {
  const { profession, interests, postcode, setProfession, setInterests, setPostcode, nextStep } = useFlowState();
  const [prof, setProf] = useState(profession ?? '');
  const [selected, setSelected] = useState<string[]>(interests ?? []);
  const [customInterest, setCustomInterest] = useState('');
  const [loc, setLoc] = useState(postcode ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const toggleInterest = (interest: string) => {
    setSelected((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest],
    );
  };

  const addCustomInterest = () => {
    const trimmed = customInterest.trim();
    if (trimmed && !selected.includes(trimmed)) {
      setSelected((prev) => [...prev, trimmed]);
      setCustomInterest('');
    }
  };

  const handleContinue = () => {
    const trimmedProf = prof.trim();
    if (trimmedProf) {
      setProfession(trimmedProf);
      setInterests(selected);
      setPostcode(loc.trim() || null);
      nextStep();
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h2 className="font-['Instrument_Serif'] text-3xl text-[#1A1816] mb-2">
          Tell us about you
        </h2>
        <p className="text-sm text-[#A8A198]">This helps your AI mentor give better advice</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#5C554C] mb-1">What do you do?</label>
          <input
            ref={inputRef}
            type="text"
            value={prof}
            onChange={(e) => setProf(e.target.value)}
            placeholder="e.g. Software Engineer, Teacher, Student"
            className="w-full px-4 py-3 rounded-xl bg-white border border-[#E8E4DD] text-[#3D3833] focus:outline-none focus:ring-2 focus:ring-[#9BB89B]/50 focus:border-[#9BB89B] placeholder:text-[#C4C0B8]"
            maxLength={100}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#5C554C] mb-2">
            Interests <span className="text-[#A8A198] font-normal">(optional)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((interest) => (
              <button
                key={interest}
                onClick={() => toggleInterest(interest)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  selected.includes(interest)
                    ? 'bg-[#5A7F5A] text-white'
                    : 'bg-[#F5F3EF] text-[#7D756A] hover:bg-[#E8E4DD]'
                }`}
              >
                {interest}
              </button>
            ))}
            {selected
              .filter((s) => !INTEREST_OPTIONS.includes(s))
              .map((custom) => (
                <button
                  key={custom}
                  onClick={() => toggleInterest(custom)}
                  className="px-3 py-1.5 rounded-full text-sm bg-[#5A7F5A] text-white"
                >
                  {custom} ×
                </button>
              ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={customInterest}
              onChange={(e) => setCustomInterest(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomInterest()}
              placeholder="Add your own..."
              className="flex-1 px-3 py-2 rounded-lg bg-white border border-[#E8E4DD] text-sm text-[#3D3833] focus:outline-none focus:ring-2 focus:ring-[#9BB89B]/50 placeholder:text-[#C4C0B8]"
              maxLength={40}
            />
            <button
              onClick={addCustomInterest}
              disabled={!customInterest.trim()}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-[#F5F3EF] text-[#7D756A] hover:bg-[#E8E4DD] disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#5C554C] mb-1">
            Location <span className="text-[#A8A198] font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={loc}
            onChange={(e) => setLoc(e.target.value)}
            placeholder="Postcode or city"
            className="w-full px-4 py-3 rounded-xl bg-white border border-[#E8E4DD] text-[#3D3833] focus:outline-none focus:ring-2 focus:ring-[#9BB89B]/50 focus:border-[#9BB89B] placeholder:text-[#C4C0B8]"
            maxLength={50}
          />
        </div>
      </div>

      <button
        onClick={handleContinue}
        disabled={!prof.trim()}
        className={`w-full px-6 py-3 rounded-2xl text-sm font-medium transition-all ${
          prof.trim()
            ? 'bg-gradient-to-r from-[#5A7F5A] to-[#476447] text-white shadow-sm hover:shadow-md'
            : 'bg-[#F5F3EF] text-[#C4C0B8] cursor-not-allowed'
        }`}
      >
        Continue
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/onboarding/steps/
git commit -m "feat: add Welcome, Name, About step components for onboarding"
```

---

### Task 7: Create MentorStep and CompleteStep

**Files:**
- Create: `apps/web/src/components/onboarding/steps/mentor-step.tsx`
- Create: `apps/web/src/components/onboarding/steps/complete-step.tsx`

- [ ] **Step 1: Create mentor-step.tsx**

Three mentor cards: Eleanor (Compassionate Therapist), Theo (Focused Coach), Maya (Reflective Sage). Voice preview via "Hear Voice" button using browser `speechSynthesis` (NOT ElevenLabs — onboarding users aren't authenticated). Select one → highlight with accent ring.

Reuse the `MentorCard` component from `apps/web/src/components/mentors/mentor-card.tsx` if its API fits, or create inline mentor cards for the onboarding context (simpler, no "Activate"/"Chat" actions).

**Note:** The MentorCard in `mentor-card.tsx` has `onActivate` and shows "Active/Chat" states — not suitable for onboarding. Create inline cards here.

```typescript
'use client';

import { useFlowState } from '../flow-state';

const MENTORS = [
  {
    id: 'therapist',
    name: 'Eleanor',
    archetype: 'Compassionate Therapist',
    description: 'Warm and empathetic. Eleanor helps you explore your feelings and find clarity through gentle questioning.',
    sampleText: 'I can see this has been weighing on you. Let us take a moment to explore what is really going on beneath the surface.',
  },
  {
    id: 'coach',
    name: 'Theo',
    archetype: 'Focused Coach',
    description: 'Direct and action-oriented. Theo pushes you to set goals, stay accountable, and make progress every day.',
    sampleText: 'Great work showing up today. Now let us look at what you can do differently tomorrow to move the needle.',
  },
  {
    id: 'sage',
    name: 'Maya',
    archetype: 'Reflective Sage',
    description: 'Thoughtful and philosophical. Maya encourages deep reflection and helps you see the bigger picture of your life.',
    sampleText: 'Consider this: the patterns in your life are not random. What story are they telling you about what truly matters?',
  },
] as const;

function handleVoicePreview(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

export default function MentorStep() {
  const { selectedMentor, setMentor, nextStep } = useFlowState();

  const handleSelect = (mentorId: string) => {
    setMentor(mentorId);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <h2 className="font-['Instrument_Serif'] text-3xl text-[#1A1816] mb-2">
          Choose your mentor
        </h2>
        <p className="text-sm text-[#A8A198]">Your AI mentor will guide your daily check-ins and insights</p>
      </div>

      <div className="space-y-3">
        {MENTORS.map((mentor) => (
          <button
            key={mentor.id}
            onClick={() => handleSelect(mentor.id)}
            className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
              selectedMentor === mentor.id
                ? 'border-[#5A7F5A] bg-[#F4F7F4] shadow-sm'
                : 'border-[#E8E4DD] bg-white hover:border-[#C4D5C4]'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-[#2A2623]">{mentor.name}</h3>
                <p className="text-xs text-[#9BB89B] font-medium">{mentor.archetype}</p>
                <p className="text-sm text-[#7D756A] mt-1">{mentor.description}</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleVoicePreview(mentor.sampleText);
                }}
                className="ml-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#F5F3EF] text-[#7D756A] hover:bg-[#E8E4DD] transition-colors shrink-0"
              >
                Hear Voice
              </button>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={nextStep}
        disabled={!selectedMentor}
        className={`w-full px-6 py-3 rounded-2xl text-sm font-medium transition-all ${
          selectedMentor
            ? 'bg-gradient-to-r from-[#5A7F5A] to-[#476447] text-white shadow-sm hover:shadow-md'
            : 'bg-[#F5F3EF] text-[#C4C0B8] cursor-not-allowed'
        }`}
      >
        Continue
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create complete-step.tsx**

Shows "Welcome, {name}!" with selected mentor summary. "Go to Dashboard" CTA. On mount: saves profile to `GuestProvider`, sets `GUEST_ONBOARDED_COOKIE`, saves mentor selection.

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFlowState } from '../flow-state';
import { useGuest } from '@/lib/guest-context';

const MENTOR_NAMES: Record<string, string> = {
  therapist: 'Eleanor',
  coach: 'Theo',
  sage: 'Maya',
};

const ARCHETYPE_MAP: Record<string, string> = {
  therapist: 'therapist',
  coach: 'coach',
  sage: 'sage',
};

export default function CompleteStep() {
  const router = useRouter();
  const { userName, profession, interests, postcode, selectedMentor } = useFlowState();
  const { setProfile, setMentorProfile } = useGuest();
  const savedRef = useRef(false);

  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;

    // Save profile. GuestProvider auto-assigns id='guest-user' if not provided.
    setProfile({
      name: userName ?? 'Friend',
      profession: profession ?? undefined,
      interests: interests.length > 0 ? interests : undefined,
      postcode: postcode ?? undefined,
      onboarded: true,
    } as any);

    // Save mentor selection
    if (selectedMentor) {
      setMentorProfile({
        archetype: ARCHETYPE_MAP[selectedMentor] ?? 'coach',
        characterName: MENTOR_NAMES[selectedMentor] ?? 'Theo',
      });
    }
  }, [userName, profession, interests, postcode, selectedMentor, setProfile, setMentorProfile]);

  const mentorName = selectedMentor ? MENTOR_NAMES[selectedMentor] : 'Your mentor';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#E4ECE4] to-[#C4D5C4] flex items-center justify-center mb-6">
        <span className="text-3xl">✓</span>
      </div>
      <h1 className="font-['Instrument_Serif'] text-3xl text-[#1A1816] mb-3">
        Welcome, {userName ?? 'Friend'}!
      </h1>
      <p className="text-[#7D756A] max-w-sm mb-8">
        Your mentor {mentorName} is ready to help you track your life dimensions and unlock your potential.
      </p>
      <button
        onClick={() => router.push('/dashboard')}
        className="px-8 py-3 rounded-2xl bg-gradient-to-r from-[#5A7F5A] to-[#476447] text-white font-medium shadow-sm hover:shadow-md transition-all"
      >
        Go to Dashboard
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/onboarding/steps/mentor-step.tsx apps/web/src/components/onboarding/steps/complete-step.tsx
git commit -m "feat: add MentorStep and CompleteStep components"
```

---

### Task 8: Create OnboardingWizard and wire page.tsx

**Files:**
- Create: `apps/web/src/components/onboarding/onboarding-wizard.tsx`
- Modify: `apps/web/src/app/(protected)/onboarding/page.tsx`

- [ ] **Step 1: Create onboarding-wizard.tsx**

The wizard orchestrates step rendering based on `useFlowState().currentStep`. It includes the back arrow header, ProgressDots, and step transition animation.

```typescript
'use client';

import { useFlowState } from './flow-state';
import ProgressDots from './progress-dots';
import WelcomeStep from './steps/welcome-step';
import NameStep from './steps/name-step';
import AboutStep from './steps/about-step';
import MentorStep from './steps/mentor-step';
import CompleteStep from './steps/complete-step';

function BackArrow({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg hover:bg-[#F5F3EF] transition-colors"
      aria-label="Go back"
    >
      <svg className="w-5 h-5 text-[#7D756A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
      </svg>
    </button>
  );
}

const STEP_COMPONENTS = {
  welcome: WelcomeStep,
  name: NameStep,
  about: AboutStep,
  mentor: MentorStep,
  complete: CompleteStep,
} as const;

export default function OnboardingWizard() {
  const { currentStep, canGoBack, goBack, isTransitioning } = useFlowState();
  const StepComponent = STEP_COMPONENTS[currentStep];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#FAFAF8] to-[#F5F3EF]">
      {/* Header */}
      {currentStep !== 'welcome' && (
        <header className="sticky top-0 z-50 px-4 py-4 md:px-8">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            {canGoBack ? <BackArrow onClick={goBack} /> : <div className="w-9" />}
            <ProgressDots />
            <div className="w-9" />
          </div>
        </header>
      )}

      {/* Step content */}
      <main
        className={`flex-1 px-4 py-6 md:px-8 md:py-8 transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
        key={currentStep}
      >
        <StepComponent />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite page.tsx**

Replace the entire `page.tsx` to use the new wizard. Remove all old imports (`CinematicOpener`, `BeachBackground`, `VoiceOnboardingAgent`, `StepDots`). The page becomes much simpler.

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGuest } from '@/lib/guest-context';
import { FlowStateProvider } from '@/components/onboarding/flow-state';
import OnboardingWizard from '@/components/onboarding/onboarding-wizard';

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { profile } = useGuest();

  useEffect(() => {
    if (profile?.onboarded) {
      router.push('/dashboard');
    }
  }, [profile, router]);

  if (profile?.onboarded) return null;
  return <>{children}</>;
}

export default function OnboardingPage() {
  return (
    <FlowStateProvider>
      <OnboardingGate>
        <OnboardingWizard />
      </OnboardingGate>
    </FlowStateProvider>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/web && pnpm type-check
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/onboarding/onboarding-wizard.tsx apps/web/src/app/\(protected\)/onboarding/page.tsx
git commit -m "feat: wire OnboardingWizard into onboarding page"
```

---

### Task 9: Delete old onboarding files

**Files:**
- Delete: `apps/web/src/app/(protected)/onboarding/onboarding-client.tsx`
- Delete: `apps/web/src/components/onboarding/voice-onboarding-agent.tsx`
- Delete: `apps/web/src/components/onboarding/cinematic-opener.tsx`
- Delete: `apps/web/src/components/cinematic-opener/index.ts` (if exists after merge)

- [ ] **Step 1: Verify no other files import these**

Search for imports of each file being deleted:
```bash
# Check each import across the codebase
grep -r "onboarding-client" apps/web/src/ --include="*.tsx" --include="*.ts" -l
grep -r "voice-onboarding-agent" apps/web/src/ --include="*.tsx" --include="*.ts" -l
grep -r "cinematic-opener" apps/web/src/ --include="*.tsx" --include="*.ts" -l
```
Expected: Only the files being deleted and possibly `page.tsx` (already rewritten). If other files import these, update them first.

- [ ] **Step 2: Delete the files**

```bash
rm apps/web/src/app/\(protected\)/onboarding/onboarding-client.tsx
rm apps/web/src/components/onboarding/voice-onboarding-agent.tsx
rm apps/web/src/components/onboarding/cinematic-opener.tsx
# Only if it exists:
rm -f apps/web/src/components/cinematic-opener/index.ts
```

Also check for and remove unused video files:
```bash
rm -f public/videos/brain-cinematic.mp4 public/videos/beach-hero.mp4
```

- [ ] **Step 3: Verify build**

```bash
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: delete old onboarding components (cinematic opener, voice agent, old client)"
```

---

### Task 10: Write onboarding wizard tests

**Files:**
- Create: `apps/web/src/components/onboarding/__tests__/onboarding-wizard.test.tsx`

- [ ] **Step 1: Write tests**

Test framework: Vitest + React Testing Library (matches existing patterns from `apps/web/src/__tests__/`).

Tests should cover:
1. Renders welcome step initially
2. Clicking "Get Started" advances to name step
3. Name input enables continue button
4. Back button works from name step
5. Cannot advance from about step without profession
6. Mentor selection highlights selected card
7. Complete step shows user name

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FlowStateProvider } from '../flow-state';
import OnboardingWizard from '../onboarding-wizard';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock guest context
vi.mock('@/lib/guest-context', () => ({
  useGuest: () => ({
    profile: null,
    setProfile: vi.fn(),
    setMentorProfile: vi.fn(),
  }),
}));

// Mock localStorage for session persistence
const mockStorage: Record<string, string> = {};
beforeEach(() => {
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => { mockStorage[key] = value; },
    removeItem: (key: string) => { delete mockStorage[key]; },
  });
});

function renderWizard() {
  return render(
    <FlowStateProvider>
      <OnboardingWizard />
    </FlowStateProvider>,
  );
}

describe('OnboardingWizard', () => {
  it('renders welcome step initially', async () => {
    renderWizard();
    await waitFor(() => {
      expect(screen.getByText('Life Design')).toBeDefined();
      expect(screen.getByText('Get Started')).toBeDefined();
    });
  });

  it('advances to name step on Get Started click', async () => {
    renderWizard();
    await waitFor(() => screen.getByText('Get Started'));
    fireEvent.click(screen.getByText('Get Started'));
    await waitFor(() => {
      expect(screen.getByText('What should we call you?')).toBeDefined();
    });
  });

  it('disables continue until name is entered', async () => {
    renderWizard();
    await waitFor(() => screen.getByText('Get Started'));
    fireEvent.click(screen.getByText('Get Started'));
    await waitFor(() => screen.getByText('Continue'));
    const continueBtn = screen.getByText('Continue');
    expect(continueBtn).toHaveProperty('disabled', true);

    const input = screen.getByPlaceholderText('Your name');
    fireEvent.change(input, { target: { value: 'Aaron' } });
    expect(continueBtn).toHaveProperty('disabled', false);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd apps/web && pnpm vitest run src/components/onboarding/__tests__/onboarding-wizard.test.tsx
```
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/onboarding/__tests__/onboarding-wizard.test.tsx
git commit -m "test: add onboarding wizard tests (step navigation, validation)"
```

---

## Chunk 3: Phase 3, Subsystems 1–2 — Foundation + Feature Pipeline

### Existing Files Reference

- `apps/web/src/lib/db/schema.ts` — After Phase 1 merge, this will be at version 4 with `scheduleBlocks` table. We add version 5.
- `packages/core/src/enums.ts` — `Dimension` enum (Career, Finance, Health, Fitness, Family, Social, Romance, Growth), `ALL_DIMENSIONS` array.
- `packages/core/src/scoring.ts` — `computeWeightedScore(scores[], weights[])`, `computeMovingAverage()`, `computeVolatility()`, `computeTrend()`.

### File Structure (Subsystems 1–2)

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `apps/web/src/lib/ml/types.ts` | All ML type definitions (11 interfaces/types) |
| Create | `apps/web/src/lib/ml/__tests__/types.test.ts` | Type validation tests |
| Create | `apps/web/src/lib/ml/normalization-store.ts` | Rolling stats persistence (Dexie-backed) |
| Create | `apps/web/src/lib/ml/feature-pipeline.ts` | `FeaturePipeline` class: Z-score → cyclic → imputation |
| Create | `apps/web/src/lib/ml/__tests__/feature-pipeline.test.ts` | Feature pipeline tests |
| Modify | `apps/web/src/lib/db/schema.ts` | Version 5 migration: 6 new tables + `ai_accepted` on DBCheckIn |

---

### Task 11: Create ML types

**Files:**
- Create: `apps/web/src/lib/ml/types.ts`

- [ ] **Step 1: Create the types file**

Copy the types exactly from the predictive engine spec (Section: Subsystem 1, Types). The file defines 11 interfaces/types:
- `NormalisedMLFeatures` — 16 numeric + 1 boolean feature vector
- `IFeatureExtractor` — Interface for feature extraction
- `TrainingPair` — Feature + label pair for training
- `PredictionResult` — Model output (scores, mood, confidence, topWeights)
- `FeatureWeight` — Single feature contribution for explainability
- `ModelTier` — `'cold' | 'warm' | 'personalized'`
- `ModelWeightsRecord` — Persisted model weights
- `FeatureLogRecord` — Daily feature snapshot
- `GuardianLogEntry` — Anomaly detection log
- `SeasonName` — `'Sprint' | 'Recharge' | 'Exploration' | 'Maintenance'`
- `SeasonRecord` — Season definition with weight matrix
- `NormalisationStatsRecord` — Per-feature rolling statistics
- `SpotifyReflectionRecord` — Listening reflection data
- `TrainerConfig` — Hyperparameters

Import `Dimension` from `@life-design/core` for type references.

Use British spelling: `Normalised`, `normalise` (matching existing codebase convention: `NormalisedFeature` in core).

- [ ] **Step 2: Create type validation test**

```typescript
// apps/web/src/lib/ml/__tests__/types.test.ts
import { describe, it, expect } from 'vitest';
import type {
  NormalisedMLFeatures,
  PredictionResult,
  ModelWeightsRecord,
  TrainingPair,
  FeatureLogRecord,
  GuardianLogEntry,
  SeasonRecord,
  TrainerConfig,
} from '../types';
import { Dimension } from '@life-design/core';

describe('ML Types', () => {
  it('NormalisedMLFeatures has all expected fields', () => {
    const features: NormalisedMLFeatures = {
      sleep_duration_score: 0.5, sleep_quality_score: 0.5,
      physical_strain: 0.5, recovery_status: 0.5,
      meeting_load: 0.5, context_switching_penalty: 0.5,
      deep_work_opportunity: 0.5, after_hours_work: 0.5,
      digital_fatigue: 0.5, doomscroll_index: 0.5,
      audio_valence: 0.5, audio_energy: 0.5,
      day_of_week_sin: 0, day_of_week_cos: 1,
      is_weekend: false,
      season_sprint: 0, season_recharge: 0, season_exploration: 0,
    };
    expect(Object.keys(features)).toHaveLength(18);
  });

  it('PredictionResult contains scores for all dimensions', () => {
    const result: PredictionResult = {
      scores: { [Dimension.Career]: 7 } as Record<Dimension, number>,
      mood: 7,
      confidence: { [Dimension.Career]: 0.8 } as Record<Dimension, number>,
      topWeights: { [Dimension.Career]: [] } as Record<Dimension, import('../types').FeatureWeight[]>,
    };
    expect(result.mood).toBe(7);
  });

  it('TrainerConfig has sensible defaults', () => {
    const config: TrainerConfig = {
      minSamplesWarm: 7,
      minSamplesPersonalised: 14,
      learningRate: 0.1,
      maxIterations: 50,
      maxDepth: 3,
      lossFunction: 'mse',
      validationSplit: 0.2,
    };
    expect(config.minSamplesWarm).toBeLessThan(config.minSamplesPersonalised);
  });
});
```

- [ ] **Step 3: Run test**

```bash
cd apps/web && pnpm vitest run src/lib/ml/__tests__/types.test.ts
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/ml/
git commit -m "feat: add ML type definitions for predictive engine (11 interfaces)"
```

---

### Task 12: Add Dexie version 5 migration

**Files:**
- Modify: `apps/web/src/lib/db/schema.ts`

- [ ] **Step 1: Read current schema.ts on main (after merge)**

Verify that version 4 already has `scheduleBlocks`. The file should end after `this.version(4).stores({ scheduleBlocks: ... })`.

- [ ] **Step 2: Add new table interfaces and version 5 migration**

Add these interfaces before the `LifeDesignDB` class:
- Import types from `../ml/types` (the types file created in Task 11)
- Add `ai_accepted?: boolean` to existing `DBCheckIn` interface
- Add table declarations to `LifeDesignDB` class: `featureLogs`, `mlModelWeights`, `guardianLogs`, `seasons`, `normalisationStats`, `spotifyReflections`
- Add `this.version(5).stores({...})` migration

Version 5 stores (following the v3 pattern of only declaring new/changed stores):
```typescript
this.version(5).stores({
  featureLogs: 'date, extractedAt',
  mlModelWeights: 'id, tier, version',
  guardianLogs: '++id, timestamp, triggerType',
  seasons: '++id, name, isActive',
  normalisationStats: 'feature',
  spotifyReflections: '++id, date',
});
```

Import the types from `../ml/types` for type annotations on the EntityTable declarations.

- [ ] **Step 3: Verify build compiles**

```bash
cd apps/web && pnpm type-check
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/db/schema.ts
git commit -m "feat: add Dexie v5 migration (6 ML tables, ai_accepted on DBCheckIn)"
```

---

### Task 13: Create NormalizationStore

**Files:**
- Create: `apps/web/src/lib/ml/normalization-store.ts`

- [ ] **Step 1: Create normalization-store.ts**

Dexie-backed persistence for rolling statistics. Reads/writes the `normalisationStats` table. Exposes:
- `getStats(feature: string): Promise<NormalisationStatsRecord | undefined>`
- `updateStats(feature: string, newValue: number): Promise<void>` — updates rolling mean, stddev, median using incremental calculation. Uses exponential moving average for the 30-day window (avoids storing all 30 raw values).
- `normalise(feature: string, rawValue: number): Promise<number>` — Z-score normalization with sigmoid clamping: `sigmoid(z) = 1 / (1 + exp(-z))`. Returns 0.5 if no stats yet.

Import `db` from `@/lib/db` (the singleton Dexie instance).

```typescript
import { db } from '@/lib/db';
import type { NormalisationStatsRecord } from './types';

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

export class NormalisationStore {
  async getStats(feature: string): Promise<NormalisationStatsRecord | undefined> {
    return db.normalisationStats.get(feature);
  }

  async normalise(feature: string, rawValue: number): Promise<number> {
    const stats = await this.getStats(feature);
    if (!stats || stats.stddev30d === 0 || stats.sampleCount < 2) return 0.5;
    const z = (rawValue - stats.mean30d) / stats.stddev30d;
    return sigmoid(z);
  }

  async updateStats(feature: string, newValue: number): Promise<void> {
    const existing = await this.getStats(feature);
    if (!existing) {
      await db.normalisationStats.put({
        feature,
        mean30d: newValue,
        stddev30d: 0,
        median: newValue,
        sampleCount: 1,
        lastUpdated: Date.now(),
      });
      return;
    }

    const n = Math.min(existing.sampleCount + 1, 30); // Cap at 30-day window
    const alpha = 1 / n; // EMA smoothing factor
    const newMean = existing.mean30d + alpha * (newValue - existing.mean30d);
    // Welford's online variance update
    const newVariance = (1 - alpha) * (existing.stddev30d ** 2 + alpha * (newValue - existing.mean30d) ** 2);
    const newStddev = Math.sqrt(Math.max(0, newVariance));

    await db.normalisationStats.put({
      feature,
      mean30d: newMean,
      stddev30d: newStddev,
      median: existing.median, // Approximate — exact median requires all values
      sampleCount: existing.sampleCount + 1,
      lastUpdated: Date.now(),
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/ml/normalization-store.ts
git commit -m "feat: add NormalisationStore with rolling Z-score normalization"
```

---

### Task 14: Create FeaturePipeline

**Files:**
- Create: `apps/web/src/lib/ml/feature-pipeline.ts`
- Create: `apps/web/src/lib/ml/__tests__/feature-pipeline.test.ts`

- [ ] **Step 1: Create feature-pipeline.ts**

Implements `IFeatureExtractor`. Three transformations:
1. Z-score normalization via `NormalisationStore`
2. Cyclic time encoding: `sin(2π·dayOfWeek/7)`, `cos(2π·dayOfWeek/7)`
3. Missing data imputation (historical median → 0.5 fallback)

Reads `connectedAppData` from Dexie for raw integration data. Calls `normalise()` from `NormalisationStore`. Outputs `NormalisedMLFeatures` + `FeatureLogRecord`.

Feature confidence gate: `featureConfidence = 1 - (imputedFields.length / totalNumericFields)`. If < 0.3, prediction should be skipped (caller checks this).

```typescript
import { db } from '@/lib/db';
import { NormalisationStore } from './normalization-store';
import type {
  NormalisedMLFeatures,
  IFeatureExtractor,
  FeatureLogRecord,
} from './types';

const NUMERIC_FEATURES: (keyof NormalisedMLFeatures)[] = [
  'sleep_duration_score', 'sleep_quality_score', 'physical_strain', 'recovery_status',
  'meeting_load', 'context_switching_penalty', 'deep_work_opportunity', 'after_hours_work',
  'digital_fatigue', 'doomscroll_index', 'audio_valence', 'audio_energy',
];

export class FeaturePipeline implements IFeatureExtractor {
  private store = new NormalisationStore();

  async extract(date: Date, _lookbackDays = 7): Promise<NormalisedMLFeatures> {
    const dateStr = date.toISOString().slice(0, 10);

    // Query raw integration data from Dexie
    const appData = await db.connectedAppData
      .where('syncedAt')
      .aboveOrEqual(new Date(date.getTime() - 24 * 60 * 60 * 1000))
      .toArray();

    // Extract raw signals from integration data
    const raw = this.extractRawSignals(appData);

    // Normalise each feature via Z-score
    const normalised: Partial<NormalisedMLFeatures> = {};
    const imputedFields: string[] = [];

    for (const feature of NUMERIC_FEATURES) {
      const rawValue = raw[feature];
      if (rawValue !== undefined && rawValue !== null) {
        normalised[feature] = await this.store.normalise(feature, rawValue as number);
        await this.store.updateStats(feature, rawValue as number);
      } else {
        imputedFields.push(feature);
      }
    }

    // Apply cyclic time encoding
    const dayOfWeek = date.getDay();
    normalised.day_of_week_sin = Math.sin((2 * Math.PI * dayOfWeek) / 7);
    normalised.day_of_week_cos = Math.cos((2 * Math.PI * dayOfWeek) / 7);
    normalised.is_weekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Season encoding (default: Maintenance = all zeros)
    normalised.season_sprint = 0;
    normalised.season_recharge = 0;
    normalised.season_exploration = 0;

    // Impute missing values
    const features = this.imputeMissing(normalised);

    // Compute confidence
    const featureConfidence = 1 - imputedFields.length / NUMERIC_FEATURES.length;

    // Save to feature log
    const logRecord: FeatureLogRecord = {
      date: dateStr,
      features,
      imputedFields,
      featureConfidence,
      extractedAt: Date.now(),
    };
    await db.featureLogs.put(logRecord);

    return features;
  }

  imputeMissing(raw: Partial<NormalisedMLFeatures>): NormalisedMLFeatures {
    const defaults: NormalisedMLFeatures = {
      sleep_duration_score: 0.5, sleep_quality_score: 0.5,
      physical_strain: 0.5, recovery_status: 0.5,
      meeting_load: 0.5, context_switching_penalty: 0.5,
      deep_work_opportunity: 0.5, after_hours_work: 0.5,
      digital_fatigue: 0.5, doomscroll_index: 0.5,
      audio_valence: 0.5, audio_energy: 0.5,
      day_of_week_sin: 0, day_of_week_cos: 1,
      is_weekend: false,
      season_sprint: 0, season_recharge: 0, season_exploration: 0,
    };
    return { ...defaults, ...raw };
  }

  /** Override in subclass or mock for testing. Extracts raw metrics from integration data. */
  private extractRawSignals(
    appData: { provider: string; processedMetrics: Record<string, number> }[],
  ): Partial<Record<string, number>> {
    const signals: Partial<Record<string, number>> = {};
    for (const entry of appData) {
      const metrics = entry.processedMetrics;
      // Map integration metrics to feature names
      if (metrics.sleep_duration !== undefined) signals.sleep_duration_score = metrics.sleep_duration;
      if (metrics.sleep_quality !== undefined) signals.sleep_quality_score = metrics.sleep_quality;
      if (metrics.physical_strain !== undefined) signals.physical_strain = metrics.physical_strain;
      if (metrics.recovery_status !== undefined) signals.recovery_status = metrics.recovery_status;
      if (metrics.meeting_load !== undefined) signals.meeting_load = metrics.meeting_load;
      if (metrics.context_switching !== undefined) signals.context_switching_penalty = metrics.context_switching;
      if (metrics.deep_work !== undefined) signals.deep_work_opportunity = metrics.deep_work;
      if (metrics.after_hours !== undefined) signals.after_hours_work = metrics.after_hours;
      if (metrics.audio_valence !== undefined) signals.audio_valence = metrics.audio_valence;
      if (metrics.audio_energy !== undefined) signals.audio_energy = metrics.audio_energy;
    }
    return signals;
  }
}

export async function getFeatureConfidence(date: Date): Promise<number> {
  const dateStr = date.toISOString().slice(0, 10);
  const log = await db.featureLogs.get(dateStr);
  return log?.featureConfidence ?? 0;
}
```

- [ ] **Step 2: Write tests**

```typescript
// apps/web/src/lib/ml/__tests__/feature-pipeline.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { FeaturePipeline } from '../feature-pipeline';
import type { NormalisedMLFeatures } from '../types';

describe('FeaturePipeline', () => {
  let pipeline: FeaturePipeline;

  beforeEach(() => {
    pipeline = new FeaturePipeline();
  });

  describe('imputeMissing', () => {
    it('fills all missing fields with 0.5 (numeric) or defaults', () => {
      const result = pipeline.imputeMissing({});
      expect(result.sleep_duration_score).toBe(0.5);
      expect(result.audio_valence).toBe(0.5);
      expect(result.is_weekend).toBe(false);
      expect(result.season_sprint).toBe(0);
    });

    it('preserves provided values', () => {
      const result = pipeline.imputeMissing({ sleep_duration_score: 0.8 });
      expect(result.sleep_duration_score).toBe(0.8);
    });
  });

  describe('cyclic encoding', () => {
    it('encodes Saturday and Sunday as adjacent', () => {
      // Saturday = 6, Sunday = 0
      const satSin = Math.sin((2 * Math.PI * 6) / 7);
      const sunSin = Math.sin((2 * Math.PI * 0) / 7);
      // They should be close in the cyclic space
      const satCos = Math.cos((2 * Math.PI * 6) / 7);
      const sunCos = Math.cos((2 * Math.PI * 0) / 7);
      // Euclidean distance in sin/cos space should be small
      const distance = Math.sqrt((satSin - sunSin) ** 2 + (satCos - sunCos) ** 2);
      expect(distance).toBeLessThan(1.0);
    });
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd apps/web && pnpm vitest run src/lib/ml/__tests__/feature-pipeline.test.ts
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/ml/feature-pipeline.ts apps/web/src/lib/ml/__tests__/feature-pipeline.test.ts
git commit -m "feat: add FeaturePipeline with Z-score normalization and cyclic encoding"
```

---

### Task 14b: Update Spotify Connector for audio features

**Files:**
- Modify: `packages/core/src/connectors.ts`

- [ ] **Step 1: Add extractSpotifyAudioFeatures method to SpotifyConnector**

The existing `SpotifyConnector` class in `packages/core/src/connectors.ts` maps diversity/curation/listening but NOT valence/energy. Add a method that uses the `/v1/tracks` endpoint (since `/v1/audio-features` was deprecated Nov 2024).

```typescript
// Add to SpotifyConnector class
async extractAudioFeatures(trackIds: string[]): Promise<{ valence: number; energy: number }[]> {
  if (trackIds.length === 0) return [];
  const url = `https://api.spotify.com/v1/tracks?ids=${trackIds.join(',')}`;
  const response = await this.safeFetch(url);
  if (!response?.tracks) return trackIds.map(() => ({ valence: 0.5, energy: 0.5 }));
  return response.tracks.map((track: any) => ({
    valence: track.audio_features?.valence ?? 0.5,
    energy: track.audio_features?.energy ?? 0.5,
  }));
}
```

**Note:** Spotify may have fully removed audio features from the `/v1/tracks` response. If so, default to imputation (0.5 for both) and rely on the `SpotifyReflection` user mood response instead. The `FeaturePipeline.extractRawSignals()` already handles missing values via imputation.

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/connectors.ts
git commit -m "feat: add Spotify audio features extraction (valence/energy) to connector"
```

---

## Chunk 4: Phase 3, Subsystem 3 — Training Engine

### File Structure (Subsystem 3)

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `apps/web/src/lib/ml/models/weights.json` | Default heuristic weights for cold start |
| Create | `apps/web/src/lib/ml/trainer.ts` | `LocalTrainer` class: 3-tier training pipeline |
| Create | `apps/web/src/workers/training-worker.ts` | Web Worker for off-thread ML |
| Create | `apps/web/src/lib/ml/training-client.ts` | Worker client (like `AILocalClient`) |
| Create | `apps/web/src/lib/ml/__tests__/trainer.test.ts` | Trainer tests |

---

### Task 15: Create default heuristic weights

**Files:**
- Create: `apps/web/src/lib/ml/models/weights.json`

- [ ] **Step 1: Create weights.json**

These are the cold-start heuristic weights. Each dimension maps to a set of feature weights based on domain knowledge (e.g., Health is influenced by sleep, Career by meeting load).

```json
{
  "career": {
    "meeting_load": -0.3,
    "deep_work_opportunity": 0.4,
    "context_switching_penalty": -0.25,
    "after_hours_work": -0.2,
    "sleep_quality_score": 0.15,
    "recovery_status": 0.1
  },
  "finance": {
    "after_hours_work": 0.15,
    "deep_work_opportunity": 0.2,
    "meeting_load": -0.1,
    "digital_fatigue": -0.1
  },
  "health": {
    "sleep_duration_score": 0.35,
    "sleep_quality_score": 0.3,
    "recovery_status": 0.25,
    "physical_strain": -0.2,
    "digital_fatigue": -0.15
  },
  "fitness": {
    "physical_strain": 0.3,
    "recovery_status": 0.2,
    "sleep_duration_score": 0.2,
    "sleep_quality_score": 0.15
  },
  "family": {
    "after_hours_work": -0.3,
    "meeting_load": -0.15,
    "deep_work_opportunity": -0.1,
    "recovery_status": 0.2
  },
  "social": {
    "meeting_load": 0.1,
    "digital_fatigue": -0.2,
    "doomscroll_index": -0.25,
    "audio_valence": 0.15
  },
  "romance": {
    "after_hours_work": -0.3,
    "recovery_status": 0.2,
    "audio_valence": 0.15,
    "sleep_quality_score": 0.15
  },
  "growth": {
    "deep_work_opportunity": 0.35,
    "context_switching_penalty": -0.2,
    "sleep_quality_score": 0.15,
    "audio_energy": 0.1
  },
  "mood": {
    "sleep_quality_score": 0.25,
    "recovery_status": 0.2,
    "audio_valence": 0.2,
    "digital_fatigue": -0.15,
    "doomscroll_index": -0.2
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/ml/models/weights.json
git commit -m "feat: add cold-start heuristic weights for predictive engine"
```

---

### Task 16: Create LocalTrainer

**Files:**
- Create: `apps/web/src/lib/ml/trainer.ts`
- Create: `apps/web/src/lib/ml/__tests__/trainer.test.ts`

- [ ] **Step 1: Create trainer.ts**

The `LocalTrainer` class implements the 3-tier training pipeline:
- **Cold (0-7 check-ins):** Use heuristic weights from `weights.json`. Prediction = baseScore + Σ(featureWeight * featureValue).
- **Warm (7-14):** Linear regression (OLS) per dimension.
- **Personalised (14+):** Pure TypeScript gradient boosting (~300 lines).

Key methods:
- `predict(features: NormalisedMLFeatures): Promise<PredictionResult>` — Uses current model weights to predict.
- `train(pairs: TrainingPair[]): Promise<ModelWeightsRecord>` — Trains on check-in history, returns new weights.
- `getModelInfo(): ModelWeightsRecord | null` — Returns current model metadata.

The trainer reads `mlModelWeights` from Dexie for the current model and writes new weights after training.

Model versioning: keeps `current` and `previous` records only.

Subjectivity gap: after training, compute per-dimension mean absolute error. If MAE > 2.0 for 3+ check-ins on a dimension, record dampening factor in `subjectivityGaps`.

This file will be ~300-400 lines. Include the gradient boosting implementation inline (decision tree stumps, boosting loop, prediction aggregation).

- [ ] **Step 2: Write tests**

```typescript
// apps/web/src/lib/ml/__tests__/trainer.test.ts
import { describe, it, expect } from 'vitest';
import 'fake-indexeddb/auto';
import { LocalTrainer } from '../trainer';
import type { NormalisedMLFeatures, TrainingPair } from '../types';
import { Dimension } from '@life-design/core';

function makeFeatures(overrides: Partial<NormalisedMLFeatures> = {}): NormalisedMLFeatures {
  return {
    sleep_duration_score: 0.5, sleep_quality_score: 0.5,
    physical_strain: 0.5, recovery_status: 0.5,
    meeting_load: 0.5, context_switching_penalty: 0.5,
    deep_work_opportunity: 0.5, after_hours_work: 0.5,
    digital_fatigue: 0.5, doomscroll_index: 0.5,
    audio_valence: 0.5, audio_energy: 0.5,
    day_of_week_sin: 0, day_of_week_cos: 1,
    is_weekend: false,
    season_sprint: 0, season_recharge: 0, season_exploration: 0,
    ...overrides,
  };
}

describe('LocalTrainer', () => {
  it('cold start: returns predictions using heuristic weights', async () => {
    const trainer = new LocalTrainer();
    const features = makeFeatures({ sleep_quality_score: 0.9 });
    const result = await trainer.predict(features);

    expect(result.scores[Dimension.Health]).toBeGreaterThan(0);
    expect(result.mood).toBeGreaterThan(0);
    expect(result.mood).toBeLessThanOrEqual(10);
    expect(result.confidence[Dimension.Health]).toBeDefined();
  });

  it('predictions are in 1-10 range', async () => {
    const trainer = new LocalTrainer();
    const result = await trainer.predict(makeFeatures());

    for (const dim of Object.values(Dimension)) {
      expect(result.scores[dim]).toBeGreaterThanOrEqual(1);
      expect(result.scores[dim]).toBeLessThanOrEqual(10);
    }
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd apps/web && pnpm vitest run src/lib/ml/__tests__/trainer.test.ts
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/ml/trainer.ts apps/web/src/lib/ml/__tests__/trainer.test.ts
git commit -m "feat: add LocalTrainer with 3-tier pipeline (cold/warm/personalised)"
```

---

### Task 17: Create Training Worker and Client

**Files:**
- Create: `apps/web/src/workers/training-worker.ts`
- Create: `apps/web/src/lib/ml/training-client.ts`

- [ ] **Step 1: Create training-worker.ts**

Follows the same pattern as `packages/ai-local/src/worker.ts` (the existing NLP worker). Communication protocol: `{ id, type, payload }` → `{ id, type: 'result', data }`.

Message types: `'train'`, `'predict'`, `'getModelInfo'`.

The worker creates its own `LifeDesignDB` instance (Dexie supports multi-context access). Uses `navigator.locks.request('training')` to prevent concurrent training.

```typescript
import { LocalTrainer } from '../lib/ml/trainer';
import type { NormalisedMLFeatures, TrainingPair, ModelWeightsRecord, PredictionResult } from '../lib/ml/types';

export type TrainerMessageType = 'train' | 'predict' | 'getModelInfo';

export interface TrainerRequest {
  id: string;
  type: TrainerMessageType;
  payload: {
    features?: NormalisedMLFeatures;
    pairs?: TrainingPair[];
  };
}

export interface TrainerResultMessage {
  id: string;
  type: 'result';
  data: unknown;
}

export interface TrainerErrorMessage {
  id: string;
  type: 'error';
  error: string;
}

export type TrainerResponse = TrainerResultMessage | TrainerErrorMessage;

const ctx = self as unknown as Worker;
const trainer = new LocalTrainer();

ctx.addEventListener('message', async (event: MessageEvent<TrainerRequest>) => {
  const { id, type, payload } = event.data;

  try {
    let data: unknown;

    switch (type) {
      case 'predict': {
        if (!payload.features) throw new Error('Missing features for predict');
        data = await trainer.predict(payload.features);
        break;
      }
      case 'train': {
        if (!payload.pairs) throw new Error('Missing training pairs');
        // Use navigator.locks to prevent concurrent training
        if (navigator.locks) {
          data = await navigator.locks.request('life-design-training', async () => {
            return trainer.train(payload.pairs!);
          });
        } else {
          data = await trainer.train(payload.pairs);
        }
        break;
      }
      case 'getModelInfo': {
        data = trainer.getModelInfo();
        break;
      }
      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    ctx.postMessage({ id, type: 'result', data } satisfies TrainerResultMessage);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.postMessage({ id, type: 'error', error: message } satisfies TrainerErrorMessage);
  }
});
```

- [ ] **Step 2: Create training-client.ts**

Follows `AILocalClient` pattern from `packages/ai-local/src/index.ts`: lazy worker init, promise-map routing, timeout handling.

```typescript
import type { TrainerRequest, TrainerResponse } from '@/workers/training-worker';
import type { NormalisedMLFeatures, TrainingPair, ModelWeightsRecord, PredictionResult } from './types';

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const TRAINING_TIMEOUT_MS = 30_000;
const PREDICT_TIMEOUT_MS = 5_000;

export class TrainingClient {
  private worker: Worker | null = null;
  private pending = new Map<string, PendingRequest>();
  private nextId = 0;

  private ensureWorker(): Worker {
    if (typeof Worker === 'undefined') {
      throw new Error('TrainingClient requires a browser environment with Web Worker support');
    }
    if (!this.worker) {
      this.worker = new Worker(
        new URL('@/workers/training-worker.ts', import.meta.url),
        { type: 'module' },
      );
      this.worker.addEventListener('message', this.handleMessage);
      this.worker.addEventListener('error', this.handleError);
    }
    return this.worker;
  }

  private handleMessage = (event: MessageEvent<TrainerResponse>) => {
    const msg = event.data;
    const pending = this.pending.get(msg.id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(msg.id);

    if (msg.type === 'error') {
      pending.reject(new Error(msg.error));
    } else {
      pending.resolve(msg.data);
    }
  };

  private handleError = (event: ErrorEvent) => {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error(event.message || 'Worker error'));
      this.pending.delete(id);
    }
  };

  private request<T>(type: TrainerRequest['type'], payload: TrainerRequest['payload'], timeoutMs: number): Promise<T> {
    const worker = this.ensureWorker();
    const id = String(++this.nextId);
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`TrainingClient: ${type} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      });
      worker.postMessage({ id, type, payload } satisfies TrainerRequest);
    });
  }

  async predict(features: NormalisedMLFeatures): Promise<PredictionResult> {
    return this.request<PredictionResult>('predict', { features }, PREDICT_TIMEOUT_MS);
  }

  async train(pairs: TrainingPair[]): Promise<ModelWeightsRecord> {
    return this.request<ModelWeightsRecord>('train', { pairs }, TRAINING_TIMEOUT_MS);
  }

  async getModelInfo(): Promise<ModelWeightsRecord | null> {
    return this.request<ModelWeightsRecord | null>('getModelInfo', {}, PREDICT_TIMEOUT_MS);
  }

  dispose() {
    if (this.worker) {
      this.worker.removeEventListener('message', this.handleMessage);
      this.worker.removeEventListener('error', this.handleError);
      this.worker.terminate();
      this.worker = null;
    }
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error('TrainingClient disposed'));
    }
    this.pending.clear();
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/web && pnpm type-check
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/workers/training-worker.ts apps/web/src/lib/ml/training-client.ts
git commit -m "feat: add Training Worker and TrainingClient for off-thread ML"
```

---

## Chunk 5: Phase 3, Subsystems 4–6 — Predictive UI, Guardian Agent, Life Seasons

### File Structure (Subsystems 4–6)

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `apps/web/src/components/checkin/ghost-slider.tsx` | Dual-handle slider primitive |
| Create | `apps/web/src/components/checkin/predictive-slider-group.tsx` | 8-dimension predictor UI |
| Create | `apps/web/src/components/checkin/explainability-tooltip.tsx` | Feature weight tooltips |
| Create | `apps/web/src/components/checkin/spotify-reflection.tsx` | Active listening reflection |
| Create | `apps/web/src/lib/agents/guardian-core.ts` | Anomaly detection engine |
| Create | `apps/web/src/lib/agents/action-synthesizer.ts` | Contextual intervention generator |
| Create | `apps/web/src/components/notifications/guardian-alert.tsx` | Level 3 modal |
| Create | `apps/web/src/lib/context/season-manager.ts` | Season definitions + transitions |
| Create | `apps/web/src/lib/ml/modifiers.ts` | Season bias application |
| Create | `apps/web/src/components/settings/season-selector.tsx` | Season picker in Settings |
| Modify | `apps/web/src/app/(protected)/checkin/checkin-client.tsx` | Wire prediction-aware mode switching |
| Modify | `apps/web/src/components/checkin/checkin-form.tsx` | Conditional PredictiveSliderGroup render |

---

### Task 18: Create GhostSlider component

**Files:**
- Create: `apps/web/src/components/checkin/ghost-slider.tsx`

- [ ] **Step 1: Create ghost-slider.tsx**

Dual-handle slider:
- Ghost handle (translucent): AI's predicted score. Style varies by confidence (solid/glowing for high, dotted/muted for low).
- Solid handle: User's actual score (appears when they interact).
- Range: 1-10 (matching existing dimension scoring).

Props: `dimension: Dimension`, `predictedScore: number`, `confidence: number`, `value: number | null`, `onChange: (value: number) => void`, `label: string`.

Confidence visual states (driven by `PredictionResult.confidence[dimension]`):
- High (>= 0.5): Solid ghost handle with glow
- Low (< 0.5): Dotted ghost handle, muted

Anti-anchoring: returns `null` as initial value until user interacts.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/checkin/ghost-slider.tsx
git commit -m "feat: add GhostSlider component with confidence-based visual states"
```

---

### Task 19: Create PredictiveSliderGroup and ExplainabilityTooltip

**Files:**
- Create: `apps/web/src/components/checkin/predictive-slider-group.tsx`
- Create: `apps/web/src/components/checkin/explainability-tooltip.tsx`

- [ ] **Step 1: Create explainability-tooltip.tsx**

Shows top 2-3 feature weights for a dimension. Props: `weights: FeatureWeight[]`. Maps `feature` keys to `humanLabel` strings.

Human-readable feature labels:
```typescript
const FEATURE_LABELS: Record<string, string> = {
  sleep_duration_score: 'sleep duration',
  sleep_quality_score: 'sleep quality',
  physical_strain: 'physical activity',
  recovery_status: 'recovery',
  meeting_load: 'meeting load',
  context_switching_penalty: 'context switching',
  deep_work_opportunity: 'deep work time',
  after_hours_work: 'after-hours work',
  digital_fatigue: 'screen time',
  doomscroll_index: 'doomscrolling',
  audio_valence: 'music mood',
  audio_energy: 'music energy',
};
```

- [ ] **Step 2: Create predictive-slider-group.tsx**

Renders 8 `GhostSlider` components (one per dimension) + "Confirm AI Predictions" button. Props: `prediction: PredictionResult`, `onScoresChange: (scores: Record<Dimension, number>) => void`, `onConfirmAll: () => void`.

Anti-anchoring safeguard: "Confirm All" and "Save" buttons disabled until user either moves at least one slider (delta > 1) or explicitly taps "Confirm AI Predictions".

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/checkin/predictive-slider-group.tsx apps/web/src/components/checkin/explainability-tooltip.tsx
git commit -m "feat: add PredictiveSliderGroup with explainability tooltips"
```

---

### Task 20: Create SpotifyReflection component

**Files:**
- Create: `apps/web/src/components/checkin/spotify-reflection.tsx`

- [ ] **Step 1: Create spotify-reflection.tsx**

Shows what the user listened to ("You listened to Radiohead for 3 hours today"), asks reflective question ("How does this music make you feel?"), user response options: emoji-based mood selector (energised / calm / melancholic / nostalgic / neutral) + optional free-text. Saves to `spotifyReflections` Dexie table.

Props: `date: string`, `spotifyData: { artistName: string; trackNames: string[]; listeningMinutes: number; audioValence: number; audioEnergy: number }`, `onComplete: (response: { mood: string; freeText?: string }) => void`.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/checkin/spotify-reflection.tsx
git commit -m "feat: add SpotifyReflection component for active listening prompts"
```

---

### Task 21: Wire predictive UI into check-in wizard

**Files:**
- Modify: `apps/web/src/app/(protected)/checkin/checkin-client.tsx`
- Modify: `apps/web/src/components/checkin/checkin-form.tsx`

- [ ] **Step 1: Modify checkin-client.tsx**

Add prediction-aware mode switching at the top of the component:
1. On mount, call `TrainingClient.predict()` with today's features
2. If prediction available AND featureConfidence >= 0.3 → Mode A (predictive)
3. Otherwise → Mode B (existing 12-step wizard, unchanged)

Mode A steps:
- Step 0: Mood (ghost-predicted on 1-5 display scale — model predicts 1-10, display = predicted / 2)
- Step 1: Review All Dimensions (`PredictiveSliderGroup` with 8 ghost sliders, 1-10 scale)
- Step 2: Spotify Reflection (if Spotify data available for today, otherwise **auto-skip to Step 3**)
- Step 3: Smart Journal Prompt
- Step 4: Reflection text
- Step 5: Complete

Check for Spotify data: query `db.connectedAppData.where('provider').equals('spotify')` for today's date. If no data, increment step directly from 1 → 3.

Compute `ai_accepted` on save: if user didn't move any slider delta > 1 AND tapped "Confirm AI Predictions", set `ai_accepted: true`.

Wire Dexie write-through: when saving, write `ai_accepted` field to the check-in record.

- [ ] **Step 2: Modify checkin-form.tsx**

Add conditional render: when `initialValues?.scores` has predictions and mode is predictive, render `PredictiveSliderGroup` instead of the `DimensionCard` grid. Falls back to tap UI during cold start.

- [ ] **Step 3: Verify build**

```bash
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(protected\)/checkin/checkin-client.tsx apps/web/src/components/checkin/checkin-form.tsx
git commit -m "feat: wire predictive UI into check-in wizard (Mode A/B switching)"
```

---

### Task 22: Create Guardian Agent core

**Files:**
- Create: `apps/web/src/lib/agents/guardian-core.ts`
- Create: `apps/web/src/lib/agents/action-synthesizer.ts`
- Create: `apps/web/src/lib/agents/__tests__/guardian-core.test.ts`

- [ ] **Step 1: Create guardian-core.ts**

The `GuardianAgent` class:
- `assess(checkIns: DBCheckIn[], featureLogs: FeatureLogRecord[]): Promise<GuardianLogEntry[]>` — Compares 7-day rolling average against 30-day baseline per dimension.
- Three trigger patterns:
  - Burnout: Work >1.5σ above mean + Health/Mood >1.0σ below mean, 3+ consecutive days
  - Isolation: Social >1.5σ below mean + digital fatigue spikes, 3+ consecutive days
  - Flow State: All scores trending positively, 5+ days (protects momentum)
- Uses `computeMovingAverage()`, `computeVolatility()`, `computeTrend()` from `@life-design/core/scoring`.
- 3-level escalation:
  - Level 1 (1-2 days): Silent log to `guardianLogs`
  - Level 2 (3 days): Write to `nudges` table with `type: 'guardian'`
  - Level 3 (5+ days or severe drop): Returns entry for modal display
- Feedback loop: reads `guardianLogs` for past `userAccepted` values. If ignored 3+ times for a trigger type, increases threshold (requires >2.0σ instead of >1.5σ).

- [ ] **Step 2: Create action-synthesizer.ts**

```typescript
import type { Dimension } from '@life-design/core';
import type { GuardianLogEntry, FeatureWeight } from '../ml/types';

interface ActionTrigger {
  triggerType: GuardianLogEntry['triggerType'];
  dimensionsAffected: Dimension[];
  topFeatures: FeatureWeight[];
}

const TEMPLATES: Record<string, string[]> = {
  burnout: [
    'You\'ve had {feature1} and {feature2} for {days} days. Consider blocking 2 hours for recovery today.',
    'Your {dim1} has been declining while work pressure is up. A short break could help recalibrate.',
  ],
  isolation: [
    'Your social connections have been quiet for {days} days. Even a short call with someone you trust can help.',
    'Digital fatigue is up and social time is down. Consider reaching out to a friend today.',
  ],
  flow_state: [
    'You\'re in a great rhythm! Keep protecting your deep work time and recovery balance.',
    'Everything is clicking — your {dim1} and {dim2} are both trending up.',
  ],
};

export class ActionSynthesizer {
  generate(trigger: ActionTrigger): string {
    const templates = TEMPLATES[trigger.triggerType] ?? TEMPLATES.burnout;
    const template = templates[Math.floor(Math.random() * templates.length)];
    const dim1 = trigger.dimensionsAffected[0] ?? 'wellbeing';
    const dim2 = trigger.dimensionsAffected[1] ?? 'balance';
    const feature1 = trigger.topFeatures[0]?.humanLabel ?? 'recent patterns';
    const feature2 = trigger.topFeatures[1]?.humanLabel ?? 'your routine';

    return template
      .replace('{dim1}', String(dim1))
      .replace('{dim2}', String(dim2))
      .replace('{feature1}', feature1)
      .replace('{feature2}', feature2)
      .replace('{days}', '3+');
  }
}
```

- [ ] **Step 3: Write tests**

```typescript
// apps/web/src/lib/agents/__tests__/guardian-core.test.ts
import { describe, it, expect } from 'vitest';
import 'fake-indexeddb/auto';
import { ActionSynthesizer } from '../action-synthesizer';
import { Dimension } from '@life-design/core';

describe('ActionSynthesizer', () => {
  it('generates a non-empty action string', () => {
    const synth = new ActionSynthesizer();
    const result = synth.generate({
      triggerType: 'burnout',
      dimensionsAffected: [Dimension.Health, Dimension.Career],
      topFeatures: [
        { feature: 'meeting_load', weight: 0.4, humanLabel: 'high meeting load' },
        { feature: 'sleep_quality_score', weight: -0.3, humanLabel: 'low sleep quality' },
      ],
    });
    expect(result.length).toBeGreaterThan(10);
    expect(result).not.toContain('{');
  });
});
```

- [ ] **Step 4: Run tests**

```bash
cd apps/web && pnpm vitest run src/lib/agents/__tests__/guardian-core.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/agents/ apps/web/src/lib/agents/__tests__/
git commit -m "feat: add Guardian Agent with anomaly detection and action synthesizer"
```

---

### Task 23: Create GuardianAlert modal

**Files:**
- Create: `apps/web/src/components/notifications/guardian-alert.tsx`

- [ ] **Step 1: Create guardian-alert.tsx**

Level 3 intervention modal. High-friction: requires explicit dismiss or action. Shows trigger type, affected dimensions, and synthesized action suggestion.

Props: `entry: GuardianLogEntry`, `actionText: string`, `onDismiss: () => void`, `onAccept: () => void`.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/notifications/guardian-alert.tsx
git commit -m "feat: add GuardianAlert modal for Level 3 interventions"
```

---

### Task 24: Create Season Manager and Modifiers

**Files:**
- Create: `apps/web/src/lib/context/season-manager.ts`
- Create: `apps/web/src/lib/ml/modifiers.ts`
- Create: `apps/web/src/lib/ml/__tests__/modifiers.test.ts`

- [ ] **Step 1: Create season-manager.ts**

Manages `SeasonRecord` CRUD in Dexie `seasons` table.
- `getActiveSeason(): Promise<SeasonRecord | undefined>` — Returns the season with `isActive === true`
- `setSeason(name: SeasonName): Promise<void>` — Deactivates current, creates new active season
- `getHistory(limit?: number): Promise<SeasonRecord[]>` — Returns past seasons (default limit 10)

4 season definitions with weight matrices (from spec):
```typescript
export const SEASON_WEIGHTS: Record<SeasonName, Record<Dimension, number>> = {
  Sprint:       { career: 1.5, finance: 1.0, health: 0.8, fitness: 0.7, family: 0.7, social: 0.5, romance: 0.5, growth: 1.3 },
  Recharge:     { career: 0.7, finance: 0.8, health: 1.5, fitness: 1.3, family: 1.2, social: 1.0, romance: 1.0, growth: 0.8 },
  Exploration:  { career: 0.8, finance: 0.7, health: 1.0, fitness: 1.0, family: 0.8, social: 1.5, romance: 1.2, growth: 1.3 },
  Maintenance:  { career: 1.0, finance: 1.0, health: 1.0, fitness: 1.0, family: 1.0, social: 1.0, romance: 1.0, growth: 1.0 },
};
```

- [ ] **Step 2: Create modifiers.ts**

Two responsibilities:
1. Season feature encoding: sets one-hot fields in `NormalisedMLFeatures`
2. Guardian threshold adjustment: returns modified thresholds per season

Also includes `seasonWeightsToArray()` helper that converts `Record<Dimension, number>` to `number[]` using `ALL_DIMENSIONS` ordering from `@life-design/core`:

```typescript
import { ALL_DIMENSIONS, type Dimension } from '@life-design/core';
import type { NormalisedMLFeatures, SeasonName } from './types';

export function seasonWeightsToArray(weights: Record<Dimension, number>): number[] {
  return ALL_DIMENSIONS.map((dim) => weights[dim] ?? 1.0);
}

export function applySeasonEncoding(
  features: NormalisedMLFeatures,
  season: SeasonName,
): NormalisedMLFeatures {
  return {
    ...features,
    season_sprint: season === 'Sprint' ? 1 : 0,
    season_recharge: season === 'Recharge' ? 1 : 0,
    season_exploration: season === 'Exploration' ? 1 : 0,
  };
}

export function getGuardianThresholdMultiplier(
  season: SeasonName,
  dimension: Dimension,
): number {
  // In Sprint, social threshold is relaxed (higher multiplier = harder to trigger)
  if (season === 'Sprint' && dimension === 'social') return 1.33; // 1.5σ → ~2.0σ
  // In Recharge, after_hours triggers more easily
  if (season === 'Recharge') return 0.85;
  return 1.0;
}
```

- [ ] **Step 3: Write tests**

```typescript
// apps/web/src/lib/ml/__tests__/modifiers.test.ts
import { describe, it, expect } from 'vitest';
import { seasonWeightsToArray, applySeasonEncoding } from '../modifiers';
import { ALL_DIMENSIONS, Dimension } from '@life-design/core';
import type { NormalisedMLFeatures } from '../types';

const makeFeatures = (): NormalisedMLFeatures => ({
  sleep_duration_score: 0.5, sleep_quality_score: 0.5,
  physical_strain: 0.5, recovery_status: 0.5,
  meeting_load: 0.5, context_switching_penalty: 0.5,
  deep_work_opportunity: 0.5, after_hours_work: 0.5,
  digital_fatigue: 0.5, doomscroll_index: 0.5,
  audio_valence: 0.5, audio_energy: 0.5,
  day_of_week_sin: 0, day_of_week_cos: 1,
  is_weekend: false,
  season_sprint: 0, season_recharge: 0, season_exploration: 0,
});

describe('seasonWeightsToArray', () => {
  it('returns array of length 8 matching ALL_DIMENSIONS order', () => {
    const weights: Record<Dimension, number> = {
      career: 1.5, finance: 1.0, health: 0.8, fitness: 0.7,
      family: 0.7, social: 0.5, romance: 0.5, growth: 1.3,
    } as Record<Dimension, number>;
    const arr = seasonWeightsToArray(weights);
    expect(arr).toHaveLength(ALL_DIMENSIONS.length);
    expect(arr[ALL_DIMENSIONS.indexOf(Dimension.Career)]).toBe(1.5);
  });
});

describe('applySeasonEncoding', () => {
  it('sets Sprint encoding correctly', () => {
    const result = applySeasonEncoding(makeFeatures(), 'Sprint');
    expect(result.season_sprint).toBe(1);
    expect(result.season_recharge).toBe(0);
    expect(result.season_exploration).toBe(0);
  });

  it('Maintenance has all season flags at 0', () => {
    const result = applySeasonEncoding(makeFeatures(), 'Maintenance');
    expect(result.season_sprint).toBe(0);
    expect(result.season_recharge).toBe(0);
    expect(result.season_exploration).toBe(0);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
cd apps/web && pnpm vitest run src/lib/ml/__tests__/modifiers.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/context/season-manager.ts apps/web/src/lib/ml/modifiers.ts apps/web/src/lib/ml/__tests__/modifiers.test.ts
git commit -m "feat: add Season Manager, season modifiers, and seasonWeightsToArray helper"
```

---

### Task 25: Create SeasonSelector settings UI

**Files:**
- Create: `apps/web/src/components/settings/season-selector.tsx`

- [ ] **Step 1: Create season-selector.tsx**

Lives in Settings page. Shows:
- Current active season with start date
- Four season cards with descriptions
- "AI suggested" badge when a transition is recommended (read from `nudges` table with `type: 'season_suggestion'`)
- History of past 10 seasons

Uses `SeasonManager` from `apps/web/src/lib/context/season-manager.ts`.

Season descriptions:
- Sprint: "Focus on career and growth. Expect less time for social activities."
- Recharge: "Prioritise health and family. Recovery is the goal."
- Exploration: "Expand your horizons. Social connections and growth take centre stage."
- Maintenance: "Balanced across all dimensions. The default steady state."

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/settings/season-selector.tsx
git commit -m "feat: add SeasonSelector settings UI with history and AI suggestions"
```

---

### Task 26: Final integration verification

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
```
Expected: All tests pass

- [ ] **Step 2: Run full build**

```bash
pnpm build
```
Expected: Clean build

- [ ] **Step 3: Type check**

```bash
cd apps/web && pnpm type-check
```
Expected: No TypeScript errors

- [ ] **Step 4: Commit any fixups**

If any tests or type errors were found and fixed:
```bash
git add -A
git commit -m "fix: integration fixups for predictive engine"
```

---

## Data Retention Startup Hook

**Note for implementer:** After Subsystem 1 (Task 12), add a data retention pruning hook that runs on app startup. Before any training is triggered:

```typescript
// Prune in apps/web startup or in a useEffect in the root layout
const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
await db.featureLogs.where('extractedAt').below(ninetyDaysAgo).delete();

const oneEightyDaysAgo = Date.now() - 180 * 24 * 60 * 60 * 1000;
await db.guardianLogs.where('timestamp').below(oneEightyDaysAgo).delete();
```

This should be added when wiring the Guardian Agent (Task 22) since that's when `guardianLogs` starts being populated.

---

## Build Sequence Dependency Graph

```
Task 1-3: Branch Consolidation (Phase 1)
    │
    ▼
Task 4-10: Onboarding Rebuild (Phase 2)
    │
    ▼
Task 11-12: Types + DB v5 (Subsystem 1)
    │
    ▼
Task 13-14b: Feature Pipeline + Spotify Connector (Subsystem 2)
    │
    ▼
Task 15-17: Training Engine (Subsystem 3)
    │
    ├──► Task 18-21: Predictive UI (Subsystem 4)     [parallel with 22-23]
    │
    └──► Task 22-23: Guardian Agent (Subsystem 5)     [parallel with 18-21]
              │
              ▼
         Task 24-25: Life Seasons (Subsystem 6)
              │
              ▼
         Task 26: Final verification
```

Tasks 18-21 and 22-23 can execute in parallel since they only share read dependencies on Subsystems 1-3.
