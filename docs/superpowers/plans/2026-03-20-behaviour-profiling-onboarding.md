# Behaviour-First Profiling Onboarding — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 5-step localStorage onboarding wizard with an 18-question behaviour-first profiling system backed by Supabase, producing a normalised user profile with derived risk/discipline scores and a template + LLM-enriched summary.

**Architecture:** Phase 1 only (of 3). New Supabase tables store onboarding sessions and user profiles. Pure normalisation/scoring functions live in `packages/core/src/profiling/`. Four API routes handle onboarding lifecycle (start, answer, status, complete). A new `ProfilingWizard` replaces `OnboardingWizard` with 4 themed question sections, mentor intro, and profile summary. Old onboarding files are removed. Middleware switches from cookie-based to Supabase profile-based onboarding detection.

**Tech Stack:** Next.js 15 / React 19, TypeScript, Supabase (auth + DB + RLS), Vitest + React Testing Library, `@life-design/core` profiling module, TailwindCSS.

**Spec:** `docs/superpowers/specs/2026-03-20-behaviour-profiling-onboarding-design.md`

---

## Existing Files Reference

Read these to understand current state (all paths relative to monorepo root):

- `apps/web/src/components/onboarding/flow-state.tsx` — Current `FlowStateProvider` with 5 steps, localStorage persistence
- `apps/web/src/components/onboarding/onboarding-wizard.tsx` — Current wizard shell
- `apps/web/src/app/(protected)/onboarding/page.tsx` — Renders `FlowStateProvider` + `OnboardingGate` + `OnboardingWizard`
- `apps/web/src/lib/guest-context.tsx` — `GuestProvider` with `onboarded` boolean, `GUEST_ONBOARDED_COOKIE`
- `apps/web/src/middleware.ts` — Checks `GUEST_ONBOARDED_COOKIE` for protected routes
- `apps/web/src/lib/onboarding-session.ts` — localStorage session management
- `apps/web/src/lib/onboarding-checkpoint.ts` — localStorage checkpoint management
- `apps/web/src/lib/supabase/server.ts` — Server-side Supabase client factory (`createClient()`)
- `apps/web/src/lib/supabase/client.ts` — Browser-side Supabase client factory
- `supabase/migrations/` — Latest is `00017_tts_rate_limits.sql` (canonical migration directory; `life_design/supabase/migrations/` is stale/duplicate)
- `packages/core/src/enums.ts` — `Dimension`, `MentorType`, etc.
- `packages/core/src/scoring.ts` — `computeWeightedScore`, `computeMovingAverage`, etc.

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| **Chunk 1: Core Types & Functions** | | |
| Create | `packages/core/src/profiling/types.ts` | All profiling type definitions |
| Create | `packages/core/src/profiling/constants.ts` | Scoring weights, normalisation maps |
| Create | `packages/core/src/profiling/normalisation.ts` | Raw answer → 0.0–1.0 normalisation |
| Create | `packages/core/src/profiling/scoring.ts` | Derived scores (friction, discipline, dropout risk, etc.) |
| Create | `packages/core/src/profiling/index.ts` | Barrel re-export |
| Create | `packages/core/src/profiling/__tests__/normalisation.test.ts` | Normalisation unit tests |
| Create | `packages/core/src/profiling/__tests__/scoring.test.ts` | Scoring unit tests |
| Modify | `packages/core/src/index.ts` | Re-export profiling module |
| **Chunk 2: Question Schema & Summary Templates** | | |
| Create | `apps/web/src/lib/profiling/question-schema.ts` | 18 canonical question definitions |
| Create | `apps/web/src/lib/profiling/summary-templates.ts` | Deterministic summary generation |
| Create | `apps/web/src/lib/profiling/types.ts` | App-level profiling types (extends core) |
| Create | `apps/web/src/lib/profiling/__tests__/question-schema.test.ts` | Schema validation tests |
| Create | `apps/web/src/lib/profiling/__tests__/summary-templates.test.ts` | Summary template tests |
| **Chunk 3: Supabase Migration** | | |
| Create | `supabase/migrations/00018_profiling_onboarding.sql` | New tables + RLS + onboarding_status |
| **Chunk 4: API Routes** | | |
| Create | `apps/web/src/app/api/onboarding/start/route.ts` | POST — create onboarding session |
| Create | `apps/web/src/app/api/onboarding/answer/route.ts` | PATCH — save individual answer |
| Create | `apps/web/src/app/api/onboarding/status/route.ts` | GET — resume state |
| Create | `apps/web/src/app/api/onboarding/complete/route.ts` | POST — finalise, normalise, score, create profile |
| Create | `apps/web/src/app/api/profile/route.ts` | GET — fetch user profile |
| **Chunk 5: Frontend — Question Renderers** | | |
| Create | `apps/web/src/components/onboarding/question-types/scale-question.tsx` | 1–10 tappable circles |
| Create | `apps/web/src/components/onboarding/question-types/single-select.tsx` | Radio-style option cards |
| Create | `apps/web/src/components/onboarding/question-types/multi-select.tsx` | Checkbox-style (max N) |
| Create | `apps/web/src/components/onboarding/question-renderer.tsx` | Dispatches to correct type |
| **Chunk 6: Frontend — Wizard Shell** | | |
| Create | `apps/web/src/components/onboarding/progress-bar.tsx` | Section-grouped progress (replaces dots) |
| Create | `apps/web/src/components/onboarding/section-header.tsx` | Section intro screen |
| Create | `apps/web/src/components/onboarding/mentor-intro.tsx` | Meet all 3 mentors |
| Create | `apps/web/src/components/onboarding/profile-summary.tsx` | Template + LLM summary |
| Create | `apps/web/src/components/onboarding/profiling-wizard.tsx` | Main wizard orchestrator |
| **Chunk 7: Wire Page & Auth** | | |
| Modify | `apps/web/src/app/(protected)/onboarding/page.tsx` | Rewrite for ProfilingWizard |
| Modify | `apps/web/src/middleware.ts` | Switch from cookie to Supabase profile check |
| Modify | `apps/web/src/lib/guest-context.tsx` | Remove onboarding localStorage keys |
| **Chunk 8: Old File Removal & Tests** | | |
| Delete | `apps/web/src/components/onboarding/flow-state.tsx` | Old state provider |
| Delete | `apps/web/src/components/onboarding/onboarding-wizard.tsx` | Old wizard |
| Delete | `apps/web/src/components/onboarding/progress-dots.tsx` | Old dots |
| Delete | `apps/web/src/components/onboarding/glass-container.tsx` | Old glass container |
| Delete | `apps/web/src/components/onboarding/steps/` | All 5 old step files |
| Delete | `apps/web/src/components/onboarding/hooks/use-onboarding-conversation.ts` | Old conversation hook |
| Delete | `apps/web/src/components/onboarding/__tests__/onboarding-wizard.test.tsx` | Old tests |
| Delete | `apps/web/src/lib/onboarding-session.ts` | Old localStorage session |
| Delete | `apps/web/src/lib/onboarding-checkpoint.ts` | Old localStorage checkpoint |
| Create | `apps/web/src/components/onboarding/__tests__/profiling-wizard.test.tsx` | New wizard tests |

---

## Chunk 1: Core Profiling Types & Functions

### Task 1: Create profiling types

**Files:**
- Create: `packages/core/src/profiling/types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// packages/core/src/profiling/types.ts

/** Sections in the onboarding questionnaire */
export type ProfilingSection = 'goal' | 'habits' | 'energy' | 'style';

/** Question input types */
export type QuestionType = 'single_select' | 'multi_select' | 'scale';

/** A single question definition */
export interface QuestionDefinition {
  id: string;
  section: ProfilingSection;
  type: QuestionType;
  question: string;
  options?: { value: string; label: string }[];
  scaleMin?: number;
  scaleMax?: number;
  maxSelections?: number;
}

/** Raw answers as stored in onboarding_sessions.raw_answers */
export type RawAnswers = Record<string, string | string[] | number>;

/** Normalised profile — all values 0.0–1.0 */
export interface NormalisedProfile {
  goal_domain: string;
  goal_importance: number;
  goal_urgency: number;
  execution_consistency: number;
  structure_preference: number;
  routine_stability: number;
  chronotype: string;
  primary_failure_modes: string[];
  recovery_resilience: number;
  energy_level: number;
  stress_load: number;
  life_load: number;
  motivation_type: string;
  action_orientation: number;
  delay_discounting_score: number;
  self_efficacy: number;
  planning_style: string;
  social_recharge_style: string;
}

/** Derived composite scores */
export interface DerivedScores {
  friction_index: number;
  discipline_index: number;
  structure_need: number;
  dropout_risk_initial: number;
  goal_success_prior: number;
}

/** Template-based profile summary */
export interface ProfileSummaryTemplate {
  strength: string;
  friction: string;
  strategy: string;
  this_week: string;
}

/** Full user profile (matches user_profiles table) */
export interface UserProfile extends NormalisedProfile, DerivedScores {
  id: string;
  user_id: string;
  profile_version: number;
  intervention_preferences: Record<string, unknown>;
  profile_confidence: number;
  source_mix: { onboarding: number; behaviour: number };
  summary_template: ProfileSummaryTemplate | null;
  summary_llm: string | null;
  created_at: string;
  updated_at: string;
}

/** Onboarding session status */
export type OnboardingSessionStatus = 'in_progress' | 'completed' | 'abandoned';

/** Onboarding session (matches onboarding_sessions table) */
export interface OnboardingSession {
  id: string;
  user_id: string;
  status: OnboardingSessionStatus;
  current_section: ProfilingSection | 'mentors' | 'summary';
  current_step: number;
  version: number;
  raw_answers: RawAnswers;
  normalized_answers: Partial<NormalisedProfile>;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/profiling/types.ts
git commit -m "feat: add profiling types for behaviour-first onboarding"
```

