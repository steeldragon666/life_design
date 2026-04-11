# Research-Backed Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Life Design from a wellness tracker into a clinically-informed, ML-powered personal development platform via 28 research-backed changes across 4 phases over 30 weeks.

**Architecture:** Monorepo with `apps/web` (Next.js 15, React 19), `packages/ui` (shared components), `packages/core` (types, scoring, feature extraction), `packages/ai-local` (on-device ML), `packages/ai` (server-side AI). Supabase backend (Postgres + Edge Functions + pgvector). On-device inference for latency-sensitive workloads (JITAI, mood prediction); server-side for compute-heavy workloads (N-of-1 training, federated aggregation, SHAP).

**Tech Stack:** TypeScript, Next.js 15 (App Router), React 19, Supabase (Deno Edge Functions), Tailwind CSS v4, CVA, ONNX Runtime, Vitest, pnpm workspaces + Turborepo.

**Test runner:** `pnpm --filter <package> exec vitest run` (use `--pool=forks --poolOptions.forks.maxForks=2` if memory-constrained).

**Key conventions:**
- Psychometric instruments live in `packages/core/src/profiling/instruments.ts`
- Scoring functions live in `packages/core/src/profiling/psychometric-scoring.ts`
- Types live in `packages/core/src/profiling/psychometric-types.ts`
- Feature extraction lives in `packages/core/src/feature-extraction.ts`
- Correlations live in `packages/core/src/correlation.ts`
- Enums (IntegrationProvider, Dimension, etc.) live in `packages/core/src/enums.ts`
- Supabase Edge Functions are Deno, using `https://esm.sh/@supabase/supabase-js@2`
- Supabase migrations are numbered sequentially: `00027_*.sql`, `00028_*.sql`, etc.
- Tests use Vitest with `vi.fn()`, `vi.mock()` — NOT jest equivalents
- `jsdom` test environment requires mocking `window.matchMedia` and `Element.prototype.scrollIntoView`

---

# Phase 1: Clinical Foundation (Weeks 1–6)

---

## Task 1: Integration Audit (Phase 1 Prerequisite)

**Goal:** Smoke test every external integration connector to verify it authenticates and returns data. Document status. Budget repair time.

**Files:**
- Create: `docs/integration-audit.md`
- Read: `apps/web/src/lib/integrations/spotify.ts`
- Read: `apps/web/src/lib/integrations/apple-health.ts`
- Read: `apps/web/src/lib/integrations/banking.ts`
- Read: `apps/web/src/lib/integrations/weather.ts`
- Read: `packages/core/src/connectors/strava.ts`
- Read: `packages/core/src/connectors/google-calendar.ts`

**Step 1: Read each integration file**

Read all 6 integration files listed above. For each one, note:
- Does it export a function that makes real API calls?
- Does it handle authentication (OAuth tokens, API keys)?
- Does it have error handling for expired tokens / rate limits?
- Is it a stub (just types/interfaces with no implementation)?

**Step 2: Create audit document**

Create `docs/integration-audit.md` with a table:

```markdown
# Integration Audit — 2026-04-11

| Provider | File | Status | Auth Method | Data Returns | Issues |
|----------|------|--------|-------------|-------------|--------|
| Spotify | `apps/web/src/lib/integrations/spotify.ts` | ? | OAuth 2.0 | ? | ? |
| Strava | `packages/core/src/connectors/strava.ts` | ? | OAuth 2.0 | ? | ? |
| Apple Health | `apps/web/src/lib/integrations/apple-health.ts` | ? | Native API | ? | ? |
| Google Calendar | `packages/core/src/connectors/google-calendar.ts` | ? | OAuth 2.0 | ? | ? |
| Weather | `apps/web/src/lib/integrations/weather.ts` | ? | API Key | ? | ? |
| Open Banking | `apps/web/src/lib/integrations/banking.ts` | ? | OAuth 2.0 | ? | ? |

## Repair Needed
- [ ] ...
```

Fill in based on code review findings.

**Step 3: Commit**

```bash
git add docs/integration-audit.md
git commit -m "docs: add integration audit results for Phase 1 prerequisite"
```

---

## Task 2: Remove Performance-Based Fitness Leaderboards (Hard Delete)

**Goal:** Remove all leaderboard code and database structures. This is a CRITICAL removal — the spec cites research showing leaderboards undermine intrinsic motivation.

**Files:**
- Modify: `supabase/migrations/` (create new migration `00027_remove_leaderboards.sql`)
- Search & delete: Any files containing "leaderboard" in `apps/web/src/`

**Step 1: Search for leaderboard code**

```bash
grep -r -l "leaderboard" apps/web/src/ packages/
```

Document all files found.

**Step 2: Read the gamification migration**

Read `supabase/migrations/00012_gamification_and_entitlements.sql` to understand what leaderboard tables/columns exist.

**Step 3: Create removal migration**

Create `supabase/migrations/00027_remove_leaderboards.sql`:

```sql
-- Remove leaderboard tables and columns
-- Part of Research-Backed Redesign Phase 1: removing performance-based competition

DROP TABLE IF EXISTS leaderboard_entries CASCADE;
DROP TABLE IF EXISTS leaderboards CASCADE;

-- Remove any leaderboard-related columns from other tables
-- (Adjust based on what 00012 actually created)
```

**Step 4: Delete all leaderboard UI code**

Delete every file found in Step 1 that is exclusively leaderboard-related. For files that contain leaderboard code mixed with other code, remove only the leaderboard sections.

**Step 5: Remove navigation references**

Search for leaderboard references in navigation components (`BottomNav.tsx`, `NavBar.tsx`, sidebar, etc.) and remove them.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: remove performance-based fitness leaderboards (research-backed redesign)"
```

---

## Task 3: Remove Instagram Integration (Hard Delete)

**Goal:** Remove all Instagram OAuth, callback, and integration code.

**Files:**
- Delete: `apps/web/src/app/api/auth/instagram/route.ts`
- Delete: `apps/web/src/app/api/integrations/instagram/callback/route.ts`
- Modify: `packages/core/src/enums.ts` (remove `Instagram` from `IntegrationProvider`)
- Modify: `apps/web/src/components/onboarding/cards/connect-apps-card.tsx` (remove Instagram option)
- Modify: `apps/web/src/components/onboarding/cards/data-import-card.tsx` (remove Instagram option)
- Modify: `apps/web/src/app/(protected)/settings/settings-client.tsx` (remove Instagram)
- Create: `supabase/migrations/00028_remove_instagram.sql`

**Step 1: Delete Instagram route files**

Delete the two route files:
- `apps/web/src/app/api/auth/instagram/route.ts`
- `apps/web/src/app/api/integrations/instagram/callback/route.ts`

**Step 2: Remove from IntegrationProvider enum**

In `packages/core/src/enums.ts`, remove:
```typescript
Instagram = 'instagram',
```

**Step 3: Update tests for enum**

Read `packages/core/src/__tests__/enums.test.ts` and remove any Instagram-related test cases.

**Step 4: Run tests to verify enum removal doesn't break**

```bash
pnpm --filter @life-design/core exec vitest run
```

Expected: PASS (or failures pointing to other files that reference `IntegrationProvider.Instagram`)

**Step 5: Fix all import references**

Search for `Instagram` or `instagram` in the codebase and remove/update references in:
- `connect-apps-card.tsx`
- `data-import-card.tsx`
- `settings-client.tsx`
- Any provider mapping files

**Step 6: Create cleanup migration**

Create `supabase/migrations/00028_remove_instagram.sql`:
```sql
-- Remove Instagram integration data
DELETE FROM user_connections WHERE provider = 'instagram';
DELETE FROM integration_metadata WHERE provider = 'instagram';
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: remove Instagram integration (research-backed redesign)"
```

---

## Task 4: Remove Gamification Volume Badges (Hard Delete)

**Goal:** Remove quantity-based badges (e.g., "100 check-ins", "50 journal entries") while keeping milestone/quality badges (e.g., "first check-in", "7-day streak").

**Files:**
- Modify: Badge definition files in `apps/web/src/lib/achievements/` or `apps/web/src/components/achievements/`
- Modify: `supabase/migrations/00012_gamification_and_entitlements.sql` (reference only — create new migration)
- Create: `supabase/migrations/00029_remove_volume_badges.sql`

**Step 1: Find badge definitions**

```bash
grep -r -l "badge\|achievement" apps/web/src/lib/ apps/web/src/components/achievements/
```

Read the badge definition file to identify which badges are volume-based vs quality-based.

**Step 2: Classify badges**

For each badge, classify:
- **KEEP** (quality/milestone): first check-in, first journal, 7-day streak, first goal completed
- **REMOVE** (volume): 100 check-ins, 50 journal entries, 500 check-ins, etc.

**Step 3: Remove volume badge definitions**

Remove the volume-based badge objects from the definition file(s).

**Step 4: Update badge display components**

Ensure components in `apps/web/src/components/achievements/` handle the reduced badge set without layout issues.

**Step 5: Create cleanup migration**

Create `supabase/migrations/00029_remove_volume_badges.sql`:
```sql
-- Remove volume-based badge awards
-- Keep milestone/quality badges
DELETE FROM user_badges WHERE badge_id IN (
  SELECT id FROM badges WHERE type = 'volume'
);
DELETE FROM badges WHERE type = 'volume';
```

(Adjust column/table names based on actual schema from 00012.)

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: remove gamification volume badges, keep quality milestones"
```

