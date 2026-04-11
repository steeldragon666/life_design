# Life Design Full Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Life Design app from a feature-bloated wellness tracker into a lean, clinically-informed, ML-powered personal development platform across Sprint 0 + 4 phases over 32 weeks.

**Architecture:** Preserves existing monorepo (apps/web, packages/core, packages/ai-local, packages/ai, packages/ui) and Supabase backend. Sprint 0 removes ~3,000-4,000 LOC of non-spec features. Phases 1-4 add clinical instruments, intelligent sensing, personalised ML, and federated analytics.

**Tech Stack:** Next.js 15 / React 19, Supabase (Postgres + Edge Functions + pgvector), ONNX Runtime (ai-local), Tailwind CSS v4, Vitest, Playwright, pnpm workspaces + Turborepo.

**Constraints:** Solo developer + Claude, sequential tasks, phase-gated releases, extend timelines over cutting scope.

---

## Sprint 0: Cleanup (Weeks 1-2)

### Task 0.1: Delete Protected Route Directories

**Files:**
- Delete: `apps/web/src/app/(protected)/simulator/page.tsx`
- Delete: `apps/web/src/app/(protected)/orb/orb-client.tsx`
- Delete: `apps/web/src/app/(protected)/orb/page.tsx`
- Delete: `apps/web/src/app/(protected)/rituals/page.tsx`
- Delete: `apps/web/src/app/(protected)/rituals/morning/page.tsx`
- Delete: `apps/web/src/app/(protected)/rituals/evening/page.tsx`
- Delete: `apps/web/src/app/(protected)/meditations/page.tsx`
- Delete: `apps/web/src/app/(protected)/challenges/page.tsx`
- Delete: `apps/web/src/app/(protected)/challenges/[id]/page.tsx`
- Delete: `apps/web/src/app/(protected)/journey/page.tsx`
- Delete: `apps/web/src/app/(protected)/journey/journey-client.tsx`
- Delete: `apps/web/src/app/(protected)/journey/loading.tsx`
- Delete: `apps/web/src/app/(protected)/schedule/page.tsx`
- Delete: `apps/web/src/app/(protected)/achievements/page.tsx`

**Step 1: Delete all 8 route directories**

```bash
rm -rf apps/web/src/app/\(protected\)/simulator
rm -rf apps/web/src/app/\(protected\)/orb
rm -rf apps/web/src/app/\(protected\)/rituals
rm -rf apps/web/src/app/\(protected\)/meditations
rm -rf apps/web/src/app/\(protected\)/challenges
rm -rf apps/web/src/app/\(protected\)/journey
rm -rf apps/web/src/app/\(protected\)/schedule
rm -rf apps/web/src/app/\(protected\)/achievements
```

**Step 2: Verify deletion**

```bash
ls apps/web/src/app/\(protected\)/
```

Expected: Only `checkin`, `correlations`, `dashboard`, `dimensions`, `goals`, `insights`, `journal`, `mentor`, `mentors`, `onboarding`, `paywall`, `profile`, `settings`, `error.tsx`, `layout.tsx`, `loading.tsx`, `protected-layout-client.tsx` remain.

**Step 3: Commit**

```bash
git add -A apps/web/src/app/\(protected\)/simulator apps/web/src/app/\(protected\)/orb apps/web/src/app/\(protected\)/rituals apps/web/src/app/\(protected\)/meditations apps/web/src/app/\(protected\)/challenges apps/web/src/app/\(protected\)/journey apps/web/src/app/\(protected\)/schedule apps/web/src/app/\(protected\)/achievements
git commit -m "chore: delete 8 non-spec protected routes (simulator, orb, rituals, meditations, challenges, journey, schedule, achievements)"
```

---

### Task 0.2: Delete Component Directories

**Files:**
- Delete: `apps/web/src/components/achievements/BadgeUnlockModal.tsx`
- Delete: `apps/web/src/components/challenges/ActiveChallengeView.tsx`
- Delete: `apps/web/src/components/challenges/ChallengeLibrary.tsx`
- Delete: `apps/web/src/components/meditation/evening-ritual.tsx`
- Delete: `apps/web/src/components/meditation/morning-ritual.tsx`
- Delete: `apps/web/src/components/audio/soundscape-controls.tsx`
- Delete: `apps/web/src/components/audio/soundscape-provider.tsx`
- Delete: `apps/web/src/components/voice/voice-selector.tsx`
- Delete: `apps/web/src/components/video/index.ts`
- Delete: `apps/web/src/components/video/parallax-video.tsx`
- Delete: `apps/web/src/components/video/video-loader.tsx`
- Delete: `apps/web/src/components/video/video-overlay.tsx`
- Delete: `apps/web/src/components/video/video-transition.tsx`
- Delete: `apps/web/src/components/schedule/DayView.tsx`
- Delete: `apps/web/src/components/schedule/ScheduleWidget.tsx`
- Delete: `apps/web/src/components/schedule/WeekView.tsx`
- Delete: `apps/web/src/components/dashboard/life-orb.tsx`
- Delete: `apps/web/src/components/dashboard/orb-widget.tsx`

**Step 1: Delete all component directories and orb files**