---

### Task 2: Create profiling constants

**Files:**
- Create: `packages/core/src/profiling/constants.ts`

- [ ] **Step 1: Create constants file**

All normalisation maps and scoring weights. No magic numbers anywhere else.

```typescript
// packages/core/src/profiling/constants.ts

/** Normalisation maps for ordered categorical answers → 0.0–1.0 */
export const NORMALISATION_MAPS = {
  goal_urgency: {
    not_urgent: 0.15,
    somewhat_urgent: 0.45,
    urgent: 0.75,
    critical: 1.0,
  },
  execution_consistency: {
    almost_always: 1.0,
    often: 0.75,
    sometimes: 0.45,
    rarely: 0.15,
  },
  structure_preference: {
    detailed_schedule: 1.0,
    rough_plan: 0.55,
    no_plan: 0.15,
  },
  routine_stability: {
    very_consistent: 1.0,
    mostly_consistent: 0.7,
    irregular: 0.35,
    completely_unpredictable: 0.1,
  },
  recovery_resilience: {
    immediately: 1.0,
    struggle_recover: 0.5,
    fall_off: 0.15,
  },
  life_load: {
    '1_2': 0.15,
    '3_4': 0.45,
    '5_6': 0.75,
    '7_plus': 1.0,
  },
  action_orientation: {
    act_quickly: 1.0,
    think_carefully: 0.3,
  },
  delay_discounting: {
    '100_today': 0.2,
    '150_in_1_month': 0.8,
  },
  planning_style: {
    structure: 1.0,
    flexibility: 0.25,
  },
  social_recharge: {
    alone: 0.3,
    others: 0.8,
  },
} as const;

/** Dropout risk weights (sum = 1.0) */
export const DROPOUT_RISK_WEIGHTS = {
  execution_consistency: 0.24,
  stress_load: 0.18,
  life_load: 0.14,
  recovery_resilience: 0.12,
  self_efficacy: 0.12,
  energy_level: 0.10,
  routine_stability: 0.10,
} as const;

/** Goal success prior weights (sum = 1.0) */
export const GOAL_SUCCESS_WEIGHTS = {
  execution_consistency: 0.25,
  self_efficacy: 0.20,
  energy_level: 0.15,
  routine_stability: 0.15,
  recovery_resilience: 0.10,
  goal_importance: 0.10,
  delay_discounting_score: 0.05,
} as const;

/** Structure need weights (sum = 1.0) */
export const STRUCTURE_NEED_WEIGHTS = {
  stress_load: 0.3,
  routine_stability_inverse: 0.4,
  structure_preference: 0.3,
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/profiling/constants.ts
git commit -m "feat: add profiling scoring weights and normalisation maps"
```

---

### Task 3: Create normalisation functions with tests

**Files:**
- Create: `packages/core/src/profiling/normalisation.ts`
- Create: `packages/core/src/profiling/__tests__/normalisation.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/core/src/profiling/__tests__/normalisation.test.ts
import { describe, it, expect } from 'vitest';
import { normaliseLikert, normaliseCategory, normaliseRawAnswers } from '../normalisation';
import type { RawAnswers } from '../types';

describe('normaliseLikert', () => {
  it('maps 1 to 0.0', () => {
    expect(normaliseLikert(1)).toBeCloseTo(0.0);
  });

  it('maps 10 to 1.0', () => {
    expect(normaliseLikert(10)).toBeCloseTo(1.0);
  });

  it('maps 5 to ~0.444', () => {
    expect(normaliseLikert(5)).toBeCloseTo(4 / 9);
  });

  it('clamps below 1', () => {
    expect(normaliseLikert(0)).toBeCloseTo(0.0);
  });

  it('clamps above 10', () => {
    expect(normaliseLikert(15)).toBeCloseTo(1.0);
  });
});

describe('normaliseCategory', () => {
  it('returns mapped value for known category', () => {
    expect(normaliseCategory('goal_urgency', 'critical')).toBe(1.0);
  });

  it('returns 0.5 for unknown category value', () => {
    expect(normaliseCategory('goal_urgency', 'nonexistent')).toBe(0.5);
  });

  it('returns 0.5 for unknown map key', () => {
    expect(normaliseCategory('nonexistent_map', 'value')).toBe(0.5);
  });
});

describe('normaliseRawAnswers', () => {
  it('normalises a complete answer set', () => {
    const raw: RawAnswers = {
      goal_domain: 'health_fitness',
      goal_importance: 8,
      goal_urgency: 'urgent',
      execution_consistency: 'often',
      structure_preference: 'rough_plan',
      routine_stability: 'mostly_consistent',
      chronotype: 'early_morning',
      primary_failure_modes: ['low_energy', 'distractions'],
      recovery_resilience: 'struggle_recover',
      energy_level: 6,
      stress_load: 7,
      life_load: '3_4',
      motivation_type: 'progress',
      action_orientation: 'act_quickly',
      delay_discounting_choice: '150_in_1_month',
      self_efficacy: 7,
      planning_style: 'structure',
      social_recharge_style: 'alone',
    };

    const result = normaliseRawAnswers(raw);
    expect(result.goal_importance).toBeCloseTo(7 / 9);
    expect(result.goal_urgency).toBe(0.75);
    expect(result.execution_consistency).toBe(0.75);
    expect(result.delay_discounting_score).toBe(0.8);
    expect(result.primary_failure_modes).toEqual(['low_energy', 'distractions']);
    expect(result.chronotype).toBe('early_morning');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/core && pnpm vitest run src/profiling/__tests__/normalisation.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement normalisation functions**

```typescript
// packages/core/src/profiling/normalisation.ts
import { NORMALISATION_MAPS } from './constants';
import type { NormalisedProfile, RawAnswers } from './types';

/** Normalise a 1–10 Likert scale value to 0.0–1.0 */
export function normaliseLikert(value: number): number {
  return (Math.min(Math.max(value, 1), 10) - 1) / 9;
}

/** Normalise a categorical answer using predefined maps. Returns 0.5 for unknowns. */
export function normaliseCategory(mapKey: string, value: string): number {
  const map = (NORMALISATION_MAPS as Record<string, Record<string, number>>)[mapKey];
  if (!map) return 0.5;
  return map[value] ?? 0.5;
}