---

## Task 5: PHQ-9 Clinical Screening Instrument

**Goal:** Add the validated PHQ-9 (Patient Health Questionnaire-9) depression screening instrument to the profiling system.

**Files:**
- Modify: `packages/core/src/profiling/psychometric-types.ts`
- Modify: `packages/core/src/profiling/instruments.ts`
- Modify: `packages/core/src/profiling/psychometric-scoring.ts`
- Create: `packages/core/src/profiling/__tests__/phq9-scoring.test.ts`

**Step 1: Write the failing test**

Create `packages/core/src/profiling/__tests__/phq9-scoring.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { scorePHQ9 } from '../psychometric-scoring';

describe('scorePHQ9', () => {
  it('scores minimal depression (0-4)', () => {
    const responses: Record<string, number> = {
      phq9_1: 0, phq9_2: 0, phq9_3: 0, phq9_4: 1,
      phq9_5: 0, phq9_6: 0, phq9_7: 0, phq9_8: 0, phq9_9: 0,
    };
    const result = scorePHQ9(responses);
    expect(result.score).toBe(1);
    expect(result.severity).toBe('minimal');
  });

  it('scores mild depression (5-9)', () => {
    const responses: Record<string, number> = {
      phq9_1: 1, phq9_2: 1, phq9_3: 1, phq9_4: 1,
      phq9_5: 1, phq9_6: 0, phq9_7: 0, phq9_8: 0, phq9_9: 0,
    };
    const result = scorePHQ9(responses);
    expect(result.score).toBe(5);
    expect(result.severity).toBe('mild');
  });

  it('scores moderate depression (10-14)', () => {
    const responses: Record<string, number> = {
      phq9_1: 2, phq9_2: 2, phq9_3: 1, phq9_4: 1,
      phq9_5: 1, phq9_6: 1, phq9_7: 1, phq9_8: 1, phq9_9: 0,
    };
    const result = scorePHQ9(responses);
    expect(result.score).toBe(10);
    expect(result.severity).toBe('moderate');
  });

  it('scores moderately severe depression (15-19)', () => {
    const responses: Record<string, number> = {
      phq9_1: 2, phq9_2: 2, phq9_3: 2, phq9_4: 2,
      phq9_5: 2, phq9_6: 2, phq9_7: 2, phq9_8: 1, phq9_9: 0,
    };
    const result = scorePHQ9(responses);
    expect(result.score).toBe(15);
    expect(result.severity).toBe('moderately_severe');
  });

  it('scores severe depression (20-27)', () => {
    const responses: Record<string, number> = {
      phq9_1: 3, phq9_2: 3, phq9_3: 3, phq9_4: 3,
      phq9_5: 3, phq9_6: 3, phq9_7: 3, phq9_8: 3, phq9_9: 0,
    };
    const result = scorePHQ9(responses);
    expect(result.score).toBe(24);
    expect(result.severity).toBe('severe');
  });

  it('flags critical item 9 (suicidal ideation)', () => {
    const responses: Record<string, number> = {
      phq9_1: 0, phq9_2: 0, phq9_3: 0, phq9_4: 0,
      phq9_5: 0, phq9_6: 0, phq9_7: 0, phq9_8: 0, phq9_9: 1,
    };
    const result = scorePHQ9(responses);
    expect(result.criticalItem9).toBe(true);
  });

  it('handles missing items gracefully', () => {
    const responses: Record<string, number> = {};
    const result = scorePHQ9(responses);
    expect(result.score).toBe(0);
    expect(result.severity).toBe('minimal');
    expect(result.criticalItem9).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter @life-design/core exec vitest run src/profiling/__tests__/phq9-scoring.test.ts
```

Expected: FAIL — `scorePHQ9` is not exported from `psychometric-scoring.ts`.

**Step 3: Add PHQ-9 types**

In `packages/core/src/profiling/psychometric-types.ts`, add:

```typescript
/** PHQ-9 Patient Health Questionnaire (Kroenke et al., 2001) — 0-27 scale */
export interface PHQ9Score {
  score: number;
  severity: 'minimal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe';
  criticalItem9: boolean; // Item 9 = suicidal ideation, any non-zero value is flagged
}
```

Also update the `PsychometricItem` instrument union to include `'phq9'`:
```typescript
instrument: 'perma' | 'tipi' | 'grit' | 'swls' | 'bpns' | 'chronotype' | 'sleep' | 'stress' | 'selfCompassion' | 'locusOfControl' | 'phq9' | 'gad7';
```

**Step 4: Add PHQ-9 items**

In `packages/core/src/profiling/instruments.ts`, add after the existing instruments:

```typescript
// ---------------------------------------------------------------------------
// PHQ-9 Patient Health Questionnaire (Kroenke, Spitzer, Williams, 2001)
// 9 items, 0-3 scale (Not at all / Several days / More than half / Nearly every day)
// Scoring: 0-4 minimal, 5-9 mild, 10-14 moderate, 15-19 moderately severe, 20-27 severe
// CRITICAL: Item 9 (suicidal ideation) — any non-zero response triggers safety protocol
// ---------------------------------------------------------------------------

const PHQ9_ITEMS: PsychometricItem[] = [
  {
    id: 'phq9_1',
    instrument: 'phq9',
    subscale: 'depression',
    text: 'Little interest or pleasure in doing things',
    reversed: false,
    scaleMin: 0,
    scaleMax: 3,
  },
  {
    id: 'phq9_2',
    instrument: 'phq9',
    subscale: 'depression',
    text: 'Feeling down, depressed, or hopeless',
    reversed: false,
    scaleMin: 0,
    scaleMax: 3,
  },
  {
    id: 'phq9_3',
    instrument: 'phq9',
    subscale: 'depression',
    text: 'Trouble falling or staying asleep, or sleeping too much',
    reversed: false,
    scaleMin: 0,
    scaleMax: 3,
  },
  {
    id: 'phq9_4',
    instrument: 'phq9',
    subscale: 'depression',
    text: 'Feeling tired or having little energy',
    reversed: false,
    scaleMin: 0,
    scaleMax: 3,
  },
  {
    id: 'phq9_5',
    instrument: 'phq9',
    subscale: 'depression',
    text: 'Poor appetite or overeating',
    reversed: false,
    scaleMin: 0,
    scaleMax: 3,
  },
  {
    id: 'phq9_6',
    instrument: 'phq9',
    subscale: 'depression',
    text: 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
    reversed: false,
    scaleMin: 0,
    scaleMax: 3,
  },
  {
    id: 'phq9_7',
    instrument: 'phq9',
    subscale: 'depression',
    text: 'Trouble concentrating on things, such as reading the newspaper or watching television',
    reversed: false,
    scaleMin: 0,
    scaleMax: 3,
  },
  {
    id: 'phq9_8',
    instrument: 'phq9',
    subscale: 'depression',
    text: 'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual',
    reversed: false,
    scaleMin: 0,
    scaleMax: 3,
  },
  {
    id: 'phq9_9',
    instrument: 'phq9',
    subscale: 'depression',
    text: 'Thoughts that you would be better off dead, or of hurting yourself in some way',
    reversed: false,
    scaleMin: 0,
    scaleMax: 3,
  },
];

export { PHQ9_ITEMS };
```

Add PHQ9_ITEMS to the `PSYCHOMETRIC_ITEMS` export:
```typescript
export const PSYCHOMETRIC_ITEMS: PsychometricItem[] = [
  ...PERMA_ITEMS,
  ...TIPI_ITEMS,
  ...GRIT_ITEMS,
  ...SWLS_ITEMS,
  ...BPNS_ITEMS,
  ...BASELINE_ITEMS,
  ...PHQ9_ITEMS,
];
```

**Step 5: Implement PHQ-9 scoring**

In `packages/core/src/profiling/psychometric-scoring.ts`, add:

```typescript
import type { PHQ9Score } from './psychometric-types';

// ---------------------------------------------------------------------------
// PHQ-9 Patient Health Questionnaire (Kroenke et al., 2001)
// Items: phq9_1..phq9_9, 0-3 scale, no reversed items
// Sum range: 0-27
// Severity: 0-4 minimal, 5-9 mild, 10-14 moderate, 15-19 moderately_severe, 20-27 severe
// CRITICAL: Item 9 (suicidal ideation) — any non-zero triggers safety flag
// ---------------------------------------------------------------------------

export function scorePHQ9(responses: Record<string, number>): PHQ9Score {
  let score = 0;
  for (let i = 1; i <= 9; i++) {
    score += responses[`phq9_${i}`] ?? 0;
  }

  let severity: PHQ9Score['severity'];
  if (score >= 20) severity = 'severe';
  else if (score >= 15) severity = 'moderately_severe';
  else if (score >= 10) severity = 'moderate';
  else if (score >= 5) severity = 'mild';
  else severity = 'minimal';

  const criticalItem9 = (responses['phq9_9'] ?? 0) > 0;

  return { score, severity, criticalItem9 };
}
```