```bash
rm -rf apps/web/src/components/achievements
rm -rf apps/web/src/components/challenges
rm -rf apps/web/src/components/meditation
rm -rf apps/web/src/components/audio
rm -rf apps/web/src/components/voice
rm -rf apps/web/src/components/video
rm -rf apps/web/src/components/schedule
rm apps/web/src/components/dashboard/life-orb.tsx
rm apps/web/src/components/dashboard/orb-widget.tsx
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: delete 8 non-spec component directories and orb dashboard files"
```

---

### Task 0.3: Delete Libraries and Services

**Files:**
- Delete: `apps/web/src/lib/achievements/badge-definitions.ts`
- Delete: `apps/web/src/lib/achievements/badge-system.ts`
- Delete: `apps/web/src/lib/challenges/challenge-engine.ts`
- Delete: `apps/web/src/lib/challenges/challenge-library.ts`
- Delete: `apps/web/src/lib/challenges/types.ts`
- Delete: `apps/web/src/lib/services/journey-service.ts`
- Delete: `apps/web/src/lib/services/pathway-service.ts`

**Step 1: Delete library directories and service files**

```bash
rm -rf apps/web/src/lib/achievements
rm -rf apps/web/src/lib/challenges
rm apps/web/src/lib/services/journey-service.ts
rm apps/web/src/lib/services/pathway-service.ts
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: delete achievements, challenges, journey, and pathway service code"
```

---

### Task 0.4: Delete API Routes

**Files:**
- Delete: `apps/web/src/app/api/auth/notion/route.ts`
- Delete: `apps/web/src/app/api/auth/slack/route.ts`
- Delete: `apps/web/src/app/api/integrations/notion/callback/route.ts`
- Delete: `apps/web/src/app/api/integrations/slack/callback/route.ts`
- Delete: `apps/web/src/app/api/tts/route.ts`
- Delete: `apps/web/src/app/api/tts/__tests__/route.test.ts`
- Delete: `apps/web/src/app/api/journey/route.ts`
- Delete: `apps/web/src/app/api/weekly-digest/route.ts`

**Step 1: Delete API route directories**

```bash
rm -rf apps/web/src/app/api/auth/notion
rm -rf apps/web/src/app/api/auth/slack
rm -rf apps/web/src/app/api/integrations/notion
rm -rf apps/web/src/app/api/integrations/slack
rm -rf apps/web/src/app/api/tts
rm -rf apps/web/src/app/api/journey
rm -rf apps/web/src/app/api/weekly-digest
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: delete Notion, Slack, TTS, journey, and weekly-digest API routes"
```

---

### Task 0.5: Clean Surviving File Imports — LifeDesignProvider

The `LifeDesignProvider` imports `ChallengeEngine` and `BadgeSystem` which were just deleted. These must be removed from the provider context.

**Files:**
- Modify: `apps/web/src/providers/LifeDesignProvider.tsx`

**Step 1: Read the full LifeDesignProvider file**

Read `apps/web/src/providers/LifeDesignProvider.tsx` to understand the full context structure.

**Step 2: Remove ChallengeEngine and BadgeSystem imports, context fields, and hook exports**

Remove these imports:
```typescript
import { ChallengeEngine } from '@/lib/challenges/challenge-engine';
import { BadgeSystem } from '@/lib/achievements/badge-system';
```

Remove from context type:
```typescript
challengeEngine: ChallengeEngine;
badgeSystem: BadgeSystem;
```

Remove from engine initialization:
```typescript
const badgeSystem = new BadgeSystem(db);
const challengeEngine = new ChallengeEngine(db);
```

Remove hook exports:
```typescript
export function useChallenges(): ChallengeEngine { ... }
export function useBadges(): BadgeSystem { ... }
```

Remove `challengeEngine` and `badgeSystem` from the context value object and destructured `engines`.

**Step 3: Verify file saves without syntax errors**

**Step 4: Commit**

```bash
git add apps/web/src/providers/LifeDesignProvider.tsx
git commit -m "refactor: remove ChallengeEngine and BadgeSystem from LifeDesignProvider"
```

---

### Task 0.6: Clean Surviving File Imports — app-providers

**Files:**
- Modify: `apps/web/src/components/app-providers.tsx`

**Step 1: Remove SoundscapeProvider import and wrapper**

Remove import:
```typescript
import { SoundscapeProvider } from '@/components/audio/soundscape-provider';
```

Remove `<SoundscapeProvider>` wrapper from the JSX tree (keep children intact).

**Step 2: Commit**

```bash
git add apps/web/src/components/app-providers.tsx
git commit -m "refactor: remove SoundscapeProvider from app-providers"
```

---

### Task 0.7: Clean Surviving File Imports — Dashboard

**Files:**
- Modify: `apps/web/src/app/(protected)/dashboard/dashboard-client.tsx`

**Step 1: Remove deleted feature imports and references**

Remove import:
```typescript
import { ScheduleWidget } from '@/components/schedule/ScheduleWidget';
```

Remove unused Lucide icons from import: `Trophy`, `Route` (keep others that are still used).