/** Normalise a complete raw answer set into a NormalisedProfile */
export function normaliseRawAnswers(raw: RawAnswers): NormalisedProfile {
  return {
    goal_domain: String(raw.goal_domain ?? ''),
    goal_importance: normaliseLikert(Number(raw.goal_importance ?? 5)),
    goal_urgency: normaliseCategory('goal_urgency', String(raw.goal_urgency ?? '')),
    execution_consistency: normaliseCategory('execution_consistency', String(raw.execution_consistency ?? '')),
    structure_preference: normaliseCategory('structure_preference', String(raw.structure_preference ?? '')),
    routine_stability: normaliseCategory('routine_stability', String(raw.routine_stability ?? '')),
    chronotype: String(raw.chronotype ?? ''),
    primary_failure_modes: Array.isArray(raw.primary_failure_modes) ? raw.primary_failure_modes : [],
    recovery_resilience: normaliseCategory('recovery_resilience', String(raw.recovery_resilience ?? '')),
    energy_level: normaliseLikert(Number(raw.energy_level ?? 5)),
    stress_load: normaliseLikert(Number(raw.stress_load ?? 5)),
    life_load: normaliseCategory('life_load', String(raw.life_load ?? '')),
    motivation_type: String(raw.motivation_type ?? ''),
    action_orientation: normaliseCategory('action_orientation', String(raw.action_orientation ?? '')),
    delay_discounting_score: normaliseCategory('delay_discounting', String(raw.delay_discounting_choice ?? '')),
    self_efficacy: normaliseLikert(Number(raw.self_efficacy ?? 5)),
    planning_style: String(raw.planning_style ?? ''),
    social_recharge_style: String(raw.social_recharge_style ?? ''),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/core && pnpm vitest run src/profiling/__tests__/normalisation.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/profiling/normalisation.ts packages/core/src/profiling/__tests__/normalisation.test.ts
git commit -m "feat: add normalisation functions for profiling answers"
```

---

### Task 4: Create scoring functions with tests

**Files:**
- Create: `packages/core/src/profiling/scoring.ts`
- Create: `packages/core/src/profiling/__tests__/scoring.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/core/src/profiling/__tests__/scoring.test.ts
import { describe, it, expect } from 'vitest';
import {
  frictionIndex,
  disciplineIndex,
  structureNeed,
  dropoutRiskInitial,
  goalSuccessPrior,
  computeAllDerivedScores,
} from '../scoring';
import type { NormalisedProfile } from '../types';

const mockProfile: NormalisedProfile = {
  goal_domain: 'health_fitness',
  goal_importance: 0.78,
  goal_urgency: 0.75,
  execution_consistency: 0.75,
  structure_preference: 0.55,
  routine_stability: 0.7,
  chronotype: 'early_morning',
  primary_failure_modes: ['low_energy'],
  recovery_resilience: 0.5,
  energy_level: 0.56,
  stress_load: 0.67,
  life_load: 0.45,
  motivation_type: 'progress',
  action_orientation: 1.0,
  delay_discounting_score: 0.8,
  self_efficacy: 0.67,
  planning_style: 'structure',
  social_recharge_style: 'alone',
};

describe('frictionIndex', () => {
  it('returns value between 0 and 1', () => {
    const result = frictionIndex(mockProfile.stress_load, mockProfile.life_load, mockProfile.energy_level);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('high stress + high load + low energy = high friction', () => {
    const result = frictionIndex(0.9, 0.9, 0.1);
    expect(result).toBeGreaterThan(0.7);
  });

  it('low stress + low load + high energy = low friction', () => {
    const result = frictionIndex(0.1, 0.1, 0.9);
    expect(result).toBeLessThan(0.15);
  });
});

describe('disciplineIndex', () => {
  it('returns value between 0 and 1', () => {
    const result = disciplineIndex(mockProfile.execution_consistency, mockProfile.routine_stability, mockProfile.self_efficacy);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

describe('dropoutRiskInitial', () => {
  it('returns value between 0 and 1', () => {
    const result = dropoutRiskInitial(mockProfile);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('low consistency + high stress = higher risk', () => {
    const riskyProfile = { ...mockProfile, execution_consistency: 0.15, stress_load: 0.9, self_efficacy: 0.15 };
    const result = dropoutRiskInitial(riskyProfile);
    expect(result).toBeGreaterThan(0.5);
  });
});

describe('goalSuccessPrior', () => {
  it('returns value between 0 and 1', () => {
    const result = goalSuccessPrior(mockProfile);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

describe('computeAllDerivedScores', () => {
  it('returns all 5 derived scores', () => {
    const scores = computeAllDerivedScores(mockProfile);
    expect(scores).toHaveProperty('friction_index');
    expect(scores).toHaveProperty('discipline_index');
    expect(scores).toHaveProperty('structure_need');
    expect(scores).toHaveProperty('dropout_risk_initial');
    expect(scores).toHaveProperty('goal_success_prior');
    Object.values(scores).forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/core && pnpm vitest run src/profiling/__tests__/scoring.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement scoring functions**

```typescript
// packages/core/src/profiling/scoring.ts
import { DROPOUT_RISK_WEIGHTS, GOAL_SUCCESS_WEIGHTS } from './constants';
import type { NormalisedProfile, DerivedScores } from './types';

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function mean(...values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function weighted(pairs: [number, number][]): number {
  return pairs.reduce((sum, [value, weight]) => sum + value * weight, 0);
}

export function frictionIndex(stressLoad: number, lifeLoad: number, energyLevel: number): number {
  return clamp01(mean(stressLoad, lifeLoad, 1 - energyLevel));
}

export function disciplineIndex(executionConsistency: number, routineStability: number, selfEfficacy: number): number {
  return clamp01(mean(executionConsistency, routineStability, selfEfficacy));
}

export function structureNeed(stressLoad: number, routineStability: number, structurePreference: number): number {
  return clamp01(weighted([
    [stressLoad, 0.3],
    [1 - routineStability, 0.4],
    [structurePreference, 0.3],
  ]));
}

export function dropoutRiskInitial(profile: NormalisedProfile): number {
  const w = DROPOUT_RISK_WEIGHTS;
  return clamp01(
    w.execution_consistency * (1 - profile.execution_consistency) +
    w.stress_load * profile.stress_load +
    w.life_load * profile.life_load +
    w.recovery_resilience * (1 - profile.recovery_resilience) +
    w.self_efficacy * (1 - profile.self_efficacy) +
    w.energy_level * (1 - profile.energy_level) +
    w.routine_stability * (1 - profile.routine_stability)
  );
}

export function goalSuccessPrior(profile: NormalisedProfile): number {
  const w = GOAL_SUCCESS_WEIGHTS;
  return clamp01(
    w.execution_consistency * profile.execution_consistency +
    w.self_efficacy * profile.self_efficacy +
    w.energy_level * profile.energy_level +
    w.routine_stability * profile.routine_stability +
    w.recovery_resilience * profile.recovery_resilience +
    w.goal_importance * profile.goal_importance +
    w.delay_discounting_score * profile.delay_discounting_score
  );
}

export function computeAllDerivedScores(profile: NormalisedProfile): DerivedScores {
  return {
    friction_index: frictionIndex(profile.stress_load, profile.life_load, profile.energy_level),
    discipline_index: disciplineIndex(profile.execution_consistency, profile.routine_stability, profile.self_efficacy),
    structure_need: structureNeed(profile.stress_load, profile.routine_stability, profile.structure_preference),
    dropout_risk_initial: dropoutRiskInitial(profile),
    goal_success_prior: goalSuccessPrior(profile),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/core && pnpm vitest run src/profiling/__tests__/scoring.test.ts
```
Expected: PASS

- [ ] **Step 5: Create barrel export and update core index**

```typescript
// packages/core/src/profiling/index.ts
export * from './types';
export * from './constants';
export * from './normalisation';
export * from './scoring';
```

Add to `packages/core/src/index.ts`:
```typescript
export * from './profiling';
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/profiling/ packages/core/src/index.ts
git commit -m "feat: add profiling scoring functions with derived scores"
```

---

## Chunk 2: Question Schema & Summary Templates

### Task 5: Create question schema

**Files:**
- Create: `apps/web/src/lib/profiling/question-schema.ts`
- Create: `apps/web/src/lib/profiling/types.ts`
- Create: `apps/web/src/lib/profiling/__tests__/question-schema.test.ts`

- [ ] **Step 1: Create app-level profiling types**

```typescript
// apps/web/src/lib/profiling/types.ts
import type { ProfilingSection, QuestionDefinition, RawAnswers, OnboardingSession } from '@life-design/core';

export type { ProfilingSection, QuestionDefinition, RawAnswers, OnboardingSession };

/** Wizard navigation position */
export interface WizardPosition {
  section: ProfilingSection | 'mentors' | 'summary';
  questionIndex: number;
}

/** Section metadata for the progress bar */
export interface SectionMeta {
  id: ProfilingSection;
  label: string;
  questionCount: number;
}
```

- [ ] **Step 2: Write the failing question schema test**

```typescript
// apps/web/src/lib/profiling/__tests__/question-schema.test.ts
import { describe, it, expect } from 'vitest';
import { QUESTIONS, SECTIONS, getQuestionsForSection, getTotalQuestionCount } from '../question-schema';

describe('question-schema', () => {
  it('has exactly 18 questions', () => {
    expect(QUESTIONS).toHaveLength(18);
  });

  it('has 4 sections', () => {
    expect(SECTIONS).toHaveLength(4);
  });

  it('section question counts match', () => {
    expect(getQuestionsForSection('goal')).toHaveLength(3);
    expect(getQuestionsForSection('habits')).toHaveLength(5);
    expect(getQuestionsForSection('energy')).toHaveLength(4);
    expect(getQuestionsForSection('style')).toHaveLength(6);
  });

  it('total question count is 18', () => {
    expect(getTotalQuestionCount()).toBe(18);
  });

  it('every question has required fields', () => {
    for (const q of QUESTIONS) {
      expect(q.id).toBeTruthy();
      expect(q.section).toBeTruthy();
      expect(q.type).toBeTruthy();
      expect(q.question).toBeTruthy();
      if (q.type === 'single_select' || q.type === 'multi_select') {
        expect(q.options).toBeDefined();
        expect(q.options!.length).toBeGreaterThan(1);
      }
      if (q.type === 'scale') {
        expect(q.scaleMin).toBeDefined();
        expect(q.scaleMax).toBeDefined();
      }
    }
  });

  it('multi_select questions have maxSelections', () => {
    const multiSelects = QUESTIONS.filter((q) => q.type === 'multi_select');
    for (const q of multiSelects) {
      expect(q.maxSelections).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd apps/web && pnpm vitest run src/lib/profiling/__tests__/question-schema.test.ts
```
Expected: FAIL

- [ ] **Step 4: Implement question schema**

Create `apps/web/src/lib/profiling/question-schema.ts` with all 18 questions from spec Section 5.3. Each question has `id`, `section`, `type`, `question`, `options` (for selects), `scaleMin`/`scaleMax` (for scales), `maxSelections` (for multi-select).

The SECTIONS array provides metadata:
```typescript
import type { QuestionDefinition } from '@life-design/core';
import type { SectionMeta } from './types';

export const SECTIONS: SectionMeta[] = [
  { id: 'goal', label: 'Your Goal', questionCount: 3 },
  { id: 'habits', label: 'Your Habits', questionCount: 5 },
  { id: 'energy', label: 'Your Energy', questionCount: 4 },
  { id: 'style', label: 'Your Style', questionCount: 6 },
];

export const QUESTIONS: QuestionDefinition[] = [
  // --- Section: goal (3 questions) ---
  {
    id: 'goal_domain',
    section: 'goal',
    type: 'single_select',
    question: 'What do you want to improve right now?',
    options: [
      { value: 'health_fitness', label: 'Health & fitness' },
      { value: 'energy_sleep', label: 'Energy & sleep' },
      { value: 'productivity', label: 'Productivity' },
      { value: 'learning_skills', label: 'Learning & skills' },
      { value: 'mental_wellbeing', label: 'Mental wellbeing' },
      { value: 'financial_discipline', label: 'Financial discipline' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    id: 'goal_importance',
    section: 'goal',
    type: 'scale',
    question: 'How important is this goal to you right now?',
    scaleMin: 1,
    scaleMax: 10,
  },
  {
    id: 'goal_urgency',
    section: 'goal',
    type: 'single_select',
    question: 'How urgent is this for you?',
    options: [
      { value: 'not_urgent', label: 'Not urgent' },
      { value: 'somewhat_urgent', label: 'Somewhat urgent' },
      { value: 'urgent', label: 'Urgent' },
      { value: 'critical', label: 'Critical' },
    ],
  },
  // --- Section: habits (5 questions) ---
  {
    id: 'execution_consistency',
    section: 'habits',
    type: 'single_select',
    question: 'When you plan something for the day, how often do you follow through?',
    options: [
      { value: 'almost_always', label: 'Almost always' },
      { value: 'often', label: 'Often' },
      { value: 'sometimes', label: 'Sometimes' },
      { value: 'rarely', label: 'Rarely' },
    ],
  },
  {
    id: 'structure_preference',
    section: 'habits',
    type: 'single_select',
    question: 'How do you usually organise your day?',
    options: [
      { value: 'detailed_schedule', label: 'Detailed schedule' },
      { value: 'rough_plan', label: 'Rough plan' },
      { value: 'no_plan', label: 'No plan, decide as I go' },
    ],
  },
  {
    id: 'routine_stability',
    section: 'habits',
    type: 'single_select',
    question: 'How consistent is your daily routine?',
    options: [
      { value: 'very_consistent', label: 'Very consistent' },
      { value: 'mostly_consistent', label: 'Mostly consistent' },
      { value: 'irregular', label: 'Irregular' },
      { value: 'completely_unpredictable', label: 'Completely unpredictable' },
    ],
  },
  {
    id: 'chronotype',
    section: 'habits',
    type: 'single_select',
    question: 'When are you naturally most productive?',
    options: [
      { value: 'early_morning', label: 'Early morning' },
      { value: 'late_morning', label: 'Late morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' },
      { value: 'late_night', label: 'Late night' },
    ],
  },
  {
    id: 'primary_failure_modes',
    section: 'habits',
    type: 'multi_select',
    question: 'What most often stops you from achieving goals?',
    maxSelections: 2,
    options: [
      { value: 'lack_of_time', label: 'Lack of time' },
      { value: 'low_energy', label: 'Low energy' },
      { value: 'losing_motivation', label: 'Losing motivation' },
      { value: 'distractions', label: 'Distractions' },
      { value: 'not_knowing_next', label: 'Not knowing what to do next' },
      { value: 'overcommitting', label: 'Overcommitting' },
      { value: 'stress_overwhelm', label: 'Stress / overwhelm' },
    ],
  },
  // --- Section: energy (4 questions) ---
  {
    id: 'recovery_resilience',
    section: 'energy',
    type: 'single_select',
    question: 'When you miss a day, what usually happens next?',
    options: [
      { value: 'immediately', label: 'I get back on track immediately' },
      { value: 'struggle_recover', label: 'I struggle but recover' },
      { value: 'fall_off', label: 'I often fall off completely' },
    ],
  },
  {
    id: 'energy_level',
    section: 'energy',
    type: 'scale',
    question: 'How would you rate your daily energy levels?',
    scaleMin: 1,
    scaleMax: 10,
  },
  {
    id: 'stress_load',
    section: 'energy',
    type: 'scale',
    question: 'How overwhelmed do you feel day-to-day?',
    scaleMin: 1,
    scaleMax: 10,
  },
  {
    id: 'life_load',
    section: 'energy',
    type: 'single_select',
    question: 'How many major commitments are you currently balancing?',
    options: [
      { value: '1_2', label: '1–2' },
      { value: '3_4', label: '3–4' },
      { value: '5_6', label: '5–6' },
      { value: '7_plus', label: '7+' },
    ],
  },
  // --- Section: style (6 questions) ---
  {
    id: 'motivation_type',
    section: 'style',
    type: 'single_select',
    question: 'What motivates you the most?',
    options: [
      { value: 'progress', label: 'Seeing progress' },
      { value: 'rewards', label: 'Rewards / incentives' },
      { value: 'accountability', label: 'Accountability to others' },
      { value: 'avoiding_failure', label: 'Avoiding failure' },
      { value: 'curiosity', label: 'Curiosity / interest' },
    ],
  },
  {
    id: 'action_orientation',
    section: 'style',
    type: 'single_select',
    question: 'Which feels more like you?',
    options: [
      { value: 'act_quickly', label: 'I act quickly and adjust later' },
      { value: 'think_carefully', label: 'I think carefully before acting' },
    ],
  },
  {
    id: 'delay_discounting_choice',
    section: 'style',
    type: 'single_select',
    question: 'Which would you choose?',
    options: [
      { value: '100_today', label: '$100 today' },
      { value: '150_in_1_month', label: '$150 in 1 month' },
    ],
  },
  {
    id: 'self_efficacy',
    section: 'style',
    type: 'scale',
    question: "If you set a realistic goal today, how confident are you that you'll complete it?",
    scaleMin: 1,
    scaleMax: 10,
  },
  {
    id: 'planning_style',
    section: 'style',
    type: 'single_select',
    question: 'Do you prefer:',
    options: [
      { value: 'structure', label: 'Structure and clear plans' },
      { value: 'flexibility', label: 'Flexibility and freedom' },
    ],
  },
  {
    id: 'social_recharge_style',
    section: 'style',
    type: 'single_select',
    question: 'Do you recharge more by:',
    options: [
      { value: 'alone', label: 'Time alone' },
      { value: 'others', label: 'Time with others' },
    ],
  },
];

export function getQuestionsForSection(section: string): QuestionDefinition[] {
  return QUESTIONS.filter((q) => q.section === section);
}

export function getTotalQuestionCount(): number {
  return QUESTIONS.length;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd apps/web && pnpm vitest run src/lib/profiling/__tests__/question-schema.test.ts
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/profiling/
git commit -m "feat: add canonical question schema (18 questions, 4 sections)"
```

---

### Task 6: Create summary template logic with tests

**Files:**
- Create: `apps/web/src/lib/profiling/summary-templates.ts`
- Create: `apps/web/src/lib/profiling/__tests__/summary-templates.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/web/src/lib/profiling/__tests__/summary-templates.test.ts
import { describe, it, expect } from 'vitest';
import { generateSummaryTemplate } from '../summary-templates';
import type { NormalisedProfile, DerivedScores } from '@life-design/core';

const baseProfile: NormalisedProfile = {
  goal_domain: 'health_fitness',
  goal_importance: 0.78,
  goal_urgency: 0.75,
  execution_consistency: 0.75,
  structure_preference: 0.55,
  routine_stability: 0.7,
  chronotype: 'early_morning',
  primary_failure_modes: ['low_energy'],
  recovery_resilience: 0.5,
  energy_level: 0.56,
  stress_load: 0.67,
  life_load: 0.45,
  motivation_type: 'progress',
  action_orientation: 1.0,
  delay_discounting_score: 0.8,
  self_efficacy: 0.67,
  planning_style: 'structure',
  social_recharge_style: 'alone',
};

const baseScores: DerivedScores = {
  friction_index: 0.52,
  discipline_index: 0.71,
  structure_need: 0.44,
  dropout_risk_initial: 0.35,
  goal_success_prior: 0.68,
};

describe('generateSummaryTemplate', () => {
  it('returns all 4 summary fields', () => {
    const result = generateSummaryTemplate(baseProfile, baseScores);
    expect(result.strength).toBeTruthy();
    expect(result.friction).toBeTruthy();
    expect(result.strategy).toBeTruthy();
    expect(result.this_week).toBeTruthy();
  });

  it('strength reflects high discipline', () => {
    const result = generateSummaryTemplate(baseProfile, { ...baseScores, discipline_index: 0.85 });
    expect(result.strength).toContain('follow-through');
  });

  it('friction reflects high friction index', () => {
    const result = generateSummaryTemplate(baseProfile, { ...baseScores, friction_index: 0.75 });
    expect(result.friction.length).toBeGreaterThan(10);
  });

  it('returns non-empty strings for edge-case profiles', () => {
    const lowProfile: NormalisedProfile = {
      ...baseProfile,
      execution_consistency: 0.1,
      self_efficacy: 0.1,
      energy_level: 0.1,
    };
    const lowScores: DerivedScores = {
      friction_index: 0.9,
      discipline_index: 0.1,
      structure_need: 0.9,
      dropout_risk_initial: 0.85,
      goal_success_prior: 0.15,
    };
    const result = generateSummaryTemplate(lowProfile, lowScores);
    expect(result.strength.length).toBeGreaterThan(5);
    expect(result.strategy.length).toBeGreaterThan(5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/web && pnpm vitest run src/lib/profiling/__tests__/summary-templates.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement summary template generation**

```typescript
// apps/web/src/lib/profiling/summary-templates.ts
import type { NormalisedProfile, DerivedScores, ProfileSummaryTemplate } from '@life-design/core';

export function generateSummaryTemplate(
  profile: NormalisedProfile,
  scores: DerivedScores,
): ProfileSummaryTemplate {
  return {
    strength: pickStrength(profile, scores),
    friction: pickFriction(profile, scores),
    strategy: pickStrategy(profile, scores),
    this_week: pickThisWeek(profile, scores),
  };
}

function pickStrength(profile: NormalisedProfile, scores: DerivedScores): string {
  if (scores.discipline_index > 0.7) return 'Strong follow-through when you commit';
  if (profile.goal_importance > 0.8) return 'You care deeply about meaningful goals';
  if (profile.motivation_type === 'progress') return "You're driven by visible progress";
  if (profile.motivation_type === 'curiosity') return 'Your natural curiosity keeps you exploring';
  if (profile.motivation_type === 'accountability') return 'You thrive with accountability and shared commitment';
  if (profile.self_efficacy > 0.7) return 'Strong self-belief powers your ambitions';
  if (profile.action_orientation > 0.7) return "You're a natural action-taker";
  return 'You have the awareness to reflect on what matters';
}

function pickFriction(profile: NormalisedProfile, scores: DerivedScores): string {
  if (scores.friction_index > 0.65) return 'Stress and high load erode your consistency';
  if (profile.recovery_resilience < 0.4) return 'Missing a day tends to spiral';
  if (profile.execution_consistency < 0.4) return 'Following through on plans is a challenge';
  if (profile.life_load > 0.7) return 'Too many commitments compete for your attention';
  if (profile.stress_load > 0.7) return 'Stress drains the energy you need for your goals';
  if (profile.energy_level < 0.35) return 'Low energy makes it hard to start';
  return 'Minor friction points — mostly manageable with the right structure';
}

function pickStrategy(profile: NormalisedProfile, scores: DerivedScores): string {
  if (scores.structure_need > 0.6 && profile.chronotype === 'early_morning')
    return 'Morning routines with clear structure will anchor your progress';
  if (scores.structure_need > 0.6)
    return 'You need clear daily structure — small commitments with visible checkpoints';
  if (profile.motivation_type === 'accountability')
    return 'Regular check-ins and accountability loops will keep you on track';
  if (profile.motivation_type === 'rewards')
    return 'Short reward cycles and milestone celebrations will sustain your drive';
  if (profile.delay_discounting_score < 0.5)
    return 'Quick wins and immediate feedback loops match how you stay engaged';
  if (scores.discipline_index > 0.7)
    return 'Build on your strong habits — add one new micro-habit at a time';
  return 'Start small, measure often, and adjust as you learn what works';
}

function pickThisWeek(profile: NormalisedProfile, scores: DerivedScores): string {
  if (scores.dropout_risk_initial > 0.6)
    return 'This week: one tiny daily action. Just show up — consistency beats intensity';
  if (scores.friction_index > 0.6)
    return 'This week: reduce one commitment and protect 30 minutes of focused time daily';
  if (profile.chronotype === 'early_morning')
    return 'This week: set one morning anchor habit and track it for 7 days';
  if (profile.chronotype === 'evening' || profile.chronotype === 'late_night')
    return 'This week: plan tomorrow each evening and batch your hardest task after dinner';
  if (scores.discipline_index > 0.7)
    return 'This week: pick your top goal, break it into 3 steps, and complete step 1';
  return 'This week: check in daily and notice what patterns emerge';
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/web && pnpm vitest run src/lib/profiling/__tests__/summary-templates.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/profiling/summary-templates.ts apps/web/src/lib/profiling/__tests__/summary-templates.test.ts
git commit -m "feat: add deterministic profile summary template generation"
```

---

## Chunk 3: Supabase Migration

### Task 7: Create Supabase migration

**Files:**
- Create: `supabase/migrations/00018_profiling_onboarding.sql`

**Note:** The canonical migration directory is `supabase/migrations/` (goes up to `00017`). The `life_design/supabase/migrations/` directory is a stale duplicate — do not use it.

**Note:** The spec mentions `actions.ts` server actions, but this plan uses Next.js API routes exclusively (matching the existing codebase pattern in `apps/web/src/app/api/`). Server actions are not needed since all onboarding data flows through `fetch()` calls to the API routes.

- [ ] **Step 1: Create migration file**

```sql
-- Behaviour-First Profiling Onboarding
-- Adds tables for onboarding sessions, user profiles, profile snapshots,
-- behavior events, and predictions. Adds onboarding_status to profiles.

-- ============================================================
-- Onboarding Sessions
-- ============================================================
CREATE TABLE onboarding_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'in_progress'
                    CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  current_section TEXT NOT NULL DEFAULT 'goal',
  current_step    INTEGER NOT NULL DEFAULT 0,
  version         INTEGER NOT NULL DEFAULT 1,
  raw_answers     JSONB NOT NULL DEFAULT '{}',
  normalized_answers JSONB NOT NULL DEFAULT '{}',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own onboarding sessions"
  ON onboarding_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- User Profiles (profiling data — separate from auth profiles)
-- ============================================================
CREATE TABLE user_profiles (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_version           INTEGER NOT NULL DEFAULT 1,

  -- Core profile fields (from onboarding)
  goal_domain               TEXT,
  goal_importance           REAL,
  goal_urgency              REAL,
  execution_consistency     REAL,
  structure_preference      REAL,
  routine_stability         REAL,
  chronotype                TEXT,
  primary_failure_modes     TEXT[],
  recovery_resilience       REAL,
  energy_level              REAL,
  stress_load               REAL,
  life_load                 REAL,
  motivation_type           TEXT,
  action_orientation        REAL,
  delay_discounting_score   REAL,
  self_efficacy             REAL,
  planning_style            TEXT,
  social_recharge_style     TEXT,

  -- Derived scores
  friction_index            REAL,
  discipline_index          REAL,
  structure_need            REAL,
  dropout_risk_initial      REAL,
  goal_success_prior        REAL,

  -- Intervention & confidence
  intervention_preferences  JSONB DEFAULT '{}',
  profile_confidence        REAL NOT NULL DEFAULT 1.0,
  source_mix                JSONB NOT NULL DEFAULT '{"onboarding": 1.0, "behaviour": 0.0}',

  -- Summary
  summary_template          JSONB,
  summary_llm               TEXT,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Profile Snapshots (for historical tracking)
-- ============================================================
CREATE TABLE profile_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_time   TIMESTAMPTZ NOT NULL DEFAULT now(),
  feature_vector  JSONB NOT NULL,
  source_weights  JSONB NOT NULL,
  risk_scores     JSONB NOT NULL
);

ALTER TABLE profile_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own snapshots"
  ON profile_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own snapshots"
  ON profile_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Behavior Events (Phase 2 — table created now)
-- ============================================================
CREATE TABLE behavior_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata        JSONB DEFAULT '{}'
);

CREATE INDEX idx_behavior_events_user_time
  ON behavior_events(user_id, event_timestamp DESC);

ALTER TABLE behavior_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own events"
  ON behavior_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Predictions (Phase 3 — table created now)
-- ============================================================
CREATE TABLE predictions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prediction_type       TEXT NOT NULL,
  prediction_value      REAL NOT NULL,
  prediction_confidence REAL NOT NULL DEFAULT 0.5,
  model_version         TEXT NOT NULL DEFAULT 'rules-v1',
  inputs_hash           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own predictions"
  ON predictions FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- Add onboarding_status to existing profiles table
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_status TEXT
  NOT NULL DEFAULT 'not_started'
  CHECK (onboarding_status IN ('not_started', 'completed'));

-- DEPRECATED: legacy onboarding fields (profession, interests, etc.) preserved for data continuity
-- Migrate existing onboarded users
UPDATE profiles SET onboarding_status = 'completed' WHERE onboarded = true;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/00018_profiling_onboarding.sql
git commit -m "feat: add Supabase migration for profiling onboarding tables"
```

---

## Chunk 4: API Routes

### Task 8: Create onboarding API routes

**Files:**
- Create: `apps/web/src/app/api/onboarding/start/route.ts`
- Create: `apps/web/src/app/api/onboarding/answer/route.ts`
- Create: `apps/web/src/app/api/onboarding/status/route.ts`
- Create: `apps/web/src/app/api/onboarding/complete/route.ts`

- [ ] **Step 1: Create POST /api/onboarding/start**

```typescript
// apps/web/src/app/api/onboarding/start/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check for existing session
  const { data: existing } = await supabase
    .from('onboarding_sessions')
    .select('id, status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing?.status === 'completed') {
    return NextResponse.json({ error: 'Onboarding already completed' }, { status: 409 });
  }

  if (existing) {
    // Resume existing session
    return NextResponse.json({ session_id: existing.id, resumed: true });
  }

  // Create new session
  const { data: session, error } = await supabase
    .from('onboarding_sessions')
    .insert({ user_id: user.id })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }

  return NextResponse.json({ session_id: session.id, resumed: false }, { status: 201 });
}
```

- [ ] **Step 2: Create PATCH /api/onboarding/answer**

```typescript
// apps/web/src/app/api/onboarding/answer/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { question_id, answer, current_section, current_step } = body;

  if (!question_id || answer === undefined) {
    return NextResponse.json({ error: 'Missing question_id or answer' }, { status: 400 });
  }

  // Get current session
  const { data: session, error: fetchError } = await supabase
    .from('onboarding_sessions')
    .select('id, raw_answers, status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (fetchError || !session) {
    return NextResponse.json({ error: 'No active session' }, { status: 404 });
  }

  if (session.status === 'completed') {
    return NextResponse.json({ error: 'Session already completed' }, { status: 409 });
  }

  // Merge answer into raw_answers
  const updatedAnswers = { ...session.raw_answers, [question_id]: answer };

  const { error: updateError } = await supabase
    .from('onboarding_sessions')
    .update({
      raw_answers: updatedAnswers,
      current_section: current_section ?? undefined,
      current_step: current_step ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to save answer' }, { status: 500 });
  }

  return NextResponse.json({ saved: true });
}
```

- [ ] **Step 3: Create GET /api/onboarding/status**

```typescript
// apps/web/src/app/api/onboarding/status/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: session } = await supabase
    .from('onboarding_sessions')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ status: 'not_started' });
  }

  return NextResponse.json({
    status: session.status,
    session_id: session.id,
    current_section: session.current_section,
    current_step: session.current_step,
    raw_answers: session.raw_answers,
    answered_count: Object.keys(session.raw_answers).length,
  });
}
```

- [ ] **Step 4: Create POST /api/onboarding/complete**

```typescript
// apps/web/src/app/api/onboarding/complete/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normaliseRawAnswers, computeAllDerivedScores } from '@life-design/core';
import { generateSummaryTemplate } from '@/lib/profiling/summary-templates';

export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get session
  const { data: session, error: fetchError } = await supabase
    .from('onboarding_sessions')
    .select('id, raw_answers, status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (fetchError || !session) {
    return NextResponse.json({ error: 'No active session' }, { status: 404 });
  }

  if (session.status === 'completed') {
    return NextResponse.json({ error: 'Already completed' }, { status: 409 });
  }

  // Normalise and score
  const normalised = normaliseRawAnswers(session.raw_answers);
  const derived = computeAllDerivedScores(normalised);
  const summaryTemplate = generateSummaryTemplate(normalised, derived);

  // Create user_profile
  const { error: profileError } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: user.id,
      ...normalised,
      ...derived,
      summary_template: summaryTemplate,
      source_mix: { onboarding: 1.0, behaviour: 0.0 },
      profile_confidence: 1.0,
    }, { onConflict: 'user_id' });

  if (profileError) {
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
  }

  // Mark session as completed
  await supabase
    .from('onboarding_sessions')
    .update({
      status: 'completed',
      normalized_answers: normalised,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id);

  // Update profiles.onboarding_status
  await supabase
    .from('profiles')
    .update({ onboarding_status: 'completed' })
    .eq('id', user.id);

  // Create initial snapshot
  await supabase
    .from('profile_snapshots')
    .insert({
      user_id: user.id,
      feature_vector: normalised,
      source_weights: { onboarding: 1.0, behaviour: 0.0 },
      risk_scores: { dropout_risk: derived.dropout_risk_initial, goal_success: derived.goal_success_prior },
    });

  // Record onboarding_completed event
  await supabase
    .from('behavior_events')
    .insert({
      user_id: user.id,
      event_type: 'onboarding_completed',
      metadata: { question_count: Object.keys(session.raw_answers).length },
    });

  return NextResponse.json({
    profile: { ...normalised, ...derived },
    summary: summaryTemplate,
  });
}
```

- [ ] **Step 5: Create GET /api/profile**

```typescript
// apps/web/src/app/api/profile/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: 'No profile found' }, { status: 404 });
  }

  return NextResponse.json(profile);
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd apps/web && pnpm type-check
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/api/onboarding/ apps/web/src/app/api/profile/
git commit -m "feat: add onboarding API routes (start, answer, status, complete, profile)"
```

---

## Chunk 5: Frontend — Question Renderers

### Task 9: Create question type components

**Files:**
- Create: `apps/web/src/components/onboarding/question-types/scale-question.tsx`
- Create: `apps/web/src/components/onboarding/question-types/single-select.tsx`
- Create: `apps/web/src/components/onboarding/question-types/multi-select.tsx`
- Create: `apps/web/src/components/onboarding/question-renderer.tsx`

- [ ] **Step 1: Create ScaleQuestion**

1–10 tappable numbered circles. Props: `min`, `max`, `value`, `onChange`. Selected circle gets accent highlight.

- [ ] **Step 2: Create SingleSelect**

Vertical stack of option cards. Props: `options`, `value`, `onChange`. Selected card has border accent + check icon.

- [ ] **Step 3: Create MultiSelect**

Same as SingleSelect but toggle behaviour with max selection constraint. Props: `options`, `value` (string[]), `onChange`, `maxSelections`.

- [ ] **Step 4: Create QuestionRenderer**

Dispatches to correct question type component based on `QuestionDefinition.type`. Props: `question: QuestionDefinition`, `value`, `onChange`.

```typescript
// apps/web/src/components/onboarding/question-renderer.tsx
'use client';

import type { QuestionDefinition } from '@life-design/core';
import ScaleQuestion from './question-types/scale-question';
import SingleSelect from './question-types/single-select';
import MultiSelect from './question-types/multi-select';

interface QuestionRendererProps {
  question: QuestionDefinition;
  value: string | string[] | number | null;
  onChange: (value: string | string[] | number) => void;
}

export default function QuestionRenderer({ question, value, onChange }: QuestionRendererProps) {
  switch (question.type) {
    case 'scale':
      return (
        <ScaleQuestion
          min={question.scaleMin ?? 1}
          max={question.scaleMax ?? 10}
          value={typeof value === 'number' ? value : null}
          onChange={onChange}
        />
      );
    case 'single_select':
      return (
        <SingleSelect
          options={question.options ?? []}
          value={typeof value === 'string' ? value : null}
          onChange={onChange}
        />
      );
    case 'multi_select':
      return (
        <MultiSelect
          options={question.options ?? []}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          maxSelections={question.maxSelections ?? 2}
        />
      );
    default:
      return null;
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/onboarding/question-types/ apps/web/src/components/onboarding/question-renderer.tsx
git commit -m "feat: add question renderer components (scale, single-select, multi-select)"
```

---

## Chunk 6: Frontend — Wizard Shell

### Task 10: Create wizard support components

**Files:**
- Create: `apps/web/src/components/onboarding/progress-bar.tsx`
- Create: `apps/web/src/components/onboarding/section-header.tsx`
- Create: `apps/web/src/components/onboarding/mentor-intro.tsx`
- Create: `apps/web/src/components/onboarding/profile-summary.tsx`

- [ ] **Step 1: Create ProgressBar**

Section-grouped progress with 6 segments: 4 question sections + mentors + summary. Props: `currentSection`, `currentQuestionInSection`, `totalInSection`. Uses design system tokens.

- [ ] **Step 2: Create SectionHeader**

Displayed between question sections. Shows section label ("Let's talk about your habits"), question count, and "Continue" button. Props: `label`, `questionCount`, `onContinue`.

- [ ] **Step 3: Create MentorIntro**

Shows all 3 mentors vertically: Eleanor (purple), Theo (amber), Maya (green). Each card: name, archetype, 1-line description, greeting. "Hear Voice" button using `speechSynthesis`. "Continue to Summary" button at bottom.

- [ ] **Step 4: Create ProfileSummary**

Single-column layout:
1. Welcome header with user name + check icon
2. White card with 4 labelled sections (strength/friction/strategy/this_week)
3. Second card: LLM paragraph (loading spinner → streamed text). Fetch from existing `@life-design/ai` pattern.
4. "Go to Dashboard" CTA

Props: `userName`, `summary: ProfileSummaryTemplate`, `onComplete`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/onboarding/progress-bar.tsx apps/web/src/components/onboarding/section-header.tsx apps/web/src/components/onboarding/mentor-intro.tsx apps/web/src/components/onboarding/profile-summary.tsx
git commit -m "feat: add wizard support components (progress bar, section header, mentor intro, profile summary)"
```

---

### Task 11: Create ProfilingWizard

**Files:**
- Create: `apps/web/src/components/onboarding/profiling-wizard.tsx`

- [ ] **Step 1: Create profiling-wizard.tsx**

Main orchestrator. State: `section`, `questionIndex`, `answers` (Record), `sessionId`, `isLoading`.

Flow:
1. On mount: `POST /api/onboarding/start` → get session ID, or resume with `GET /api/onboarding/status`
2. For each section: show `SectionHeader` → questions one-by-one via `QuestionRenderer`
3. After each answer: `PATCH /api/onboarding/answer` (autosave)
4. After all 4 sections: show `MentorIntro`
5. After mentors: `POST /api/onboarding/complete` → compute profile
6. Show `ProfileSummary` with results
7. "Go to Dashboard" → redirect

Back/next navigation with validation (required before advancing). Resume-safe via `status` API.

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { QUESTIONS, SECTIONS, getQuestionsForSection } from '@/lib/profiling/question-schema';
import type { RawAnswers, ProfileSummaryTemplate } from '@life-design/core';
import ProgressBar from './progress-bar';
import SectionHeader from './section-header';
import QuestionRenderer from './question-renderer';
import MentorIntro from './mentor-intro';
import ProfileSummary from './profile-summary';

type WizardPhase = 'loading' | 'section_intro' | 'question' | 'mentors' | 'completing' | 'summary';

export default function ProfilingWizard() {
  const router = useRouter();
  const [phase, setPhase] = useState<WizardPhase>('loading');
  const [sectionIndex, setSectionIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<RawAnswers>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [summary, setSummary] = useState<ProfileSummaryTemplate | null>(null);
  const [userName, setUserName] = useState<string>('');

  // Initialise session
  useEffect(() => {
    async function init() {
      // Check for existing session
      const statusRes = await fetch('/api/onboarding/status');
      const statusData = await statusRes.json();

      if (statusData.status === 'completed') {
        router.push('/dashboard');
        return;
      }

      if (statusData.status === 'in_progress') {
        setSessionId(statusData.session_id);
        setAnswers(statusData.raw_answers ?? {});
        // Resume position
        const sIdx = SECTIONS.findIndex((s) => s.id === statusData.current_section);
        if (sIdx >= 0) setSectionIndex(sIdx);
        setQuestionIndex(statusData.current_step ?? 0);
        setPhase('question');
        return;
      }

      // Start new session
      const startRes = await fetch('/api/onboarding/start', { method: 'POST' });
      const startData = await startRes.json();
      setSessionId(startData.session_id);
      setPhase('section_intro');
    }
    init();
  }, [router]);

  const currentSection = SECTIONS[sectionIndex];
  const sectionQuestions = currentSection ? getQuestionsForSection(currentSection.id) : [];
  const currentQuestion = sectionQuestions[questionIndex];

  const saveAnswer = useCallback(async (questionId: string, answer: string | string[] | number) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);

    await fetch('/api/onboarding/answer', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_id: questionId,
        answer,
        current_section: currentSection?.id,
        current_step: questionIndex,
      }),
    });
  }, [answers, currentSection, questionIndex]);

  const handleAnswer = useCallback(async (value: string | string[] | number) => {
    if (!currentQuestion) return;
    await saveAnswer(currentQuestion.id, value);

    // Advance
    if (questionIndex < sectionQuestions.length - 1) {
      setQuestionIndex((i) => i + 1);
    } else if (sectionIndex < SECTIONS.length - 1) {
      setSectionIndex((i) => i + 1);
      setQuestionIndex(0);
      setPhase('section_intro');
    } else {
      setPhase('mentors');
    }
  }, [currentQuestion, questionIndex, sectionQuestions.length, sectionIndex, saveAnswer]);

  const handleBack = useCallback(() => {
    if (phase === 'section_intro' && sectionIndex > 0) {
      setSectionIndex((i) => i - 1);
      const prevQuestions = getQuestionsForSection(SECTIONS[sectionIndex - 1].id);
      setQuestionIndex(prevQuestions.length - 1);
      setPhase('question');
    } else if (questionIndex > 0) {
      setQuestionIndex((i) => i - 1);
    } else if (sectionIndex > 0) {
      setSectionIndex((i) => i - 1);
      const prevQuestions = getQuestionsForSection(SECTIONS[sectionIndex - 1].id);
      setQuestionIndex(prevQuestions.length - 1);
    }
  }, [phase, sectionIndex, questionIndex]);

  const handleComplete = useCallback(async () => {
    setPhase('completing');
    const res = await fetch('/api/onboarding/complete', { method: 'POST' });
    const data = await res.json();
    setSummary(data.summary);
    setPhase('summary');
  }, []);

  if (phase === 'loading' || phase === 'completing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
        <div className="animate-pulse text-[#A8A198]">Loading...</div>
      </div>
    );
  }

  const canGoBack = phase === 'question' && (questionIndex > 0 || sectionIndex > 0);

  if (phase === 'section_intro') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAFAF8] to-[#F5F3EF]">
        <SectionHeader
          label={currentSection.label}
          questionCount={currentSection.questionCount}
          onContinue={() => setPhase('question')}
        />
      </div>
    );
  }

  if (phase === 'question' && currentQuestion) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#FAFAF8] to-[#F5F3EF]">
        <header className="sticky top-0 z-50 px-4 py-4 bg-[#FAFAF8]/80 backdrop-blur-sm">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            {canGoBack && (
              <button onClick={handleBack} className="p-2 rounded-lg hover:bg-[#E8E4DD]/50" aria-label="Go back">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}
            <div className="flex-1">
              <ProgressBar
                currentSection={currentSection.id}
                currentQuestionInSection={questionIndex}
                totalInSection={sectionQuestions.length}
              />
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="max-w-lg mx-auto space-y-6">
            <h2 className="font-['Instrument_Serif'] text-2xl text-[#1A1816]">
              {currentQuestion.question}
            </h2>
            <QuestionRenderer
              question={currentQuestion}
              value={answers[currentQuestion.id] ?? null}
              onChange={handleAnswer}
            />
          </div>
        </main>
      </div>
    );
  }

  if (phase === 'mentors') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAFAF8] to-[#F5F3EF]">
        <MentorIntro onContinue={handleComplete} />
      </div>
    );
  }

  if (phase === 'summary' && summary) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAFAF8] to-[#F5F3EF]">
        <ProfileSummary
          userName={userName}
          summary={summary}
          onComplete={() => router.push('/dashboard')}
        />
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && pnpm type-check
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/onboarding/profiling-wizard.tsx
git commit -m "feat: add ProfilingWizard orchestrator with resume support"
```

---

## Chunk 7: Wire Page & Auth

### Task 12: Rewrite onboarding page and update middleware

**Files:**
- Modify: `apps/web/src/app/(protected)/onboarding/page.tsx`
- Modify: `apps/web/src/middleware.ts`
- Modify: `apps/web/src/lib/guest-context.tsx`

- [ ] **Step 1: Rewrite page.tsx**

Replace entirely. No more `FlowStateProvider` or `OnboardingGate`. The ProfilingWizard handles auth checks internally via the API.

```typescript
'use client';

import ProfilingWizard from '@/components/onboarding/profiling-wizard';

export default function OnboardingPage() {
  return <ProfilingWizard />;
}
```

- [ ] **Step 2: Update middleware.ts**

Replace the cookie-based `GUEST_ONBOARDED_COOKIE` check. For authenticated users, check `profiles.onboarding_status` from Supabase. For guests, keep the cookie fallback (they can't use the new profiling flow since it requires auth).

In `middleware.ts`, add after the `getUser()` call:
```typescript
// If authenticated and accessing protected routes, check onboarding status
if (user && isGuestProtected && pathname !== '/onboarding') {
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_status')
    .eq('id', user.id)
    .maybeSingle();

  if (profile && profile.onboarding_status !== 'completed') {
    return NextResponse.redirect(new URL('/onboarding', request.url));
  }
}
```

- [ ] **Step 3: Update guest-context.tsx**

Remove the onboarding-specific localStorage keys from `clearGuestData()`:
- `ONBOARDING_PROGRESS_STORAGE_KEY`
- `ONBOARDING_CHECKPOINT_STORAGE_KEY`
- `ONBOARDING_SESSION_STORAGE_KEY`

Remove the `GUEST_ONBOARDED_COOKIE` set/clear for authenticated users (cookie is only for unauthenticated guests now).

- [ ] **Step 4: Verify build**

```bash
pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(protected\)/onboarding/page.tsx apps/web/src/middleware.ts apps/web/src/lib/guest-context.tsx
git commit -m "feat: wire ProfilingWizard into page, update middleware for Supabase onboarding check"
```

---

## Chunk 8: Old File Removal & Tests

### Task 13: Delete old onboarding files

**Files:**
- Delete: `apps/web/src/components/onboarding/flow-state.tsx`
- Delete: `apps/web/src/components/onboarding/onboarding-wizard.tsx`
- Delete: `apps/web/src/components/onboarding/progress-dots.tsx`
- Delete: `apps/web/src/components/onboarding/glass-container.tsx`
- Delete: `apps/web/src/components/onboarding/steps/welcome-step.tsx`
- Delete: `apps/web/src/components/onboarding/steps/name-step.tsx`
- Delete: `apps/web/src/components/onboarding/steps/about-step.tsx`
- Delete: `apps/web/src/components/onboarding/steps/mentor-step.tsx`
- Delete: `apps/web/src/components/onboarding/steps/complete-step.tsx`
- Delete: `apps/web/src/components/onboarding/hooks/use-onboarding-conversation.ts`
- Delete: `apps/web/src/components/onboarding/__tests__/onboarding-wizard.test.tsx`
- Delete: `apps/web/src/lib/onboarding-session.ts`
- Delete: `apps/web/src/lib/onboarding-checkpoint.ts`

- [ ] **Step 1: Verify no other files import these**

Search for imports of each file being deleted. Update any remaining references.

```bash
cd apps/web && grep -r "flow-state" src/ --include="*.tsx" --include="*.ts" -l
cd apps/web && grep -r "onboarding-wizard" src/ --include="*.tsx" --include="*.ts" -l
cd apps/web && grep -r "onboarding-session" src/ --include="*.tsx" --include="*.ts" -l
cd apps/web && grep -r "onboarding-checkpoint" src/ --include="*.tsx" --include="*.ts" -l
cd apps/web && grep -r "progress-dots" src/ --include="*.tsx" --include="*.ts" -l
cd apps/web && grep -r "glass-container" src/ --include="*.tsx" --include="*.ts" -l
```

Expected: Only the files being deleted + page.tsx (already rewritten). Fix any remaining imports.

- [ ] **Step 2: Delete the files**

```bash
rm apps/web/src/components/onboarding/flow-state.tsx
rm apps/web/src/components/onboarding/onboarding-wizard.tsx
rm apps/web/src/components/onboarding/progress-dots.tsx
rm apps/web/src/components/onboarding/glass-container.tsx
rm -rf apps/web/src/components/onboarding/steps/
rm apps/web/src/components/onboarding/hooks/use-onboarding-conversation.ts
rm apps/web/src/components/onboarding/__tests__/onboarding-wizard.test.tsx
rm apps/web/src/lib/onboarding-session.ts
rm apps/web/src/lib/onboarding-checkpoint.ts
```

**Keep:** `hooks/use-speech-recognition.ts`, `hooks/use-speech-synthesis.ts`, `voice/` directory — used elsewhere.

- [ ] **Step 3: Verify build**

```bash
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove old onboarding wizard, flow state, and localStorage session files"
```

---

### Task 14: Write new wizard tests

**Files:**
- Create: `apps/web/src/components/onboarding/__tests__/profiling-wizard.test.tsx`

- [ ] **Step 1: Write tests**

Tests cover:
1. Renders loading state initially
2. Shows section header after session starts
3. Renders scale question correctly
4. Renders single-select question correctly
5. Calls answer API on selection
6. Shows mentor intro after all sections
7. Shows profile summary after completion

Mock `fetch` for API calls. Use existing patterns from the old test file (mock `next/navigation`, `localStorage`, etc.).

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfilingWizard from '../profiling-wizard';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock fetch responses
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  // Default: new session, not started
  mockFetch
    .mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 'not_started' }),
    })
    .mockResolvedValueOnce({
      json: () => Promise.resolve({ session_id: 'test-session', resumed: false }),
    });
});

describe('ProfilingWizard', () => {
  it('shows section intro after initialisation', async () => {
    render(<ProfilingWizard />);
    await waitFor(() => {
      expect(screen.getByText('Your Goal')).toBeInTheDocument();
    });
  });

  it('redirects to dashboard if onboarding already completed', async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 'completed' }),
    });
    render(<ProfilingWizard />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd apps/web && pnpm vitest run src/components/onboarding/__tests__/profiling-wizard.test.tsx
```
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/onboarding/__tests__/profiling-wizard.test.tsx
git commit -m "test: add profiling wizard tests (init, resume, section flow)"
```

---

### Task 15: Final integration verification

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

```bash
git add -A
git commit -m "fix: integration fixups for profiling onboarding"
```

---

## Build Sequence Dependency Graph

```
Task 1-2: Core types + constants
    │
    ▼
Task 3-4: Normalisation + scoring (with tests)
    │
    ├──► Task 5-6: Question schema + summary templates (depends on core types)
    │
    └──► Task 7: Supabase migration (depends on types for column names)
              │
              ▼
         Task 8: API routes (depends on migration + normalisation + scoring)
              │
              ▼
         Task 9-10: Frontend renderers + support components (depends on question schema)
              │
              ▼
         Task 11: ProfilingWizard (depends on renderers + API routes)
              │
              ▼
         Task 12: Wire page + middleware (depends on wizard)
              │
              ▼
         Task 13: Delete old files (depends on new page being wired)
              │
              ▼
         Task 14-15: Tests + verification
```

Tasks 5-6 and Task 7 can execute in parallel since they only share read dependencies on Tasks 1-4.