**Step 6: Run tests to verify they pass**

```bash
pnpm --filter @life-design/core exec vitest run src/profiling/__tests__/phq9-scoring.test.ts
```

Expected: all 7 tests PASS.

**Step 7: Commit**

```bash
git add packages/core/src/profiling/
git commit -m "feat: add PHQ-9 depression screening instrument with scoring"
```

---

## Task 6: GAD-7 Clinical Screening Instrument

**Goal:** Add the validated GAD-7 (Generalized Anxiety Disorder-7) anxiety screening instrument.

**Files:**
- Modify: `packages/core/src/profiling/psychometric-types.ts`
- Modify: `packages/core/src/profiling/instruments.ts`
- Modify: `packages/core/src/profiling/psychometric-scoring.ts`
- Create: `packages/core/src/profiling/__tests__/gad7-scoring.test.ts`

**Step 1: Write the failing test**

Create `packages/core/src/profiling/__tests__/gad7-scoring.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { scoreGAD7 } from '../psychometric-scoring';

describe('scoreGAD7', () => {
  it('scores minimal anxiety (0-4)', () => {
    const responses: Record<string, number> = {
      gad7_1: 0, gad7_2: 1, gad7_3: 0, gad7_4: 0,
      gad7_5: 0, gad7_6: 0, gad7_7: 0,
    };
    const result = scoreGAD7(responses);
    expect(result.score).toBe(1);
    expect(result.severity).toBe('minimal');
  });

  it('scores mild anxiety (5-9)', () => {
    const responses: Record<string, number> = {
      gad7_1: 1, gad7_2: 1, gad7_3: 1, gad7_4: 1,
      gad7_5: 1, gad7_6: 1, gad7_7: 1,
    };
    const result = scoreGAD7(responses);
    expect(result.score).toBe(7);
    expect(result.severity).toBe('mild');
  });

  it('scores moderate anxiety (10-14)', () => {
    const responses: Record<string, number> = {
      gad7_1: 2, gad7_2: 2, gad7_3: 2, gad7_4: 2,
      gad7_5: 2, gad7_6: 0, gad7_7: 0,
    };
    const result = scoreGAD7(responses);
    expect(result.score).toBe(10);
    expect(result.severity).toBe('moderate');
  });

  it('scores severe anxiety (15-21)', () => {
    const responses: Record<string, number> = {
      gad7_1: 3, gad7_2: 3, gad7_3: 3, gad7_4: 3,
      gad7_5: 3, gad7_6: 0, gad7_7: 0,
    };
    const result = scoreGAD7(responses);
    expect(result.score).toBe(15);
    expect(result.severity).toBe('severe');
  });

  it('handles missing items gracefully', () => {
    const responses: Record<string, number> = {};
    const result = scoreGAD7(responses);
    expect(result.score).toBe(0);
    expect(result.severity).toBe('minimal');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter @life-design/core exec vitest run src/profiling/__tests__/gad7-scoring.test.ts
```

Expected: FAIL — `scoreGAD7` is not exported.

**Step 3: Add GAD-7 types**

In `packages/core/src/profiling/psychometric-types.ts`, add:

```typescript
/** GAD-7 Generalized Anxiety Disorder Scale (Spitzer et al., 2006) — 0-21 scale */
export interface GAD7Score {
  score: number;
  severity: 'minimal' | 'mild' | 'moderate' | 'severe';
}
```

**Step 4: Add GAD-7 items**

In `packages/core/src/profiling/instruments.ts`, add:

```typescript
// ---------------------------------------------------------------------------
// GAD-7 Generalized Anxiety Disorder Scale (Spitzer, Kroenke, Williams, Löwe, 2006)
// 7 items, 0-3 scale (Not at all / Several days / More than half / Nearly every day)
// Scoring: 0-4 minimal, 5-9 mild, 10-14 moderate, 15-21 severe
// ---------------------------------------------------------------------------

const GAD7_ITEMS: PsychometricItem[] = [
  {
    id: 'gad7_1',
    instrument: 'gad7',
    subscale: 'anxiety',
    text: 'Feeling nervous, anxious, or on edge',
    reversed: false,
    scaleMin: 0,
    scaleMax: 3,
  },
  {
    id: 'gad7_2',
    instrument: 'gad7',
    subscale: 'anxiety',
    text: 'Not being able to stop or control worrying',
    reversed: false,
    scaleMin: 0,
    scaleMax: 3,
  },
  {
    id: 'gad7_3',
    instrument: 'gad7',
    subscale: 'anxiety',
    text: 'Worrying too much about different things',
    reversed: false,
    scaleMin: 0,
    scaleMax: 3,
  },
  {
    id: 'gad7_4',
    instrument: 'gad7',
    subscale: 'anxiety',
    text: 'Trouble relaxing',
    reversed: false,
    scaleMin: 0,
    scaleMax: 3,
  },
  {
    id: 'gad7_5',
    instrument: 'gad7',
    subscale: 'anxiety',
    text: 'Being so restless that it is hard to sit still',
    reversed: false,
    scaleMin: 0,
    scaleMax: 3,
  },
  {
    id: 'gad7_6',
    instrument: 'gad7',
    subscale: 'anxiety',
    text: 'Becoming easily annoyed or irritable',
    reversed: false,
    scaleMin: 0,
    scaleMax: 3,
  },
  {
    id: 'gad7_7',
    instrument: 'gad7',
    subscale: 'anxiety',
    text: 'Feeling afraid, as if something awful might happen',
    reversed: false,
    scaleMin: 0,
    scaleMax: 3,
  },
];

export { GAD7_ITEMS };
```

Add to `PSYCHOMETRIC_ITEMS` array.

**Step 5: Implement GAD-7 scoring**

In `packages/core/src/profiling/psychometric-scoring.ts`, add:

```typescript
import type { GAD7Score } from './psychometric-types';

export function scoreGAD7(responses: Record<string, number>): GAD7Score {
  let score = 0;
  for (let i = 1; i <= 7; i++) {
    score += responses[`gad7_${i}`] ?? 0;
  }

  let severity: GAD7Score['severity'];
  if (score >= 15) severity = 'severe';
  else if (score >= 10) severity = 'moderate';
  else if (score >= 5) severity = 'mild';
  else severity = 'minimal';

  return { score, severity };
}
```

**Step 6: Run tests to verify they pass**

```bash
pnpm --filter @life-design/core exec vitest run src/profiling/__tests__/gad7-scoring.test.ts
```

Expected: all 5 tests PASS.

**Step 7: Commit**

```bash
git add packages/core/src/profiling/
git commit -m "feat: add GAD-7 anxiety screening instrument with scoring"
```

---

## Task 7: Clinical Screenings Database Migration

**Goal:** Create database tables for storing PHQ-9 and GAD-7 screening results with audit trail.

**Files:**
- Create: `supabase/migrations/00030_clinical_screenings.sql`

**Step 1: Create migration**

Create `supabase/migrations/00030_clinical_screenings.sql`:

```sql
-- Clinical screening instruments (PHQ-9, GAD-7)
-- Part of Research-Backed Redesign Phase 1

CREATE TABLE IF NOT EXISTS clinical_screenings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument text NOT NULL CHECK (instrument IN ('phq9', 'gad7')),
  responses jsonb NOT NULL DEFAULT '{}',
  total_score integer NOT NULL,
  severity text NOT NULL,
  critical_flags jsonb DEFAULT '{}',
  context text DEFAULT 'routine', -- 'onboarding', 'routine', 'followup'
  administered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for user timeline queries
CREATE INDEX idx_clinical_screenings_user_date
  ON clinical_screenings(user_id, administered_at DESC);

-- Index for severity monitoring
CREATE INDEX idx_clinical_screenings_severity
  ON clinical_screenings(instrument, severity);

-- RLS policies
ALTER TABLE clinical_screenings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own screenings"
  ON clinical_screenings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own screenings"
  ON clinical_screenings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Crisis events audit table (clinical-grade logging)
CREATE TABLE IF NOT EXISTS crisis_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_type text NOT NULL, -- 'phq9_item9', 'mentor_keyword', 'manual'
  trigger_detail jsonb DEFAULT '{}',
  response_shown jsonb NOT NULL, -- what safety resources were displayed
  acknowledged_at timestamptz, -- when user acknowledged the resources
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crisis_events_user
  ON crisis_events(user_id, created_at DESC);

ALTER TABLE crisis_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own crisis events"
  ON crisis_events FOR SELECT
  USING (auth.uid() = user_id);

-- Only server-side can insert crisis events (via service role)
CREATE POLICY "Service role inserts crisis events"
  ON crisis_events FOR INSERT
  WITH CHECK (true);
```

**Step 2: Apply migration locally**

```bash
cd supabase && npx supabase db reset
```

Or if using remote: `npx supabase db push`

**Step 3: Commit**