Remove JSX referencing deleted features:
- `<ScheduleWidget />` usage (~line 615)
- `<Link href="/achievements" ...>` block (~line 383)
- `<Link href="/journey" ...>` block (~line 602)
- Any `db.badges` references (~line 294)

**Step 2: Commit**

```bash
git add apps/web/src/app/\(protected\)/dashboard/dashboard-client.tsx
git commit -m "refactor: remove schedule widget, achievements link, and journey link from dashboard"
```

---

### Task 0.8: Clean Surviving File Imports — Checkin Client

**Files:**
- Modify: `apps/web/src/app/(protected)/checkin/checkin-client.tsx`

**Step 1: Remove badge-related imports and logic**

Remove imports:
```typescript
import { BadgeSystem } from '@/lib/achievements/badge-system';
import type { BadgeDefinition } from '@/lib/achievements/badge-definitions';
import BadgeUnlockModal from '@/components/achievements/BadgeUnlockModal';
```

Remove badge system instantiation (~line 372):
```typescript
const badgeSystem = new BadgeSystem(db);
```

Remove `BadgeUnlockModal` JSX (~line 871) and the `earnedBadge` state that drives it.

Remove any badge-related logic in the check-in submission flow.

**Step 2: Commit**

```bash
git add apps/web/src/app/\(protected\)/checkin/checkin-client.tsx
git commit -m "refactor: remove badge system from checkin flow"
```

---

### Task 0.9: Clean Surviving File Imports — Goals (Pathway Service)

**Files:**
- Modify: `apps/web/src/app/(protected)/goals/[goalId]/pathway-actions.ts`
- Modify: `apps/web/src/app/(protected)/goals/[goalId]/page.tsx`

**Step 1: Remove pathway-service imports from goal detail page and actions**

In `pathway-actions.ts`, remove:
```typescript
import { createPathway, deletePathway, toggleStep } from '@/lib/services/pathway-service';
```
Remove all functions that call these deleted service methods. Replace with stubs or remove entirely if pathways are not in spec.

In `page.tsx`, remove:
```typescript
import { getPathways } from '@/lib/services/pathway-service';
```
Remove pathway-related data fetching and rendering. Goals page should work without pathways.

**Step 2: Commit**

```bash
git add apps/web/src/app/\(protected\)/goals/
git commit -m "refactor: remove pathway-service dependency from goals"
```

---

### Task 0.10: Clean Surviving File Imports — Analysis Pipeline

**Files:**
- Modify: `apps/web/src/lib/analysis/analysis-pipeline.ts`

**Step 1: Remove BadgeSystem import**

Remove:
```typescript
import type { BadgeSystem } from '@/lib/achievements/badge-system';
```

Remove any references to `BadgeSystem` type in the analysis pipeline. If it's only used as a type parameter, remove it. If it's used in logic, remove the badge-related analysis step.

**Step 2: Commit**

```bash
git add apps/web/src/lib/analysis/analysis-pipeline.ts
git commit -m "refactor: remove BadgeSystem dependency from analysis pipeline"
```

---

### Task 0.11: Clean Surviving File Imports — Onboarding Speech Synthesis

**Files:**
- Modify: `apps/web/src/components/onboarding/hooks/use-speech-synthesis.ts`

**Step 1: Remove voice-selector import**

Remove:
```typescript
import { getSelectedVoice } from '@/components/voice/voice-selector';
```

Replace with a hardcoded default or remove voice selection logic entirely (TTS is being removed per spec).

**Step 2: Commit**

```bash
git add apps/web/src/components/onboarding/hooks/use-speech-synthesis.ts
git commit -m "refactor: remove voice-selector dependency from speech synthesis hook"
```

---

### Task 0.12: Clean Surviving File Imports — Asset Loading

**Files:**
- Modify: `apps/web/src/lib/use-asset-loading.ts`

**Step 1: Remove video-optimizer import**

Remove:
```typescript
import { getDeviceCapabilities, estimateBandwidth, type DeviceCapabilities } from './video-optimizer';
```

Check if `video-optimizer.ts` itself should be deleted (it supports removed video components). If so, delete it. Replace any usage in `use-asset-loading.ts` with stubs or remove the video-specific asset loading.

**Step 2: Commit**

```bash
git add apps/web/src/lib/
git commit -m "refactor: remove video-optimizer dependency from asset loading"
```

---

### Task 0.13: Trim Navigation

**Files:**
- Modify: `apps/web/src/app/(protected)/protected-layout-client.tsx`

**Step 1: Update navItems array**

Replace the current 11-item navItems with:

```typescript
const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/checkin', label: 'Check-in', icon: Sun },
  { href: '/journal', label: 'Journal', icon: BookOpen },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/insights', label: 'Insights', icon: Sparkles },
  { href: '/mentor', label: 'Mentor', icon: MessageCircle },
  { href: '/settings', label: 'Settings', icon: Settings },
];
```

**Step 2: Remove unused icon imports**

Remove from Lucide import: `FlaskConical`, `Flame`, `Trophy`, `Route`, `Calendar`. Add `Sparkles`, `MessageCircle` if not already imported.

**Step 3: Update mobile nav slicing**

The current code does `navItems.slice(0, 5)` for mobile main and `navItems.slice(5)` for mobile "More". With 7 items, adjust to `slice(0, 4)` and `slice(4)` or similar appropriate split.

**Step 4: Commit**

```bash
git add apps/web/src/app/\(protected\)/protected-layout-client.tsx
git commit -m "refactor: trim navigation from 11 to 7 items per spec"
```

---

### Task 0.14: Clean Onboarding Cards

**Files:**
- Modify: `apps/web/src/components/onboarding/cards/data-import-card.tsx`
- Modify: `apps/web/src/components/onboarding/cards/connect-apps-card.tsx`

**Step 1: Update data-import-card.tsx INTEGRATIONS array**

Remove Slack and Notion entries. Keep only spec-approved integrations:

```typescript
const INTEGRATIONS = [
  { id: 'strava', name: 'Strava', description: 'Running, cycling & fitness', icon: '\u{1F3C3}', authUrl: '/api/auth/strava' },
  { id: 'spotify', name: 'Spotify', description: 'Music & listening habits', icon: '\u{1F3B5}', authUrl: '/api/auth/spotify' },
  { id: 'google_calendar', name: 'Google Calendar', description: 'Events & time management', icon: '\u{1F4C5}', authUrl: '/api/auth/google' },
];
```

**Step 2: Update connect-apps-card.tsx INTEGRATIONS array**

Same change — remove Slack and Notion, keep Strava, Spotify, Google Calendar:

```typescript
const INTEGRATIONS = [
  { id: 'strava', name: 'Strava', description: 'Track workouts & activity', icon: '🏃', authUrl: '/api/auth/strava' },
  { id: 'spotify', name: 'Spotify', description: 'Music & listening patterns', icon: '🎵', authUrl: '/api/auth/spotify' },
  { id: 'google_calendar', name: 'Google Calendar', description: 'Schedule & time use', icon: '📅', authUrl: '/api/auth/google' },
];
```

**Step 3: Commit**

```bash
git add apps/web/src/components/onboarding/cards/data-import-card.tsx apps/web/src/components/onboarding/cards/connect-apps-card.tsx
git commit -m "refactor: remove Notion and Slack from onboarding integration cards"
```

---

### Task 0.15: Remove Notion and Slack from Core Enums

**Files:**
- Modify: `packages/core/src/enums.ts`

**Step 1: Remove Notion and Slack from provider enum**

In `packages/core/src/enums.ts`, remove:
```typescript
Slack = 'slack',
Notion = 'notion',
```

**Step 2: Verify no other core files reference these enum values**

```bash
grep -r "Slack\|Notion" packages/core/src/ --include="*.ts"
```

Remove any remaining references.

**Step 3: Commit**

```bash
git add packages/core/src/enums.ts
git commit -m "refactor: remove Notion and Slack from core provider enums"
```

---

### Task 0.16: Build Verification

**Step 1: Run full build**

```bash
pnpm build
```

Expected: Build succeeds with no import errors from deleted modules.

**Step 2: Fix any remaining broken imports**

If build fails, grep for the failing import path, find the surviving file, and remove or stub the import. Common patterns:
- Type-only imports that reference deleted files
- Dynamic imports or lazy-loaded components referencing deleted routes
- Test files that import deleted modules

**Step 3: Run tests**

```bash
pnpm test
```

Fix any test failures caused by deleted modules. Delete test files that test deleted features (e.g., tests for badge system, challenge engine).

**Step 4: Commit any remaining fixes**

```bash
git add -A
git commit -m "fix: resolve remaining import errors after Sprint 0 cleanup"
```

---

### Task 0.17: Sprint 0 Verification & Tag

**Step 1: Final build + test pass**

```bash
pnpm build && pnpm test
```

Expected: Both pass cleanly.

**Step 2: Tag the Sprint 0 release**

```bash
git tag sprint-0-cleanup
```

**Step 3: Deploy**

Push to main for Vercel deployment. Verify the deployed app:
- Navigation shows 7 items (Home, Check-in, Journal, Goals, Insights, Mentor, Settings)
- Onboarding shows only Strava, Spotify, Google Calendar
- No 404 errors on remaining routes
- Dashboard loads without orb widget, schedule widget, journey link, or achievements link

---

## Phase 1: Clinical Foundation (Weeks 3-8)

### Task 1.1: Integration Audit

**Files:**
- Create: `docs/integration-audit-results.md`

**Step 1: Test each OAuth connector**

For each integration (Strava, Spotify, Google Calendar, Apple Health, Banking, Weather):
1. Navigate to the OAuth flow URL
2. Verify the OAuth app exists and credentials are configured in environment
3. Attempt the full OAuth flow
4. Verify data comes back from the connected account
5. Document status: Working / Broken / Stub-only / No OAuth App

**Step 2: Document results**

Create `docs/integration-audit-results.md` with a table of results.

**Step 3: Create repair tasks if needed**

For any Broken connectors, create specific repair tasks. Budget 1 week.

**Step 4: Commit**

```bash
git add docs/integration-audit-results.md
git commit -m "docs: integration audit results"
```

---

### Task 1.2: PHQ-9 & GAD-7 Clinical Screening — Tests