```bash
git add supabase/migrations/00030_clinical_screenings.sql
git commit -m "feat: add clinical_screenings and crisis_events tables"
```

---

## Task 8: Clinical Screening UI Component

**Goal:** Build a reusable clinical screening form component that renders PHQ-9 or GAD-7 questions with proper disclaimers.

**Files:**
- Create: `apps/web/src/components/screening/clinical-screening-form.tsx`
- Create: `apps/web/src/components/screening/screening-disclaimer.tsx`
- Create: `apps/web/src/components/screening/__tests__/clinical-screening-form.test.tsx`

**Step 1: Write the failing test**

Create `apps/web/src/components/screening/__tests__/clinical-screening-form.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ClinicalScreeningForm } from '../clinical-screening-form';

describe('ClinicalScreeningForm', () => {
  it('renders PHQ-9 questions', () => {
    render(
      <ClinicalScreeningForm
        instrument="phq9"
        onComplete={vi.fn()}
        onCriticalFlag={vi.fn()}
      />
    );
    expect(screen.getByText(/Little interest or pleasure/)).toBeInTheDocument();
  });

  it('renders GAD-7 questions', () => {
    render(
      <ClinicalScreeningForm
        instrument="gad7"
        onComplete={vi.fn()}
        onCriticalFlag={vi.fn()}
      />
    );
    expect(screen.getByText(/Feeling nervous, anxious/)).toBeInTheDocument();
  });

  it('shows disclaimer text', () => {
    render(
      <ClinicalScreeningForm
        instrument="phq9"
        onComplete={vi.fn()}
        onCriticalFlag={vi.fn()}
      />
    );
    expect(screen.getByText(/not a clinical diagnosis/i)).toBeInTheDocument();
  });

  it('calls onComplete with scores when submitted', async () => {
    const onComplete = vi.fn();
    render(
      <ClinicalScreeningForm
        instrument="phq9"
        onComplete={onComplete}
        onCriticalFlag={vi.fn()}
      />
    );

    // Select "Not at all" (0) for all questions, then submit
    const buttons = screen.getAllByRole('radio', { name: /not at all/i });
    buttons.forEach(btn => fireEvent.click(btn));

    const submit = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submit);

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        score: 0,
        severity: 'minimal',
      })
    );
  });

  it('calls onCriticalFlag when PHQ-9 item 9 is non-zero', () => {
    const onCriticalFlag = vi.fn();
    render(
      <ClinicalScreeningForm
        instrument="phq9"
        onComplete={vi.fn()}
        onCriticalFlag={onCriticalFlag}
      />
    );

    // Find item 9 and select "Several days" (1)
    const item9Options = screen.getAllByRole('radio', { name: /several days/i });
    // Item 9 is the last set of radio buttons
    fireEvent.click(item9Options[item9Options.length - 1]);

    expect(onCriticalFlag).toHaveBeenCalled();
  });
});
```

**Step 2: Implement the component**

Create `apps/web/src/components/screening/screening-disclaimer.tsx`:

```typescript
export function ScreeningDisclaimer() {
  return (
    <div className="rounded-lg bg-stone-50 border border-stone-200 p-4 text-sm text-stone-600">
      <p className="font-medium text-stone-700 mb-1">Important</p>
      <p>
        This is a validated screening tool, not a clinical diagnosis.
        Results should be discussed with a qualified healthcare professional.
        If you are in crisis, please contact Lifeline on{' '}
        <a href="tel:131114" className="font-semibold text-sage-700 underline">13 11 14</a>
        {' '}or call{' '}
        <a href="tel:000" className="font-semibold text-sage-700 underline">000</a>
        {' '}for emergencies.
      </p>
    </div>
  );
}
```

Create `apps/web/src/components/screening/clinical-screening-form.tsx` implementing:
- Renders instrument questions from `PHQ9_ITEMS` or `GAD7_ITEMS`
- 4-option Likert scale per question (Not at all / Several days / More than half / Nearly every day)
- Calls `onCriticalFlag()` immediately when PHQ-9 item 9 gets a non-zero response
- Calls `onComplete(score)` when all questions answered and submitted
- Includes `<ScreeningDisclaimer />` at top

**Step 3: Run tests**

```bash
pnpm --filter web exec vitest run src/components/screening/__tests__/clinical-screening-form.test.tsx
```

**Step 4: Commit**

```bash
git add apps/web/src/components/screening/
git commit -m "feat: add clinical screening form component with PHQ-9/GAD-7 support"
```

---

## Task 9: 5-Point Visual Scale Migration

**Goal:** Replace the 1-10 mood scale with a 5-point visual scale. Migrate historical data.

**Files:**
- Modify: `apps/web/src/components/checkin/mood-slider.tsx`
- Modify: `apps/web/src/components/checkin/ghost-slider.tsx`
- Modify: `apps/web/src/components/checkin/checkin-form.tsx`
- Create: `supabase/migrations/00031_five_point_scale.sql`
- Modify: `packages/core/src/feature-extraction.ts` (normalisation expectations)
- Modify: `apps/web/src/lib/ml/feature-pipeline.ts` (normalisation)

**Step 1: Create data migration**

Create `supabase/migrations/00031_five_point_scale.sql`:

```sql
-- Migrate 1-10 mood scores to 1-5 scale
-- Formula: ROUND(old_score / 2.0), clamped to [1,5]
-- 1-2 → 1, 3-4 → 2, 5-6 → 3, 7-8 → 4, 9-10 → 5

-- Add new column, migrate, then rename
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS mood_5pt smallint;

UPDATE check_ins
SET mood_5pt = LEAST(5, GREATEST(1, ROUND(mood::numeric / 2.0)))
WHERE mood IS NOT NULL;

-- Also migrate dimension scores if they use 1-10
-- (Check actual column names — adjust as needed)
```

**Step 2: Update mood slider component**

Modify `apps/web/src/components/checkin/mood-slider.tsx`:
- Change from continuous 1-10 slider to 5 discrete buttons
- Each point has a visual indicator (emoji or icon):
  - 1 = Very Low, 2 = Low, 3 = Okay, 4 = Good, 5 = Great
- Accessible labels for each option

**Step 3: Update ghost slider and checkin form**

Update `ghost-slider.tsx` and `checkin-form.tsx` to work with 5-point values.

**Step 4: Update ML pipeline normalisation**

In `apps/web/src/lib/ml/feature-pipeline.ts`, update any normalisation that assumes 1-10 range to expect 1-5.

**Step 5: Run all check-in tests**

```bash
pnpm --filter web exec vitest run src/components/checkin/
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: migrate mood tracking from 1-10 to 5-point visual scale"
```

---

## Task 10: Crisis De-escalation System (Clinical-Grade)

**Goal:** Add crisis detection and safety response to AI mentor conversations. This is the most safety-critical feature in the entire redesign. Never-fail design.

**Files:**
- Create: `packages/core/src/safety/crisis-detection.ts`
- Create: `packages/core/src/safety/crisis-response.ts`
- Create: `packages/core/src/safety/types.ts`
- Create: `packages/core/src/safety/__tests__/crisis-detection.test.ts`
- Create: `packages/core/src/safety/__tests__/crisis-response.test.ts`
- Modify: `apps/web/src/lib/agents/` or mentor chat handler

**Step 1: Write the failing test for crisis detection**

Create `packages/core/src/safety/__tests__/crisis-detection.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { detectCrisisIndicators, CrisisLevel } from '../crisis-detection';

describe('detectCrisisIndicators', () => {
  it('detects explicit suicidal ideation', () => {
    const result = detectCrisisIndicators('I want to kill myself');
    expect(result.level).toBe(CrisisLevel.High);
    expect(result.matched).toBe(true);
  });

  it('detects self-harm language', () => {
    const result = detectCrisisIndicators('I have been hurting myself');
    expect(result.level).toBe(CrisisLevel.High);
    expect(result.matched).toBe(true);
  });

  it('detects hopelessness patterns', () => {
    const result = detectCrisisIndicators('I see no point in going on');
    expect(result.level).toBe(CrisisLevel.Medium);
    expect(result.matched).toBe(true);
  });

  it('does not flag normal conversation', () => {
    const result = detectCrisisIndicators('I had a tough day at work');
    expect(result.matched).toBe(false);
  });

  it('does not flag metaphorical usage', () => {
    const result = detectCrisisIndicators('This deadline is killing me');
    expect(result.matched).toBe(false);
  });

  it('is case-insensitive', () => {
    const result = detectCrisisIndicators('I WANT TO END IT ALL');
    expect(result.matched).toBe(true);
  });

  it('errs on the side of caution for ambiguous input', () => {
    const result = detectCrisisIndicators('I just want everything to stop');
    // Should match — better to show resources unnecessarily than miss a crisis
    expect(result.matched).toBe(true);
  });
});
```

**Step 2: Implement crisis detection**

Create `packages/core/src/safety/types.ts`:

```typescript
export enum CrisisLevel {
  None = 'none',
  Low = 'low',       // Distress but not imminent risk
  Medium = 'medium', // Hopelessness, passive ideation
  High = 'high',     // Active ideation, self-harm, explicit intent
}

export interface CrisisDetectionResult {
  matched: boolean;
  level: CrisisLevel;
  triggers: string[];
  confidence: number;
}

export interface CrisisResponse {
  message: string;
  resources: CrisisResource[];
  level: CrisisLevel;
}

export interface CrisisResource {
  name: string;
  phone: string;
  description: string;
  url?: string;
}
```

Create `packages/core/src/safety/crisis-detection.ts`:

```typescript
import { CrisisLevel, type CrisisDetectionResult } from './types';

// CRITICAL: These patterns must be carefully validated.
// False negatives (missing a crisis) are far worse than false positives.
// When in doubt, flag it.

const HIGH_PATTERNS = [
  /\b(kill|end)\s+(my\s*self|myself|my\s+life)\b/i,
  /\bsuicid/i,
  /\bwant\s+to\s+die\b/i,
  /\bbetter\s+off\s+dead\b/i,
  /\bhurting\s+(my\s*self|myself)\b/i,
  /\bself[- ]?harm/i,
  /\bcut(ting)?\s+(my\s*self|myself)\b/i,
  /\btake\s+my\s+(own\s+)?life\b/i,
  /\bend\s+it\s+all\b/i,
];

const MEDIUM_PATTERNS = [
  /\bno\s+point\s+(in\s+)?(going\s+on|living|continuing)\b/i,
  /\bcan'?t\s+go\s+on\b/i,
  /\bwant\s+everything\s+to\s+stop\b/i,
  /\bdon'?t\s+want\s+to\s+(be\s+here|exist|wake\s+up)\b/i,
  /\bwish\s+I\s+(was|were)\s+(dead|gone|never\s+born)\b/i,
  /\bnobody\s+would\s+(care|miss|notice)\b/i,
  /\beveryone\s+would\s+be\s+better\s+off\s+without\s+me\b/i,
];

// Patterns that look dangerous but are common metaphorical usage
const FALSE_POSITIVE_PATTERNS = [
  /\bkilling\s+(it|the\s+game|time)\b/i,
  /\b(deadline|work|job|traffic|weather)\s+is\s+killing\b/i,
  /\bto\s+die\s+for\b/i,
  /\bdying\s+(to|of)\s+(try|see|know|laughter|curiosity)\b/i,
];

export function detectCrisisIndicators(text: string): CrisisDetectionResult {
  const normalised = text.toLowerCase().trim();
  const triggers: string[] = [];

  // Check false positives first
  for (const pattern of FALSE_POSITIVE_PATTERNS) {
    if (pattern.test(normalised)) {
      return { matched: false, level: CrisisLevel.None, triggers: [], confidence: 0.9 };
    }
  }

  // Check high-severity patterns
  for (const pattern of HIGH_PATTERNS) {
    if (pattern.test(normalised)) {
      triggers.push(pattern.source);
    }
  }
  if (triggers.length > 0) {
    return { matched: true, level: CrisisLevel.High, triggers, confidence: 0.95 };
  }

  // Check medium-severity patterns
  for (const pattern of MEDIUM_PATTERNS) {
    if (pattern.test(normalised)) {
      triggers.push(pattern.source);
    }
  }
  if (triggers.length > 0) {
    return { matched: true, level: CrisisLevel.Medium, triggers, confidence: 0.8 };
  }

  return { matched: false, level: CrisisLevel.None, triggers: [], confidence: 0.9 };
}
```

Create `packages/core/src/safety/crisis-response.ts`:

```typescript
import { CrisisLevel, type CrisisResponse, type CrisisResource } from './types';

const CRISIS_RESOURCES: CrisisResource[] = [
  {
    name: 'Lifeline',
    phone: '13 11 14',
    description: '24/7 crisis support and suicide prevention',
    url: 'https://www.lifeline.org.au',
  },
  {
    name: 'Beyond Blue',
    phone: '1300 22 4636',
    description: 'Anxiety, depression and suicide prevention support',
    url: 'https://www.beyondblue.org.au',
  },
  {
    name: 'Emergency Services',
    phone: '000',
    description: 'For immediate danger to life',
  },
  {
    name: '13YARN',
    phone: '13 92 76',
    description: 'Crisis support for Aboriginal and Torres Strait Islander peoples',
    url: 'https://www.13yarn.org.au',
  },
];

export function buildCrisisResponse(level: CrisisLevel): CrisisResponse {
  if (level === CrisisLevel.High) {
    return {
      level,
      message:
        "I hear you, and I want you to know that what you're feeling matters. " +
        "You don't have to go through this alone. Please reach out to one of " +
        "these services — they're available right now and ready to help.",
      resources: CRISIS_RESOURCES,
    };
  }

  if (level === CrisisLevel.Medium) {
    return {
      level,
      message:
        "It sounds like you're going through a really difficult time. " +
        "I want to make sure you have support available. These services " +
        "are here for you whenever you need them.",
      resources: CRISIS_RESOURCES,
    };
  }

  return {
    level,
    message: '',
    resources: [],
  };
}

export { CRISIS_RESOURCES };
```

**Step 3: Run tests**

```bash
pnpm --filter @life-design/core exec vitest run src/safety/
```

**Step 4: Wire into mentor chat**

Read the mentor chat handler (likely in `apps/web/src/lib/agents/` or `apps/web/src/app/api/chat/`) and add crisis detection as a pre-processing step:

- Before sending user message to AI, run `detectCrisisIndicators(userMessage)`
- If `matched === true`, immediately show crisis response UI and log to `crisis_events` table
- The crisis response takes priority over the AI response — it is shown first, cannot be dismissed for 5 seconds
- The AI response is still generated but the crisis resources remain visible

**Step 5: Commit**

```bash
git add packages/core/src/safety/ apps/web/src/
git commit -m "feat: add clinical-grade crisis de-escalation system with audit logging"
```

---

## Task 11: Sleep Architecture Analysis Engine

**Goal:** Build a Supabase Edge Function that analyses Apple Health sleep data to compute sleep architecture metrics.

**Files:**
- Create: `supabase/functions/sleep-analysis/index.ts`
- Create: `supabase/migrations/00032_sleep_analysis.sql`

**Step 1: Create migration**

Create `supabase/migrations/00032_sleep_analysis.sql`:

```sql
CREATE TABLE IF NOT EXISTS sleep_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  total_sleep_minutes integer,
  deep_sleep_minutes integer,
  rem_sleep_minutes integer,
  light_sleep_minutes integer,
  awake_minutes integer,
  sleep_latency_minutes integer,
  sleep_efficiency numeric(5,2), -- percentage
  wake_after_sleep_onset integer, -- WASO in minutes
  sleep_quality_score numeric(3,1), -- 1-5 computed score
  raw_data jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_sleep_analysis_user_date
  ON sleep_analysis(user_id, date DESC);

ALTER TABLE sleep_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sleep analysis"
  ON sleep_analysis FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role inserts sleep analysis"
  ON sleep_analysis FOR INSERT WITH CHECK (true);
```

**Step 2: Create edge function**

Create `supabase/functions/sleep-analysis/index.ts`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface SleepSample {
  startDate: string;
  endDate: string;
  value: string; // 'InBed', 'Asleep', 'Deep', 'REM', 'Core', 'Awake'
}

interface SleepMetrics {
  totalSleepMinutes: number;
  deepSleepMinutes: number;
  remSleepMinutes: number;
  lightSleepMinutes: number;
  awakeMinutes: number;
  sleepLatencyMinutes: number;
  sleepEfficiency: number;
  wakeAfterSleepOnset: number;
  sleepQualityScore: number;
}