**Files:**
- Create: `packages/core/src/profiling/__tests__/clinical-instruments.test.ts`
- Reference: `packages/core/src/profiling/instruments.ts` (existing)

**Step 1: Write failing tests for PHQ-9 scoring**

```typescript
import { describe, it, expect } from 'vitest';
import { scorePHQ9, scoreGAD7, getSeverityBand } from '../instruments';

describe('PHQ-9 Clinical Screening', () => {
  it('scores all-zero responses as 0 (minimal)', () => {
    const answers = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(scorePHQ9(answers)).toEqual({ total: 0, severity: 'minimal' });
  });

  it('scores mild severity (5-9)', () => {
    const answers = [1, 1, 1, 1, 1, 0, 0, 0, 0];
    expect(scorePHQ9(answers)).toEqual({ total: 5, severity: 'mild' });
  });

  it('scores moderate severity (10-14)', () => {
    const answers = [2, 2, 1, 1, 1, 1, 1, 1, 0];
    expect(scorePHQ9(answers)).toEqual({ total: 10, severity: 'moderate' });
  });

  it('scores moderately severe (15-19)', () => {
    const answers = [2, 2, 2, 2, 2, 2, 2, 1, 0];
    expect(scorePHQ9(answers)).toEqual({ total: 15, severity: 'moderately_severe' });
  });

  it('scores severe (20-27)', () => {
    const answers = [3, 3, 3, 3, 3, 3, 3, 3, 3];
    expect(scorePHQ9(answers)).toEqual({ total: 27, severity: 'severe' });
  });

  it('rejects invalid answer count', () => {
    expect(() => scorePHQ9([1, 2, 3])).toThrow();
  });

  it('rejects answers outside 0-3 range', () => {
    expect(() => scorePHQ9([0, 0, 0, 0, 0, 0, 0, 0, 5])).toThrow();
  });
});

describe('GAD-7 Clinical Screening', () => {
  it('scores all-zero as minimal', () => {
    const answers = [0, 0, 0, 0, 0, 0, 0];
    expect(scoreGAD7(answers)).toEqual({ total: 0, severity: 'minimal' });
  });

  it('scores severe (15-21)', () => {
    const answers = [3, 3, 3, 3, 3, 3, 3];
    expect(scoreGAD7(answers)).toEqual({ total: 21, severity: 'severe' });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd packages/core && pnpm vitest run src/profiling/__tests__/clinical-instruments.test.ts
```

Expected: FAIL — `scorePHQ9` and `scoreGAD7` not exported from instruments.

**Step 3: Implement scoring functions in instruments.ts**

Add `scorePHQ9`, `scoreGAD7`, and `getSeverityBand` functions with the validated question banks, Likert scale definitions, and severity band thresholds.

**Step 4: Run tests to verify they pass**

```bash
cd packages/core && pnpm vitest run src/profiling/__tests__/clinical-instruments.test.ts
```

Expected: All PASS.

**Step 5: Commit**

```bash
git add packages/core/src/profiling/
git commit -m "feat: add PHQ-9 and GAD-7 clinical screening scoring functions"
```

---

### Task 1.3: PHQ-9 & GAD-7 — Verify Migration and Create Screening UI

**Files:**
- Verify: `supabase/migrations/00029_clinical_screenings.sql`
- Create: `apps/web/src/components/screening/clinical-screening-form.tsx`
- Create: `apps/web/src/components/screening/screening-results.tsx`
- Modify: `apps/web/src/app/(protected)/settings/` (add screening results section)

**Step 1: Verify migration 00029 schema**

Read `supabase/migrations/00029_clinical_screenings.sql` and verify it creates a `clinical_screenings` table with columns: `id`, `user_id`, `instrument` (enum: phq9/gad7), `answers` (jsonb), `total_score`, `severity`, `created_at`.

**Step 2: Build the clinical screening form component**

Create a reusable form component that:
- Accepts instrument type (PHQ-9 or GAD-7)
- Renders each question with 0-3 Likert options
- Includes the mandatory disclaimer: "This is a screening tool, not a clinical diagnosis"
- Calls the scoring function from `packages/core`
- Saves results via API

**Step 3: Build screening results display**

Create a component that shows historical screening scores with severity badges and trend over time.

**Step 4: Add screening to settings page**