function computeSleepMetrics(samples: SleepSample[]): SleepMetrics {
  let deep = 0, rem = 0, light = 0, awake = 0, inBed = 0;

  for (const s of samples) {
    const dur = (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 60000;
    switch (s.value) {
      case 'Deep': deep += dur; break;
      case 'REM': rem += dur; break;
      case 'Core':
      case 'Asleep': light += dur; break;
      case 'Awake': awake += dur; break;
      case 'InBed': inBed += dur; break;
    }
  }

  const totalSleep = deep + rem + light;
  const totalInBed = inBed > 0 ? inBed : totalSleep + awake;
  const efficiency = totalInBed > 0 ? (totalSleep / totalInBed) * 100 : 0;

  // Sleep latency = time in bed before first sleep (simplified)
  const latency = Math.max(0, totalInBed - totalSleep - awake);

  // Quality score (1-5): weighted combination
  const durationScore = Math.min(totalSleep / 480, 1); // 8h = perfect
  const efficiencyScore = Math.min(efficiency / 85, 1); // 85%+ = perfect
  const deepScore = Math.min(deep / (totalSleep * 0.2), 1); // 20% deep = good
  const remScore = Math.min(rem / (totalSleep * 0.25), 1); // 25% REM = good

  const quality = 1 + 4 * (
    durationScore * 0.3 +
    efficiencyScore * 0.3 +
    deepScore * 0.2 +
    remScore * 0.2
  );

  return {
    totalSleepMinutes: Math.round(totalSleep),
    deepSleepMinutes: Math.round(deep),
    remSleepMinutes: Math.round(rem),
    lightSleepMinutes: Math.round(light),
    awakeMinutes: Math.round(awake),
    sleepLatencyMinutes: Math.round(latency),
    sleepEfficiency: Math.round(efficiency * 100) / 100,
    wakeAfterSleepOnset: Math.round(awake),
    sleepQualityScore: Math.round(quality * 10) / 10,
  };
}

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { user_id, date, samples } = await req.json();

  if (!user_id || !date || !Array.isArray(samples)) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }

  const metrics = computeSleepMetrics(samples);

  const { error } = await supabase.from('sleep_analysis').upsert({
    user_id,
    date,
    total_sleep_minutes: metrics.totalSleepMinutes,
    deep_sleep_minutes: metrics.deepSleepMinutes,
    rem_sleep_minutes: metrics.remSleepMinutes,
    light_sleep_minutes: metrics.lightSleepMinutes,
    awake_minutes: metrics.awakeMinutes,
    sleep_latency_minutes: metrics.sleepLatencyMinutes,
    sleep_efficiency: metrics.sleepEfficiency,
    wake_after_sleep_onset: metrics.wakeAfterSleepOnset,
    sleep_quality_score: metrics.sleepQualityScore,
    raw_data: { samples },
  }, { onConflict: 'user_id,date' });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true, metrics }), { status: 200 });
});
```

**Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: add sleep architecture analysis engine (edge function + migration)"
```

---

## Task 12: Tiered Opt-In Value Exchange System

**Goal:** Implement progressive data sharing tiers so users understand what they share and what they get.

**Files:**
- Create: `supabase/migrations/00033_opt_in_tiers.sql`
- Create: `packages/core/src/privacy/opt-in-tiers.ts`
- Create: `apps/web/src/components/settings/opt-in-tier-selector.tsx`

**Step 1: Define tier types**

Create `packages/core/src/privacy/opt-in-tiers.ts`:

```typescript
export enum OptInTier {
  Basic = 'basic',       // Mood + journal only
  Enhanced = 'enhanced', // + health sensors + integrations
  Full = 'full',         // + behavioural + financial + federated
}

export interface TierBenefit {
  tier: OptInTier;
  shares: string[];
  gets: string[];
}

export const TIER_BENEFITS: TierBenefit[] = [
  {
    tier: OptInTier.Basic,
    shares: ['Daily mood check-ins', 'Journal entries'],
    gets: ['Mood trends', 'Basic insights', 'AI mentor conversations'],
  },
  {
    tier: OptInTier.Enhanced,
    shares: ['Health data (sleep, HRV, steps)', 'Calendar events', 'Music listening', 'Exercise data'],
    gets: [
      'Sleep quality analysis',
      'Exercise-mood correlations',
      'Social isolation detection',
      'Weather-mood patterns',
      'Personalised intervention timing (JITAI)',
    ],
  },
  {
    tier: OptInTier.Full,
    shares: ['Screen time patterns', 'Financial transaction patterns', 'Federated model contributions'],
    gets: [
      'N-of-1 personalised predictions',
      'Financial stress detection',
      'Digital wellness insights',
      'Population-level research contributions',
      'Clinical data export for therapists',
    ],
  },
];

export function isFeatureAvailable(userTier: OptInTier, requiredTier: OptInTier): boolean {
  const tierOrder = [OptInTier.Basic, OptInTier.Enhanced, OptInTier.Full];
  return tierOrder.indexOf(userTier) >= tierOrder.indexOf(requiredTier);
}
```

**Step 2: Create migration**

Create `supabase/migrations/00033_opt_in_tiers.sql`:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS opt_in_tier text NOT NULL DEFAULT 'basic'
  CHECK (opt_in_tier IN ('basic', 'enhanced', 'full'));
```

**Step 3: Build tier selector component**

Create `apps/web/src/components/settings/opt-in-tier-selector.tsx` — a card-based selector showing each tier's shares and benefits, with the current tier highlighted.

**Step 4: Commit**

```bash
git add packages/core/src/privacy/ supabase/migrations/ apps/web/src/components/settings/
git commit -m "feat: add tiered opt-in value exchange system"
```

---

## Task 13: Onboarding Baseline Assessment

**Goal:** Extend the onboarding profiling wizard to include PHQ-9 + GAD-7 baseline screening with informed consent.

**Files:**
- Modify: `apps/web/src/components/onboarding/profiling-wizard.tsx`
- Modify: `packages/core/src/profiling/types.ts` (add `'clinical'` to `ProfilingSection`)
- Create: `apps/web/src/components/onboarding/cards/consent-card.tsx`

**Step 1: Add clinical section to profiling types**

In `packages/core/src/profiling/types.ts`, update:

```typescript
export type ProfilingSection =
  | 'goal'
  | 'habits'
  | 'energy'
  | 'style'
  | 'wellbeing'
  | 'baseline'
  | 'personality'
  | 'drive'
  | 'satisfaction'
  | 'needs'
  | 'clinical'; // NEW: PHQ-9 + GAD-7 baseline
```

**Step 2: Create consent card**

Create `apps/web/src/components/onboarding/cards/consent-card.tsx`:

```typescript
'use client';

interface ConsentCardProps {
  onConsent: () => void;
  onSkip: () => void;
}

export function ConsentCard({ onConsent, onSkip }: ConsentCardProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-stone-800">
        Optional: Mental Health Baseline
      </h2>
      <p className="text-sm text-stone-600">
        We&apos;d like to ask you a few validated questions about your mood and
        anxiety levels. This helps us personalise your experience and track your
        progress over time.
      </p>
      <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 text-sm text-stone-600">
        <p className="font-medium text-stone-700 mb-1">What to know:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>These are standardised screening tools (PHQ-9 and GAD-7)</li>
          <li>They are not a clinical diagnosis</li>
          <li>Your responses are private and encrypted</li>
          <li>You can skip this and take them later in Settings</li>
        </ul>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onConsent}
          className="flex-1 rounded-lg bg-sage-600 text-white py-2 font-medium"
        >
          Continue
        </button>
        <button
          onClick={onSkip}
          className="flex-1 rounded-lg border border-stone-300 text-stone-600 py-2 font-medium"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
```

**Step 3: Integrate into profiling wizard**

Modify `apps/web/src/components/onboarding/profiling-wizard.tsx`:
- Add a `'clinical'` section after the existing sections
- Show consent card first
- If consent given, render `ClinicalScreeningForm` for PHQ-9, then GAD-7
- Store baseline scores alongside existing psychometric profile
- If skipped, note it in the onboarding session so we can prompt later

**Step 4: Commit**

```bash
git add apps/web/src/components/onboarding/ packages/core/src/profiling/
git commit -m "feat: add PHQ-9/GAD-7 baseline assessment to onboarding flow"
```

---

# Phase 2: Intelligent Sensing (Weeks 7–14)

---

## Task 14: JITAI Engine — Server-Side Rules

**Goal:** Create the server-side JITAI (Just-In-Time Adaptive Intervention) rule engine as a Supabase Edge Function.

**Files:**
- Create: `supabase/functions/jitai-engine/index.ts`
- Create: `supabase/migrations/00034_jitai.sql`
- Create: `packages/core/src/jitai/types.ts`
- Create: `packages/core/src/jitai/rules.ts`

**Step 1: Define JITAI types**

Create `packages/core/src/jitai/types.ts`:

```typescript
export interface JITAIContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  recentMood: number | null; // 1-5 scale
  sleepQuality: number | null; // 1-5
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | null;
  calendarDensity: 'empty' | 'light' | 'moderate' | 'packed' | null;
  lastCheckinHoursAgo: number | null;
  streakDays: number;
  hrvStressLevel: 'low' | 'moderate' | 'high' | null;
}

export interface JITAIDecision {
  shouldIntervene: boolean;
  interventionType: 'nudge' | 'checkin_prompt' | 'breathing_exercise' | 'activity_suggestion' | 'none';
  urgency: 'low' | 'medium' | 'high';
  content: {
    title: string;
    message: string;
    actionUrl?: string;
  } | null;
  reasoning: string;
}
```

**Step 2: Implement rule engine**

Create `packages/core/src/jitai/rules.ts`:

```typescript
import type { JITAIContext, JITAIDecision } from './types';