Add a "Clinical Screening" section to settings showing latest results and offering to take a new screening.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add clinical screening form and results UI (PHQ-9/GAD-7)"
```

---

### Task 1.4: PHQ-9 & GAD-7 — Periodic Scheduling

**Files:**
- Create: `apps/web/src/lib/screening/screening-scheduler.ts`

**Step 1: Write failing test for screening schedule logic**

Test that:
- PHQ-2/GAD-2 short forms are suggested weekly
- Full PHQ-9/GAD-7 is suggested monthly
- No screening suggested if one was completed recently

**Step 2: Implement scheduling logic**

**Step 3: Run tests, commit**

```bash
git commit -m "feat: add periodic clinical screening scheduling (weekly short, monthly full)"
```

---

### Task 1.5: Sleep Architecture Analysis Engine

**Files:**
- Verify: `supabase/functions/sleep-analysis/index.ts`
- Verify: `supabase/migrations/00031_sleep_analysis.sql`
- Modify: `supabase/functions/sleep-analysis/index.ts`

**Step 1: Read existing sleep-analysis edge function**

Understand what currently exists and what needs extending.

**Step 2: Write tests for sleep analysis computations**

Test REM/deep/light distribution, circadian regularity scoring, sleep efficiency, sleep latency, and wake-after-sleep-onset.

**Step 3: Extend edge function with full sleep architecture analysis**

Add:
- Sleep stage distribution (% REM, % deep, % light, % awake)
- Circadian rhythm regularity (consistency of sleep/wake times)
- Sleep efficiency (time asleep / time in bed)
- Sleep latency (time to fall asleep)
- WASO (wake after sleep onset)

**Step 4: Add sleep trends to health dimension view**

Surface computed sleep metrics in the dimensions UI.

**Step 5: Run tests, commit**

```bash
git commit -m "feat: extend sleep analysis with REM/circadian architecture metrics"
```

---

### Task 1.6: Tiered Opt-In Value Exchange System — Settings UI

**Files:**
- Verify: `supabase/migrations/00032_opt_in_tiers.sql`
- Verify: `packages/core/src/privacy/` (opt-in tier types)
- Create: `apps/web/src/components/settings/opt-in-tier-selector.tsx`
- Modify: `apps/web/src/app/(protected)/settings/` (add tier selector)

**Step 1: Verify migration and existing types**

Read migration 00032 and the privacy types to understand the tier schema.

**Step 2: Build tier selector component**

Create a component showing three tiers with clear value exchange:
- **Basic:** "Share mood & journal -> Get basic insights and trends"
- **Enhanced:** "Share health data -> Get sleep analysis, exercise correlations, HRV tracking"
- **Full:** "Share all data -> Get financial stress detection, social patterns, population comparisons"

Visual card-based selector with current tier highlighted.

**Step 3: Add to settings page**

**Step 4: Add tier enforcement to data collection points**

Modify connectors to check user's opt-in tier before collecting data.

**Step 5: Add tier selection to onboarding flow**

Add a step in the onboarding wizard for tier selection.

**Step 6: Commit**

```bash
git commit -m "feat: add opt-in tier selector UI in settings and onboarding"
```

---

### Task 1.7: Five-Point Visual Check-in Scale

**Files:**
- Verify: `supabase/migrations/00030_five_point_scale.sql`
- Modify: `apps/web/src/components/checkin/` (checkin-form, mood-slider, ghost-slider)
- Modify: `packages/core/src/` (scoring, correlation, feature extraction)

**Step 1: Verify migration 00030 handles historical data normalisation**

**Step 2: Create 5-point visual scale component**

Replace the 1-10 slider with 5 discrete visual options (emoji-based or icon-based).

**Step 3: Update all correlation and analysis code**

Update `packages/core/src/correlation.ts`, `scoring.ts`, `feature-extraction.ts` to expect 5-point scale.

**Step 4: Run all tests, fix any that reference 1-10 scale expectations**

**Step 5: Commit**

```bash
git commit -m "feat: replace 1-10 mood slider with 5-point visual scale"
```

---

### Task 1.8: AI Mentor Crisis De-escalation

**Files:**
- Create: `packages/core/src/safety/crisis-detection.ts`
- Create: `packages/core/src/safety/__tests__/crisis-detection.test.ts`
- Modify: `apps/web/src/app/api/chat/route.ts` (or mentor chat API)
- Verify: `apps/web/e2e/crisis-deescalation.spec.ts` (existing E2E test)

**Step 1: Write failing tests for crisis keyword detection**

Test detection of:
- Direct statements: "I want to die", "I want to kill myself", "I'm going to end it"
- Indirect signals: "no reason to go on", "everyone would be better off without me"
- Self-harm: "I've been cutting", "hurting myself"
- False positives: "this deadline is killing me", "I'm dying of laughter"

**Step 2: Implement crisis detection module**

Pattern matching with keyword lists and context analysis. Never-fail design: if uncertain, err on showing resources.

**Step 3: Implement safety response protocol**

Acknowledge -> Validate -> Provide resources -> Suggest professional help.

Hardcoded helplines:
- Lifeline: 13 11 14
- Beyond Blue: 1300 22 4636
- Emergency: 000

**Step 4: Wire into mentor chat API**

Before processing any mentor chat message, run crisis detection. If triggered, override normal response with safety protocol. Log to `crisis_events` table.

**Step 5: Verify E2E tests pass**

```bash
cd apps/web && pnpm playwright test e2e/crisis-deescalation.spec.ts
```

**Step 6: Commit**

```bash
git commit -m "feat: add crisis de-escalation detection and safety response to mentor chat"
```

---

### Task 1.9: Onboarding Baseline Assessment

**Files:**
- Modify: `apps/web/src/components/onboarding/profiling-wizard.tsx`
- Modify: `apps/web/src/components/onboarding/onboarding-flow.tsx`

**Step 1: Add clinical screening step to profiling wizard**

Extend the profiling wizard with:
- Informed consent screen: "The following questions are validated clinical screening tools..."
- PHQ-9 questions using the clinical screening form component (from Task 1.3)
- GAD-7 questions
- Skip option with explanation: "Skipping reduces personalisation accuracy"

**Step 2: Store baseline scores**

Save screening results as the user's baseline for future comparison.

**Step 3: Run onboarding E2E tests**

```bash
cd e2e && pnpm playwright test tests/onboarding.spec.ts
```

**Step 4: Commit**

```bash
git commit -m "feat: add PHQ-9/GAD-7 baseline assessment to onboarding flow"
```

---

### Task 1.10: Streak Badge Restructuring

**Files:**
- Modify: Badge-related database queries/logic in remaining code

**Step 1: Audit remaining badge references**

After Sprint 0 deleted the badge system, check if any streak badge logic remains embedded in check-in or other flows.

**Step 2: Ensure streak counters are passive indicators only**

Verify streak counters display on dashboard/check-in without celebratory modals or badge unlock mechanics.

**Step 3: Commit**

```bash
git commit -m "refactor: ensure streak counters are passive indicators without badge celebration"
```

---

### Task 1.11: Phase 1 Build Verification & Deploy

**Step 1: Full build and test suite**

```bash
pnpm build && pnpm test
```

**Step 2: Run E2E tests**

```bash
cd e2e && pnpm playwright test
cd apps/web && pnpm playwright test
```

**Step 3: Tag and deploy**

```bash
git tag phase-1-clinical-foundation
```

Push for Vercel deployment. Verify:
- Clinical screening accessible from settings
- Onboarding includes baseline PHQ-9/GAD-7
- Check-in uses 5-point visual scale
- Mentor chat shows crisis resources when triggered
- Sleep analysis shows REM/circadian metrics (if HealthKit data available)
- Opt-in tier selector visible in settings

---

## Phase 2: Intelligent Sensing (Weeks 9-16)

> **Note:** Phases 2-4 task structure follows the same TDD pattern as Phase 1. Each task includes: write failing test -> implement -> verify tests pass -> commit. Detailed test code is omitted for brevity but follows the same rigour.

### Task 2.1: Weather & Environmental Context Service

**Files:**
- Create: `apps/web/src/lib/integrations/weather.ts` (or extend existing)
- Create: `packages/core/src/connectors/weather/` (types and analysis)
- Test: `packages/core/src/connectors/weather/__tests__/weather-analysis.test.ts`

Build weather data ingestion (temperature, sunlight hours, barometric pressure, precipitation), SAD indicator computation from sunlight trends, and feed into correlation engine as contextual features.

---

### Task 2.2: JITAI Adaptive Interventions Engine

**Files:**
- Modify: `supabase/functions/jitai-engine/index.ts`
- Modify: `packages/core/src/jitai/`
- Create: `packages/ai-local/src/jitai-inference.ts`
- Verify: `supabase/migrations/00033_jitai.sql`

Extend the JITAI stub into a working engine:
- Define context feature schema (time, mood, activity, sleep, calendar, HRV)
- Build on-device inference module for real-time intervention decisions
- Implement intervention types: nudge timing, content selection, intensity
- Add decision logging for model improvement

---

### Task 2.3: HRV Stress & Regulation Tracking

**Files:**
- Modify: `packages/core/src/health/hrv-analysis.ts`
- Verify: `supabase/migrations/00034_hrv_metrics.sql`

Extend HRV analysis with RMSSD, SDNN, LF/HF ratio computation. Build stress trend visualisation for health dimension. Feed HRV features into JITAI context.

---

### Task 2.4: Spotify Mood Inference Pipeline

**Files:**
- Create: `apps/web/src/lib/integrations/spotify-mood.ts`
- Test: `packages/core/src/integrations/__tests__/spotify-mood.test.ts`

Build audio features analysis (valence, energy, danceability -> mood classification), listening pattern analysis (genre shifts, tempo changes), and feed into JITAI context and check-in pre-fill.

---

### Task 2.5: Strava Exercise-Mood Correlation Engine

**Files:**
- Create: `packages/core/src/integrations/strava-mood.ts`
- Test: `packages/core/src/integrations/__tests__/strava-mood.test.ts`

Build exercise-mood lag analysis (2h, 6h, 24h, 48h windows), confidence intervals, and surface in correlations view. Focus on consistency, not performance.

---

### Task 2.6: Calendar Social Isolation Detection

**Files:**
- Create: `packages/core/src/integrations/calendar-social.ts`
- Test: `packages/core/src/integrations/__tests__/calendar-social.test.ts`

Build social density metrics from calendar events, isolation detection when density drops below personal baseline, and JITAI social nudge triggers.

---

### Task 2.7: Correlation Engine Upgrade — Lag Analysis & Confidence

**Files:**
- Modify: `supabase/functions/correlation-worker/index.ts`
- Modify: `packages/core/src/correlation.ts`
- Modify: `apps/web/src/app/(protected)/correlations/`

Add lag analysis (1h-72h windows), confidence intervals, minimum sample size (14 data points), and Granger causality. Update correlations UI.

---

### Task 2.8: Nudge Engine to JITAI Integration

**Files:**
- Modify: `supabase/functions/nudge-engine/index.ts`
- Modify: `apps/web/src/lib/nudge/nudge-scheduler.ts`

Replace rule-based scheduling with JITAI-driven timing. Preserve existing nudge UI.

---

### Task 2.9: Adaptive EMA Question Engine

**Files:**
- Modify: `packages/core/src/ema/`
- Create: `packages/ai-local/src/ema-selector.ts`

Build ML-driven question selection with information gain maximisation and burden minimisation. On-device selection via ai-local.

---

### Task 2.10: Phase 2 Build Verification & Deploy

Full build, test, E2E. Tag `phase-2-intelligent-sensing`. Deploy and verify JITAI decisions, adaptive EMA, correlation lag analysis.

---

## Phase 3: Personalisation Engine (Weeks 17-24)

### Task 3.1: N-of-1 Personalised Prediction Models

**Files:**
- Modify: `supabase/functions/model-trainer/index.ts`
- Verify: `supabase/migrations/00036_model_artifacts.sql`
- Create: `packages/ai-local/src/n-of-1-inference.ts`

Build per-user training pipeline with gradient boosting, ONNX export, on-device inference, and weekly retraining.

---

### Task 3.2: SHAP/LIME Explainability Layer

**Files:**
- Modify: `supabase/functions/shap-explainer/index.ts`
- Verify: `supabase/migrations/00037_shap_explanations.sql`

Implement SHAP value computation, cache per prediction, serve to explainability tooltip with user-friendly language.

---

### Task 3.3: Screen Time Digital Phenotyping

**Files:**
- Modify: `packages/core/src/connectors/screen-time/`
- Verify: `supabase/migrations/00038_screen_time.sql`

Add phenotyping logic: late-night usage, app category distribution, pickup frequency. Feed into N-of-1 features and JITAI.

---

### Task 3.4: Journal Linguistic Biomarker Detection

**Files:**
- Modify: `apps/web/src/lib/services/journal-analysis-service.ts`
- Verify: `supabase/migrations/00040_journal_analysis.sql`

Add cognitive distortion detection, emotional word tracking, pronoun ratio, syntactic complexity. Educational framing in UI.

---

### Task 3.5: Open Banking Financial Stress Reframe

**Files:**
- Modify: `apps/web/src/lib/integrations/banking.ts`

Shift from spending tracking to financial stress index. Only for "Full" tier users.

---

### Task 3.6: Clinical Data Export for Therapists

**Files:**
- Modify: `apps/web/src/app/api/export/clinical/`
- Verify: `supabase/migrations/00039_export_audit.sql`
- Verify: `apps/web/e2e/clinical-export.spec.ts`

Build PDF and JSON/CSV export with privacy controls, shareable links with expiry, and audit logging.

---

### Task 3.7: Music-Aware CBT Mood Regulation Module

**Files:**
- Create: `apps/web/src/lib/cbt/music-mood-regulation.ts`

Combine Spotify mood state with CBT technique library. Suggest techniques with matching playlists. Track effectiveness.

---

### Task 3.8: Phase 3 Build Verification & Deploy

Full build, test, E2E. Tag `phase-3-personalisation-engine`. Deploy and verify N-of-1 predictions, SHAP explanations, clinical export.

---

## Phase 4: Scale & Privacy (Weeks 25-32)

### Task 4.1: Federated Learning — Local Training Module

**Files:**
- Modify: `packages/ai-local/src/` (federated local training)
- Modify: `packages/core/src/federated/`

Build on-device gradient computation from N-of-1 model training. Client-side encryption.

---

### Task 4.2: Federated Learning — Coordination Server

**Files:**
- Modify: `supabase/functions/federated-coordinator/index.ts`
- Verify: `supabase/migrations/00041_federated_learning.sql`

Build aggregation round orchestration, minimum participation thresholds, model versioning.

---

### Task 4.3: Differential Privacy & Secure Aggregation

**Files:**
- Modify: `packages/core/src/federated/`

Implement calibrated noise injection (epsilon=1.0), privacy budget tracking, secure aggregation protocol.

---

### Task 4.4: Population Insights Dashboard

**Files:**
- Create: `apps/web/src/app/(protected)/insights/population/`

Build dashboard consuming federated aggregates. Show anonymised trends with clear participant count labelling.

---

### Task 4.5: Federated Opt-In Consent Flow

**Files:**
- Create: `apps/web/src/components/settings/federated-consent.tsx`

Build explicit consent UI explaining federated learning, what gets shared, withdrawal option.

---

### Task 4.6: Phase 4 Build Verification & Deploy

Full build, test, E2E. Tag `phase-4-scale-privacy`. Final deployment. Update all documentation.

---

## Cross-Cutting: Documentation Updates (Each Phase)

After each phase-gate deployment:
1. Update `docs/ARCHITECTURE.md` with new components
2. Update `docs/DATA_MODEL.md` with new tables/migrations
3. Update `docs/ML_AND_ANALYSIS_EXPLAINER.md` with new ML pipelines
4. Update `docs/CLINICAL_SAFETY.md` if crisis pathways changed
5. Commit: `docs: update documentation for Phase N`