export function evaluateJITAIRules(ctx: JITAIContext): JITAIDecision {
  // Rule 1: High stress + evening = breathing exercise
  if (ctx.hrvStressLevel === 'high' && ctx.timeOfDay === 'evening') {
    return {
      shouldIntervene: true,
      interventionType: 'breathing_exercise',
      urgency: 'high',
      content: {
        title: 'Take a moment',
        message: 'Your stress levels are elevated. A 2-minute breathing exercise can help.',
        actionUrl: '/meditations',
      },
      reasoning: 'High HRV stress detected in evening — breathing exercise recommended',
    };
  }

  // Rule 2: No check-in for 24h+ and it's evening
  if (ctx.lastCheckinHoursAgo !== null && ctx.lastCheckinHoursAgo > 24 && ctx.timeOfDay === 'evening') {
    return {
      shouldIntervene: true,
      interventionType: 'checkin_prompt',
      urgency: 'medium',
      content: {
        title: 'Daily reflection',
        message: 'A quick check-in helps track your progress. Just takes a minute.',
        actionUrl: '/checkin',
      },
      reasoning: 'No check-in for 24h+ and it is evening',
    };
  }

  // Rule 3: Low mood + sedentary = activity suggestion
  if (ctx.recentMood !== null && ctx.recentMood <= 2 && ctx.activityLevel === 'sedentary') {
    return {
      shouldIntervene: true,
      interventionType: 'activity_suggestion',
      urgency: 'medium',
      content: {
        title: 'Movement helps',
        message: 'Even a short walk can shift your mood. Research shows 10 minutes makes a difference.',
      },
      reasoning: 'Low mood combined with sedentary activity level',
    };
  }

  // Rule 4: Packed calendar + no check-in = gentle nudge
  if (ctx.calendarDensity === 'packed' && ctx.lastCheckinHoursAgo !== null && ctx.lastCheckinHoursAgo > 12) {
    return {
      shouldIntervene: true,
      interventionType: 'nudge',
      urgency: 'low',
      content: {
        title: 'Busy day?',
        message: 'Even on packed days, a 30-second check-in helps you stay connected to how you feel.',
        actionUrl: '/checkin',
      },
      reasoning: 'Packed calendar with no recent check-in',
    };
  }

  return {
    shouldIntervene: false,
    interventionType: 'none',
    urgency: 'low',
    content: null,
    reasoning: 'No intervention rules matched',
  };
}
```

**Step 3: Create JITAI tests, migration, and edge function**

Write tests for `evaluateJITAIRules`, create migration for `jitai_decisions` table, and build edge function that gathers context and calls `evaluateJITAIRules`.

**Step 4: Commit**

```bash
git add packages/core/src/jitai/ supabase/
git commit -m "feat: add JITAI rule engine with server-side decision support"
```

---

## Task 15: JITAI On-Device Inference Module

**Goal:** Add JITAI decision-making to `packages/ai-local` for latency-sensitive real-time interventions.

**Files:**
- Create: `packages/ai-local/src/jitai-inference.ts`
- Create: `packages/ai-local/src/__tests__/jitai-inference.test.ts`

This module uses the same `evaluateJITAIRules` from `packages/core` but runs it client-side for instant responsiveness. Future iterations will replace rule-based with a trained ONNX model.

**Step 1:** Write tests, implement thin wrapper around `evaluateJITAIRules` that gathers device-local context (time, recent mood from IndexedDB, etc.), run tests, commit.

---

## Task 16: HRV Stress & Regulation Tracking

**Goal:** Extract HRV data from Apple Health, compute stress metrics (RMSSD, SDNN, LF/HF ratio).

**Files:**
- Modify: `packages/core/src/connectors/apple-health.ts`
- Create: `packages/core/src/health/hrv-analysis.ts`
- Create: `packages/core/src/health/__tests__/hrv-analysis.test.ts`
- Create: `supabase/migrations/00035_hrv_metrics.sql`

**Step 1:** Write tests for HRV computation (RMSSD from RR intervals, stress classification). **Step 2:** Implement `computeHRVMetrics(rrIntervals: number[]): HRVMetrics`. **Step 3:** Create migration for `hrv_metrics` table. **Step 4:** Wire into Apple Health connector. Commit.

---

## Task 17: Spotify Mood Inference Pipeline

**Goal:** Extend Spotify integration to classify mood from audio features (valence, energy, danceability).

**Files:**
- Modify: `apps/web/src/lib/integrations/spotify.ts`
- Create: `packages/core/src/integrations/spotify-mood.ts`
- Create: `packages/core/src/integrations/__tests__/spotify-mood.test.ts`
- Modify: `apps/web/src/components/checkin/spotify-reflection.tsx`

**Step 1:** Write tests for mood classification from audio features. **Step 2:** Implement `classifyMoodFromAudioFeatures(features: SpotifyAudioFeatures): MoodClassification`. **Step 3:** Extend `spotify.ts` to fetch recently played + audio features. **Step 4:** Update `spotify-reflection.tsx` to display inferred mood. Commit.

---

## Task 18: Strava Exercise-Mood Correlation Engine

**Goal:** Build lag analysis between exercise and mood changes.

**Files:**
- Create: `packages/core/src/integrations/strava-mood.ts`
- Create: `packages/core/src/integrations/__tests__/strava-mood.test.ts`
- Modify: `packages/core/src/feature-extraction.ts` (add exercise-mood lag features)

**Step 1:** Write tests for exercise-mood lag computation. **Step 2:** Implement lag analysis using existing `laggedCorrelation()` from `correlation.ts`. **Step 3:** Add exercise-mood features to feature extraction pipeline. Commit.

---

## Task 19: Calendar & Social Isolation Detection

**Goal:** Compute social density metrics from calendar data and flag isolation patterns.

**Files:**
- Create: `packages/core/src/integrations/social-density.ts`
- Create: `packages/core/src/integrations/__tests__/social-density.test.ts`
- Modify: `packages/core/src/connectors/google-calendar.ts`

**Step 1:** Write tests for social density computation. **Step 2:** Implement `computeSocialDensity(events: CalendarEvent[], windowDays: number): SocialDensityMetrics`. **Step 3:** Add isolation detection (threshold: social density drops >50% from personal baseline). Commit.

---

## Task 20: Weather & Environmental Context

**Goal:** Extend weather integration to provide contextual features for JITAI and correlations.

**Files:**
- Modify: `apps/web/src/lib/integrations/weather.ts`
- Create: `packages/core/src/integrations/weather-context.ts`
- Create: `packages/core/src/integrations/__tests__/weather-context.test.ts`

**Step 1:** Write tests for weather feature extraction (temperature, sunlight hours, barometric pressure). **Step 2:** Implement `extractWeatherFeatures(weatherData: WeatherResponse): WeatherFeatures`. **Step 3:** Add seasonal pattern detection (SAD indicators). Commit.

---

## Task 21: Adaptive EMA Question Engine

**Goal:** Replace static check-in questions with ML-driven question selection that maximises information gain.

**Files:**
- Create: `packages/core/src/ema/question-pool.ts`
- Create: `packages/core/src/ema/question-selector.ts`
- Create: `packages/core/src/ema/__tests__/question-selector.test.ts`
- Modify: `apps/web/src/components/checkin/checkin-form.tsx`

**Step 1:** Define question pool with metadata (dimension, burden score, information value). **Step 2:** Write tests for question selection algorithm. **Step 3:** Implement `selectQuestions(pool, recentHistory, maxBurden): Question[]`. **Step 4:** Wire into check-in form. Commit.

---

## Task 22: Upgrade Nudge Engine → JITAI-Integrated

**Goal:** Replace rule-based nudge scheduling with JITAI-driven intervention timing.

**Files:**
- Modify: `apps/web/src/lib/nudge/nudge-scheduler.ts`
- Modify: `supabase/functions/nudge-engine/index.ts`

**Step 1:** Update `NudgeScheduler` to accept a `JITAIDecision` and schedule based on JITAI urgency/timing. **Step 2:** Update nudge edge function to call JITAI engine before generating nudges. **Step 3:** Preserve existing nudge UI. Commit.

---

## Task 23: Upgrade Correlation Engine — Lag Analysis & Confidence

**Goal:** Extend the correlation worker with configurable lag windows (1h-72h) and confidence intervals.

**Files:**
- Modify: `supabase/functions/correlation-worker/index.ts`
- Modify: `packages/core/src/correlation.ts`
- Modify: `apps/web/src/app/(protected)/correlations/correlations-client.tsx`

The existing `laggedCorrelation()` already supports configurable `maxLag`. **Step 1:** Extend correlation worker to use wider lag windows (up to 72 data points). **Step 2:** Add confidence interval display to correlations UI. Commit.

---

## Task 24: Remove Future Self Visualization (Hard Delete)

**Files:**
- Delete: `apps/web/src/app/(protected)/future-self/` (entire directory)
- Delete: `apps/web/src/components/future-self/` (entire directory)
- Remove navigation references

**Step 1:** Delete directories. **Step 2:** Remove route and nav references. **Step 3:** Commit.

---

## Task 25: Remove LinkedIn Integration (Hard Delete)

**Files:**
- Delete: `apps/web/src/app/api/auth/linkedin/route.ts`
- Delete: `apps/web/src/app/api/integrations/linkedin/callback/route.ts`
- Modify: `packages/core/src/enums.ts` (already done if combining with Instagram removal)
- Create: `supabase/migrations/00036_remove_linkedin.sql`

**Step 1:** Delete files. **Step 2:** Remove from enums, onboarding, settings. **Step 3:** Create cleanup migration. **Step 4:** Commit.

---

# Phase 3: Personalisation Engine (Weeks 15–22)

---

## Task 26: N-of-1 Personalised Prediction Models — Training Pipeline

**Goal:** Build server-side per-user model training that produces ONNX weights for on-device inference.

**Files:**
- Create: `supabase/functions/model-trainer/index.ts`
- Create: `supabase/migrations/00037_model_artifacts.sql`
- Create: `packages/core/src/ml/model-types.ts`

**Step 1:** Define model artifact types (user_id, model_version, onnx_weights, training_metrics, feature_importance). **Step 2:** Create migration for `model_artifacts` table. **Step 3:** Build edge function that: collects user's feature history, trains lightweight model (gradient boosting via decision tree ensemble), exports to ONNX format, stores in `model_artifacts`. Commit.

---

## Task 27: N-of-1 — On-Device Inference

**Goal:** Load user's trained ONNX model into `ai-local` for real-time predictions.

**Files:**
- Modify: `packages/ai-local/src/models.ts`
- Create: `packages/ai-local/src/personal-model.ts`
- Create: `packages/ai-local/src/__tests__/personal-model.test.ts`

**Step 1:** Write tests for model loading and inference. **Step 2:** Implement `PersonalModel` class that loads ONNX weights and runs inference. **Step 3:** Wire into app's prediction display. Commit.

---

## Task 28: Explainable AI (SHAP Values)

**Goal:** Compute SHAP explanations for N-of-1 predictions and serve to the existing explainability tooltip.

**Files:**
- Create: `supabase/functions/shap-explainer/index.ts`
- Modify: `apps/web/src/components/checkin/explainability-tooltip.tsx`
- Create: `supabase/migrations/00038_shap_explanations.sql`

**Step 1:** Create migration for `shap_explanations` table. **Step 2:** Build edge function that computes SHAP values for each prediction. **Step 3:** Update explainability tooltip to fetch and display SHAP explanations in user-friendly language. Commit.

---

## Task 29: Screen Time Digital Phenotyping

**Goal:** New connector for device screen time data with behavioural pattern extraction.

**Files:**
- Create: `packages/core/src/connectors/screen-time.ts`
- Create: `packages/core/src/integrations/screen-time-features.ts`
- Create: `packages/core/src/integrations/__tests__/screen-time-features.test.ts`
- Create: `supabase/migrations/00039_screen_time.sql`

**Step 1:** Define screen time data types. **Step 2:** Write tests for feature extraction (total time, category distribution, late-night usage). **Step 3:** Implement connector and feature extraction. **Step 4:** Create migration. Commit.

---

## Task 30: Clinical Data Export for Therapist Integration

**Goal:** PDF and structured data export of clinical screening trends for sharing with therapists.

**Files:**
- Create: `apps/web/src/app/api/export/clinical/route.ts`
- Create: `apps/web/src/components/settings/clinical-export.tsx`
- Create: `supabase/migrations/00040_export_audit.sql`

**Step 1:** Create export API route that generates PDF with PHQ-9/GAD-7 trends, mood patterns, sleep quality. **Step 2:** Create UI component with privacy controls (select which data to include). **Step 3:** Add audit logging for all exports. **Step 4:** Add shareable link with expiry. Commit.

---

## Task 31: Music-Aware CBT Mood Regulation

**Goal:** Combine Spotify mood state with CBT technique recommendations.

**Files:**
- Create: `packages/core/src/cbt/technique-library.ts`
- Create: `packages/core/src/cbt/mood-technique-matcher.ts`
- Create: `packages/core/src/cbt/__tests__/mood-technique-matcher.test.ts`
- Create: `apps/web/src/components/checkin/cbt-suggestion.tsx`

**Step 1:** Define CBT technique library (cognitive restructuring, behavioural activation, mindfulness). **Step 2:** Write tests for mood-technique matching. **Step 3:** Implement matcher that recommends techniques based on Spotify mood state. **Step 4:** Build suggestion component. Commit.

---

## Task 32: Journal Linguistic Biomarker Detection

**Goal:** Add NLP analysis to journal entries to detect cognitive distortions and track linguistic health markers.

**Files:**
- Create: `packages/core/src/nlp/linguistic-biomarkers.ts`
- Create: `packages/core/src/nlp/__tests__/linguistic-biomarkers.test.ts`
- Modify: `apps/web/src/app/(protected)/journal/journal-client.tsx`
- Create: `supabase/migrations/00041_journal_analysis.sql`

**Step 1:** Write tests for cognitive distortion detection (all-or-nothing: "always", "never", "every time"; catastrophising: "worst", "terrible", "ruined"; personalisation: "my fault", "because of me"). **Step 2:** Implement `detectLinguisticBiomarkers(text: string): BiomarkerResult`. **Step 3:** Create migration for `journal_analysis` table. **Step 4:** Wire into journal with gentle, educational framing. Commit.

---

## Task 33: Open Banking Financial Stress Detection

**Goal:** Extend banking integration with transaction pattern analysis for financial stress detection.

**Files:**
- Modify: `apps/web/src/lib/integrations/banking.ts`
- Create: `packages/core/src/integrations/financial-stress.ts`
- Create: `packages/core/src/integrations/__tests__/financial-stress.test.ts`

**Step 1:** Write tests for financial stress index computation. **Step 2:** Implement `computeFinancialStressIndex(transactions: Transaction[], baseline: SpendingBaseline): FinancialStressResult`. **Step 3:** Wire into correlation engine as a feature source. Commit.

---

# Phase 4: Scale & Privacy (Weeks 23–30)

---

## Task 34: Federated Learning — Local Training Module

**Goal:** Enable on-device model training that produces gradients for federated aggregation.

**Files:**
- Create: `packages/ai-local/src/federated/local-trainer.ts`
- Create: `packages/ai-local/src/federated/gradient-encoder.ts`
- Create: `packages/ai-local/src/federated/__tests__/local-trainer.test.ts`

**Step 1:** Write tests for local gradient computation. **Step 2:** Implement `LocalTrainer` class that trains on user data and exports encrypted gradients. **Step 3:** Implement `GradientEncoder` that adds differential privacy noise (ε=1.0). Commit.

---

## Task 35: Federated Learning — Coordination Server

**Goal:** Build server-side aggregation that combines encrypted gradients without seeing individual data.

**Files:**
- Create: `supabase/functions/federated-coordinator/index.ts`
- Create: `supabase/migrations/00042_federated_learning.sql`
- Create: `packages/core/src/federated/aggregation.ts`
- Create: `packages/core/src/federated/__tests__/aggregation.test.ts`

**Step 1:** Write tests for secure aggregation (verify noise injection, verify aggregate is computed without access to individual gradients). **Step 2:** Create migration for `federated_rounds`, `gradient_submissions` tables. **Step 3:** Implement aggregation function. **Step 4:** Build edge function. Commit.

---

## Task 36: Federated Learning — Population Insights Dashboard

**Goal:** Dashboard consuming federated aggregates to show population-level insights.

**Files:**
- Create: `apps/web/src/app/(protected)/insights/population-insights.tsx`
- Modify: `apps/web/src/app/(protected)/insights/insights-client.tsx`

**Step 1:** Build population insights component showing anonymised aggregate patterns. **Step 2:** Add opt-in gate (only visible to users at Full tier). Commit.

---

## Task 37: Documentation Updates

**Goal:** Update all project documentation to reflect the redesign.

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/DATA_MODEL.md`
- Modify: `docs/ML_AND_ANALYSIS_EXPLAINER.md`
- Create: `docs/CLINICAL_SAFETY.md`

**Step 1:** Update `ARCHITECTURE.md` with new system components (JITAI, federated, clinical). **Step 2:** Update `DATA_MODEL.md` with new tables. **Step 3:** Update ML explainer with N-of-1, SHAP, federated. **Step 4:** Create `CLINICAL_SAFETY.md` documenting crisis de-escalation protocols, PHQ-9 item 9 handling, audit logging. Commit.

---

## Task 38: End-to-End Test Suite for Critical Paths

**Goal:** Playwright E2E tests for safety-critical flows.

**Files:**
- Create: `apps/web/e2e/crisis-deescalation.spec.ts`
- Create: `apps/web/e2e/clinical-screening.spec.ts`
- Create: `apps/web/e2e/clinical-export.spec.ts`

**Step 1:** Write E2E test: user sends crisis message in mentor chat → crisis resources are displayed → event is logged. **Step 2:** Write E2E test: user completes PHQ-9 in onboarding → score is calculated → result is stored. **Step 3:** Write E2E test: user exports clinical data → PDF is generated → audit log created. Commit.

---

# Summary

| Phase | Tasks | Weeks | Key Deliverables |
|-------|-------|-------|------------------|
| 1 | 1–13 | 1–6 | Clinical instruments, removals, crisis safety, 5-point scale, onboarding |
| 2 | 14–25 | 7–14 | JITAI engine, HRV/Spotify/Strava/Calendar sensing, adaptive EMA, removals |
| 3 | 26–33 | 15–22 | N-of-1 models, SHAP, screen time, clinical export, CBT, NLP, financial |
| 4 | 34–38 | 23–30 | Federated learning, documentation, E2E testing |

**Total: 38 tasks across 4 phases.**
