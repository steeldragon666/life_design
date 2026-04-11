# Opt In Onboarding Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the question-only profiling wizard with an 8-card guided onboarding flow that wraps profiling with welcome messaging, privacy assurance, feature tutorials, and interactive first-use experiences.

**Architecture:** New `OnboardingFlow` component in `apps/web/src/components/onboarding/` orchestrates 8 card components. The existing `ProfilingWizard` is refactored into an embeddable sub-component for Card 3. New baseline profiling questions (17) are added to `packages/core`. The `onboarding_sessions` table gets a `current_card` column. All card transitions are CSS `translateX` with spring easing.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Supabase (Postgres + RLS), Tailwind CSS, existing `@life-design/ui` design tokens, existing `@life-design/core` profiling system.

**Design doc:** `docs/plans/2026-04-11-onboarding-redesign-design.md`

---

## Task 1: Add `baseline` Section Type to Core

**Files:**
- Modify: `packages/core/src/profiling/types.ts:4-13`
- Test: `packages/core/src/profiling/__tests__/types.test.ts` (create)

**Step 1: Update ProfilingSection type**

In `packages/core/src/profiling/types.ts`, add `'baseline'` to the union:

```typescript
export type ProfilingSection =
  | 'goal'
  | 'habits'
  | 'energy'
  | 'style'
  | 'wellbeing'
  | 'baseline'    // NEW — chronotype, sleep, stress, self-compassion, locus of control
  | 'personality'
  | 'drive'
  | 'satisfaction'
  | 'needs';
```

**Step 2: Run type-check**

Run: `cd /c/Users/Aaron/repos/life_design && pnpm turbo type-check --filter=@life-design/core`
Expected: PASS (no downstream breakage since the union is additive)

**Step 3: Commit**

```bash
git add packages/core/src/profiling/types.ts
git commit -m "feat(core): add baseline profiling section type"
```

---

## Task 2: Add Baseline Psychometric Types

**Files:**
- Modify: `packages/core/src/profiling/psychometric-types.ts`
- Modify: `packages/core/src/profiling/index.ts` (already exports, verify)

**Step 1: Add new score interfaces to psychometric-types.ts**

Append after the existing `PsychometricProfile` interface:

```typescript
/** MEQ-SA Chronotype (Horne & Ostberg) — categorical result */
export interface ChronotypeScore {
  type: 'definite_morning' | 'moderate_morning' | 'intermediate' | 'moderate_evening' | 'definite_evening';
  raw: number;  // sum of items
}

/** PSQI Short Form — Sleep Quality (0-3 scale per item) */
export interface SleepQualityScore {
  score: number;       // 0-12 range (sum of 4 items)
  quality: 'good' | 'fair' | 'poor';
}

/** PSS-4 Perceived Stress (Cohen) — 0-4 scale per item */
export interface StressScore {
  score: number;       // 0-16 range (sum of 4 items, 2 reversed)
  level: 'low' | 'moderate' | 'high';
}

/** SCS-SF Self-Compassion (Neff) — 1-5 scale per item */
export interface SelfCompassionScore {
  score: number;       // 1-5 mean (6 items, 3 reversed)
  level: 'low' | 'moderate' | 'high';
}

/** Brief IPC Locus of Control (Levenson) — 1-6 scale per item */
export interface LocusOfControlScore {
  internal: number;    // 1-6
  powerfulOthers: number;
  chance: number;
  dominant: 'internal' | 'powerful_others' | 'chance';
}

/** Extended psychometric profile including baseline instruments */
export interface ExtendedPsychometricProfile extends PsychometricProfile {
  chronotype: ChronotypeScore;
  sleepQuality: SleepQualityScore;
  stress: StressScore;
  selfCompassion: SelfCompassionScore;
  locusOfControl: LocusOfControlScore;
}
```

**Step 2: Run type-check**

Run: `cd /c/Users/Aaron/repos/life_design && pnpm turbo type-check --filter=@life-design/core`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/core/src/profiling/psychometric-types.ts
git commit -m "feat(core): add baseline psychometric score types"
```

---

## Task 3: Add Baseline Instrument Definitions

**Files:**
- Modify: `packages/core/src/profiling/instruments.ts`

**Step 1: Add 17 new PsychometricItem definitions**

Append to `instruments.ts` after the existing BPNS items:

```typescript
// ---------------------------------------------------------------------------
// MEQ-SA Chronotype (Horne & Ostberg) — 3 items, categorical
// ---------------------------------------------------------------------------

const CHRONOTYPE_ITEMS: PsychometricItem[] = [
  {
    id: 'chrono_1',
    instrument: 'chronotype' as any,
    subscale: 'chronotype',
    text: 'If you were entirely free to plan your day, what time would you get up?',
    reversed: false,
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'chrono_2',
    instrument: 'chronotype' as any,
    subscale: 'chronotype',
    text: 'During the first half hour after waking, how alert do you feel?',
    reversed: false,
    scaleMin: 1,
    scaleMax: 4,
  },
  {
    id: 'chrono_3',
    instrument: 'chronotype' as any,
    subscale: 'chronotype',
    text: 'At what time of day do you feel your best?',
    reversed: false,
    scaleMin: 1,
    scaleMax: 5,
  },
];

// ---------------------------------------------------------------------------
// PSQI Short Form — Sleep Quality — 4 items, 0-3 scale
// ---------------------------------------------------------------------------

const SLEEP_QUALITY_ITEMS: PsychometricItem[] = [
  {
    id: 'sleep_1',
    instrument: 'sleep' as any,
    subscale: 'sleepQuality',
    text: 'During the past month, how would you rate your overall sleep quality?',
    reversed: false,
    scaleMin: 0,
    scaleMax: 3,
  },
  {
    id: 'sleep_2',
    instrument: 'sleep' as any,
    subscale: 'sleepQuality',
    text: 'How often have you had trouble sleeping because you could not get to sleep within 30 minutes?',
    reversed: false,
    scaleMin: 0,
    scaleMax: 3,
  },
  {
    id: 'sleep_3',
    instrument: 'sleep' as any,
    subscale: 'sleepQuality',
    text: 'How often have you had trouble staying asleep during the night?',
    reversed: false,
    scaleMin: 0,
    scaleMax: 3,
  },
  {
    id: 'sleep_4',
    instrument: 'sleep' as any,
    subscale: 'sleepQuality',
    text: 'How often have you felt tired or had low energy during the day?',
    reversed: false,
    scaleMin: 0,
    scaleMax: 3,
  },
];

// ---------------------------------------------------------------------------
// PSS-4 Perceived Stress (Cohen) — 4 items, 0-4 scale
// ---------------------------------------------------------------------------

const STRESS_ITEMS: PsychometricItem[] = [
  {
    id: 'stress_1',
    instrument: 'stress' as any,
    subscale: 'stress',
    text: 'In the last month, how often have you felt that you were unable to control the important things in your life?',
    reversed: false,
    scaleMin: 0,
    scaleMax: 4,
  },
  {
    id: 'stress_2',
    instrument: 'stress' as any,
    subscale: 'stress',
    text: 'In the last month, how often have you felt confident about your ability to handle your personal problems?',
    reversed: true,
    scaleMin: 0,
    scaleMax: 4,
  },
  {
    id: 'stress_3',
    instrument: 'stress' as any,
    subscale: 'stress',
    text: 'In the last month, how often have you felt that things were going your way?',
    reversed: true,
    scaleMin: 0,
    scaleMax: 4,
  },
  {
    id: 'stress_4',
    instrument: 'stress' as any,
    subscale: 'stress',
    text: 'In the last month, how often have you felt difficulties were piling up so high that you could not overcome them?',
    reversed: false,
    scaleMin: 0,
    scaleMax: 4,
  },
];

// ---------------------------------------------------------------------------
// SCS-SF Self-Compassion (Neff) — 6 items, 1-5 scale
// ---------------------------------------------------------------------------

const SELF_COMPASSION_ITEMS: PsychometricItem[] = [
  {
    id: 'sc_1',
    instrument: 'selfCompassion' as any,
    subscale: 'selfKindness',
    text: 'When I fail at something important to me, I try to keep things in perspective.',
    reversed: false,
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'sc_2',
    instrument: 'selfCompassion' as any,
    subscale: 'selfJudgment',
    text: "When I'm going through a hard time, I'm tough on myself.",
    reversed: true,
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'sc_3',
    instrument: 'selfCompassion' as any,
    subscale: 'commonHumanity',
    text: "When something painful happens, I try to see it as part of everyone's experience.",
    reversed: false,
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'sc_4',
    instrument: 'selfCompassion' as any,
    subscale: 'isolation',
    text: "When I fail, I feel like I'm the only one who struggles.",
    reversed: true,
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'sc_5',
    instrument: 'selfCompassion' as any,
    subscale: 'mindfulness',
    text: 'When something upsets me, I try to observe my feelings without judging them.',
    reversed: false,
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'sc_6',
    instrument: 'selfCompassion' as any,
    subscale: 'overIdentification',
    text: "When I'm feeling down, I get carried away by negative feelings.",
    reversed: true,
    scaleMin: 1,
    scaleMax: 5,
  },
];

// ---------------------------------------------------------------------------
// Brief IPC Locus of Control (Levenson) — 3 items, 1-6 scale
// ---------------------------------------------------------------------------

const LOCUS_OF_CONTROL_ITEMS: PsychometricItem[] = [
  {
    id: 'loc_1',
    instrument: 'locusOfControl' as any,
    subscale: 'internal',
    text: 'My life is determined by my own actions.',
    reversed: false,
    scaleMin: 1,
    scaleMax: 6,
  },
  {
    id: 'loc_2',
    instrument: 'locusOfControl' as any,
    subscale: 'powerfulOthers',
    text: 'Other people have a lot of influence over what happens in my life.',
    reversed: false,
    scaleMin: 1,
    scaleMax: 6,
  },
  {
    id: 'loc_3',
    instrument: 'locusOfControl' as any,
    subscale: 'chance',
    text: 'To a great extent, my life is controlled by accidental happenings.',
    reversed: false,
    scaleMin: 1,
    scaleMax: 6,
  },
];

export const BASELINE_ITEMS = [
  ...CHRONOTYPE_ITEMS,
  ...SLEEP_QUALITY_ITEMS,
  ...STRESS_ITEMS,
  ...SELF_COMPASSION_ITEMS,
  ...LOCUS_OF_CONTROL_ITEMS,
];
```

Also export `BASELINE_ITEMS` from the existing `ALL_PSYCHOMETRIC_ITEMS` array (or alongside it).

**Step 2: Run type-check**

Run: `cd /c/Users/Aaron/repos/life_design && pnpm turbo type-check --filter=@life-design/core`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/core/src/profiling/instruments.ts
git commit -m "feat(core): add baseline instrument definitions (chronotype, sleep, stress, self-compassion, locus of control)"
```

---

## Task 4: Add Baseline Scoring Functions

**Files:**
- Modify: `packages/core/src/profiling/psychometric-scoring.ts`
- Test: `packages/core/src/profiling/__tests__/psychometric-scoring.test.ts` (extend existing)

**Step 1: Write failing tests for each scoring function**

Add test cases to the existing test file for `scoreChronotype`, `scoreSleepQuality`, `scoreStress`, `scoreSelfCompassion`, `scoreLocusOfControl`:

```typescript
describe('scoreChronotype', () => {
  it('classifies high scores as definite morning', () => {
    const responses = { chrono_1: 5, chrono_2: 4, chrono_3: 5 };
    const result = scoreChronotype(responses);
    expect(result.type).toBe('definite_morning');
    expect(result.raw).toBe(14);
  });

  it('classifies low scores as definite evening', () => {
    const responses = { chrono_1: 1, chrono_2: 1, chrono_3: 1 };
    const result = scoreChronotype(responses);
    expect(result.type).toBe('definite_evening');
    expect(result.raw).toBe(3);
  });
});

describe('scoreSleepQuality', () => {
  it('scores good sleep quality', () => {
    const responses = { sleep_1: 0, sleep_2: 0, sleep_3: 0, sleep_4: 1 };
    const result = scoreSleepQuality(responses);
    expect(result.score).toBe(1);
    expect(result.quality).toBe('good');
  });

  it('scores poor sleep quality', () => {
    const responses = { sleep_1: 3, sleep_2: 3, sleep_3: 3, sleep_4: 3 };
    const result = scoreSleepQuality(responses);
    expect(result.score).toBe(12);
    expect(result.quality).toBe('poor');
  });
});

describe('scoreStress', () => {
  it('reverses items 2 and 3 and sums', () => {
    const responses = { stress_1: 4, stress_2: 0, stress_3: 0, stress_4: 4 };
    const result = scoreStress(responses);
    // stress_2 reversed: 4-0 = 4, stress_3 reversed: 4-0 = 4
    expect(result.score).toBe(16);
    expect(result.level).toBe('high');
  });
});

describe('scoreSelfCompassion', () => {
  it('reverses negative items and averages', () => {
    // all 5 (highest) — reversed items become 5 too → mean = 5
    const responses = { sc_1: 5, sc_2: 1, sc_3: 5, sc_4: 1, sc_5: 5, sc_6: 1 };
    const result = scoreSelfCompassion(responses);
    expect(result.score).toBe(5);
    expect(result.level).toBe('high');
  });
});

describe('scoreLocusOfControl', () => {
  it('identifies dominant locus', () => {
    const responses = { loc_1: 6, loc_2: 2, loc_3: 1 };
    const result = scoreLocusOfControl(responses);
    expect(result.internal).toBe(6);
    expect(result.dominant).toBe('internal');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /c/Users/Aaron/repos/life_design && pnpm turbo test --filter=@life-design/core`
Expected: FAIL — functions not defined

**Step 3: Implement scoring functions in psychometric-scoring.ts**

```typescript
export function scoreChronotype(responses: Record<string, number>): ChronotypeScore {
  const raw = (responses['chrono_1'] ?? 0) + (responses['chrono_2'] ?? 0) + (responses['chrono_3'] ?? 0);
  let type: ChronotypeScore['type'];
  if (raw >= 12) type = 'definite_morning';
  else if (raw >= 10) type = 'moderate_morning';
  else if (raw >= 7) type = 'intermediate';
  else if (raw >= 5) type = 'moderate_evening';
  else type = 'definite_evening';
  return { type, raw };
}

export function scoreSleepQuality(responses: Record<string, number>): SleepQualityScore {
  const score = (responses['sleep_1'] ?? 0) + (responses['sleep_2'] ?? 0)
    + (responses['sleep_3'] ?? 0) + (responses['sleep_4'] ?? 0);
  let quality: SleepQualityScore['quality'];
  if (score <= 4) quality = 'good';
  else if (score <= 8) quality = 'fair';
  else quality = 'poor';
  return { score, quality };
}

export function scoreStress(responses: Record<string, number>): StressScore {
  const s1 = responses['stress_1'] ?? 0;
  const s2 = reverse(responses['stress_2'] ?? 0, 0, 4);
  const s3 = reverse(responses['stress_3'] ?? 0, 0, 4);
  const s4 = responses['stress_4'] ?? 0;
  const score = s1 + s2 + s3 + s4;
  let level: StressScore['level'];
  if (score <= 5) level = 'low';
  else if (score <= 10) level = 'moderate';
  else level = 'high';
  return { score, level };
}

export function scoreSelfCompassion(responses: Record<string, number>): SelfCompassionScore {
  const items = [
    responses['sc_1'] ?? 0,
    reverse(responses['sc_2'] ?? 0, 1, 5),
    responses['sc_3'] ?? 0,
    reverse(responses['sc_4'] ?? 0, 1, 5),
    responses['sc_5'] ?? 0,
    reverse(responses['sc_6'] ?? 0, 1, 5),
  ];
  const score = Math.round((items.reduce((a, b) => a + b, 0) / items.length) * 100) / 100;
  let level: SelfCompassionScore['level'];
  if (score >= 3.5) level = 'high';
  else if (score >= 2.5) level = 'moderate';
  else level = 'low';
  return { score, level };
}

export function scoreLocusOfControl(responses: Record<string, number>): LocusOfControlScore {
  const internal = responses['loc_1'] ?? 0;
  const powerfulOthers = responses['loc_2'] ?? 0;
  const chance = responses['loc_3'] ?? 0;
  let dominant: LocusOfControlScore['dominant'];
  if (internal >= powerfulOthers && internal >= chance) dominant = 'internal';
  else if (powerfulOthers >= chance) dominant = 'powerful_others';
  else dominant = 'chance';
  return { internal, powerfulOthers, chance, dominant };
}
```

Add appropriate imports for the new types at the top of the file.

**Step 4: Run tests to verify they pass**

Run: `cd /c/Users/Aaron/repos/life_design && pnpm turbo test --filter=@life-design/core`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/core/src/profiling/psychometric-scoring.ts packages/core/src/profiling/__tests__/psychometric-scoring.test.ts
git commit -m "feat(core): add baseline scoring functions (chronotype, sleep, stress, self-compassion, locus of control)"
```

---

## Task 5: Add Baseline Questions to Web Question Schema

**Files:**
- Modify: `apps/web/src/lib/profiling/question-schema.ts`

**Step 1: Add baseline section to SECTIONS array**

Insert after `wellbeing`:

```typescript
export const SECTIONS: SectionMeta[] = [
  { id: 'goal', label: 'Your Goal', questionCount: 3 },
  { id: 'wellbeing', label: 'Your Wellbeing', questionCount: 15 },
  { id: 'baseline', label: 'Your Baseline', questionCount: 17 },  // NEW
  { id: 'personality', label: 'Your Personality', questionCount: 10 },
  { id: 'drive', label: 'Your Drive', questionCount: 8 },
  { id: 'satisfaction', label: 'Life Satisfaction', questionCount: 5 },
  { id: 'needs', label: 'Your Needs', questionCount: 12 },
  { id: 'style', label: 'Your Style', questionCount: 6 },
];
```

**Step 2: Add 17 baseline questions to QUESTIONS array**

Insert after the PERMA questions (after `perma_15`), before the TIPI questions:

```typescript
  // =========================================================================
  // Section: baseline — Chronotype, Sleep, Stress, Self-Compassion, Locus of Control
  // 17 items across 5 validated instruments
  // =========================================================================

  // Chronotype (MEQ-SA short form)
  {
    id: 'chrono_1',
    section: 'baseline',
    type: 'single_select',
    question: 'If you were entirely free to plan your day, what time would you get up?',
    options: [
      { value: '5', label: 'Before 6:30am' },
      { value: '4', label: '6:30–7:30am' },
      { value: '3', label: '7:30–9:00am' },
      { value: '2', label: '9:00–11:00am' },
      { value: '1', label: 'After 11:00am' },
    ],
  },
  {
    id: 'chrono_2',
    section: 'baseline',
    type: 'single_select',
    question: 'During the first half hour after waking, how alert do you feel?',
    options: [
      { value: '4', label: 'Very alert' },
      { value: '3', label: 'Fairly alert' },
      { value: '2', label: 'Fairly groggy' },
      { value: '1', label: 'Very groggy' },
    ],
  },
  {
    id: 'chrono_3',
    section: 'baseline',
    type: 'single_select',
    question: 'At what time of day do you feel your best?',
    options: [
      { value: '5', label: 'Early morning' },
      { value: '4', label: 'Late morning' },
      { value: '3', label: 'Afternoon' },
      { value: '2', label: 'Early evening' },
      { value: '1', label: 'Late evening / night' },
    ],
  },

  // Sleep Quality (PSQI short form) — 0-3 scale
  {
    id: 'sleep_1',
    section: 'baseline',
    type: 'single_select',
    question: 'During the past month, how would you rate your overall sleep quality?',
    options: [
      { value: '0', label: 'Very good' },
      { value: '1', label: 'Fairly good' },
      { value: '2', label: 'Fairly bad' },
      { value: '3', label: 'Very bad' },
    ],
  },
  {
    id: 'sleep_2',
    section: 'baseline',
    type: 'single_select',
    question: 'How often have you had trouble falling asleep within 30 minutes?',
    options: [
      { value: '0', label: 'Not at all' },
      { value: '1', label: 'Less than once a week' },
      { value: '2', label: 'Once or twice a week' },
      { value: '3', label: 'Three or more times a week' },
    ],
  },
  {
    id: 'sleep_3',
    section: 'baseline',
    type: 'single_select',
    question: 'How often have you had trouble staying asleep during the night?',
    options: [
      { value: '0', label: 'Not at all' },
      { value: '1', label: 'Less than once a week' },
      { value: '2', label: 'Once or twice a week' },
      { value: '3', label: 'Three or more times a week' },
    ],
  },
  {
    id: 'sleep_4',
    section: 'baseline',
    type: 'single_select',
    question: 'How often have you felt tired or had low energy during the day?',
    options: [
      { value: '0', label: 'Not at all' },
      { value: '1', label: 'Less than once a week' },
      { value: '2', label: 'Once or twice a week' },
      { value: '3', label: 'Three or more times a week' },
    ],
  },

  // Perceived Stress (PSS-4) — 0-4 scale
  {
    id: 'stress_1',
    section: 'baseline',
    type: 'scale',
    question: 'In the last month, how often have you felt unable to control the important things in your life?',
    scaleMin: 0,
    scaleMax: 4,
  },
  {
    id: 'stress_2',
    section: 'baseline',
    type: 'scale',
    question: 'In the last month, how often have you felt confident about handling your personal problems?',
    scaleMin: 0,
    scaleMax: 4,
  },
  {
    id: 'stress_3',
    section: 'baseline',
    type: 'scale',
    question: 'In the last month, how often have you felt things were going your way?',
    scaleMin: 0,
    scaleMax: 4,
  },
  {
    id: 'stress_4',
    section: 'baseline',
    type: 'scale',
    question: 'In the last month, how often have you felt difficulties piling up so high you could not overcome them?',
    scaleMin: 0,
    scaleMax: 4,
  },

  // Self-Compassion (SCS-SF) — 1-5 scale
  {
    id: 'sc_1',
    section: 'baseline',
    type: 'scale',
    question: 'When I fail at something important, I try to keep things in perspective.',
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'sc_2',
    section: 'baseline',
    type: 'scale',
    question: "When I'm going through a hard time, I'm tough on myself.",
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'sc_3',
    section: 'baseline',
    type: 'scale',
    question: "When something painful happens, I try to see it as part of everyone's experience.",
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'sc_4',
    section: 'baseline',
    type: 'scale',
    question: "When I fail, I feel like I'm the only one who struggles.",
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'sc_5',
    section: 'baseline',
    type: 'scale',
    question: 'When something upsets me, I try to observe my feelings without judging them.',
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'sc_6',
    section: 'baseline',
    type: 'scale',
    question: "When I'm feeling down, I get carried away by negative feelings.",
    scaleMin: 1,
    scaleMax: 5,
  },

  // Locus of Control (Brief IPC) — 1-6 scale
  {
    id: 'loc_1',
    section: 'baseline',
    type: 'scale',
    question: 'My life is determined by my own actions.',
    scaleMin: 1,
    scaleMax: 6,
  },
  {
    id: 'loc_2',
    section: 'baseline',
    type: 'scale',
    question: 'Other people have a lot of influence over what happens in my life.',
    scaleMin: 1,
    scaleMax: 6,
  },
  {
    id: 'loc_3',
    section: 'baseline',
    type: 'scale',
    question: 'To a great extent, my life is controlled by accidental happenings.',
    scaleMin: 1,
    scaleMax: 6,
  },
```

**Step 3: Run type-check and existing tests**

Run: `cd /c/Users/Aaron/repos/life_design && pnpm turbo type-check --filter=web && pnpm turbo test --filter=web`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/web/src/lib/profiling/question-schema.ts
git commit -m "feat(web): add 17 baseline profiling questions to question schema"
```

---

## Task 6: Database Migration — Add `current_card` to Onboarding Sessions

**Files:**
- Create: `supabase/migrations/00024_onboarding_card_tracking.sql`

**Step 1: Write migration**

```sql
-- 00024: Add card-level tracking to onboarding_sessions for the 8-card flow

ALTER TABLE onboarding_sessions
  ADD COLUMN current_card INTEGER NOT NULL DEFAULT 1
    CHECK (current_card BETWEEN 1 AND 8);

ALTER TABLE onboarding_sessions
  ADD COLUMN first_checkin_completed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE onboarding_sessions
  ADD COLUMN first_streak_created BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE onboarding_sessions
  ADD COLUMN first_goal_created BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE onboarding_sessions
  ADD COLUMN apps_connected TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN onboarding_sessions.current_card IS 'Which of the 8 onboarding cards the user is currently on';
```

**Step 2: Verify migration applies**

Run: `cd /c/Users/Aaron/repos/life_design && npx supabase migration list` (or `npx supabase db push --local` if using local Supabase)
Expected: Migration 00024 listed

**Step 3: Commit**

```bash
git add supabase/migrations/00024_onboarding_card_tracking.sql
git commit -m "feat(db): add card tracking columns to onboarding_sessions"
```

---

## Task 7: Update Onboarding API Routes for Card Tracking

**Files:**
- Modify: `apps/web/src/app/api/onboarding/status/route.ts`
- Modify: `apps/web/src/app/api/onboarding/answer/route.ts`
- Create: `apps/web/src/app/api/onboarding/card/route.ts`

**Step 1: Add `current_card` to status response**

In `apps/web/src/app/api/onboarding/status/route.ts`, add `current_card` to the select and response:

```typescript
const { data: session } = await supabase
  .from('onboarding_sessions')
  .select('id, status, current_section, current_step, current_card, raw_answers, first_checkin_completed, first_streak_created, first_goal_created, apps_connected')
  .eq('user_id', user.id)
  .maybeSingle();
```

Include all new fields in the response JSON.

**Step 2: Create card progress endpoint**

Create `apps/web/src/app/api/onboarding/card/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.current_card != null) updates.current_card = body.current_card;
  if (body.first_checkin_completed != null) updates.first_checkin_completed = body.first_checkin_completed;
  if (body.first_streak_created != null) updates.first_streak_created = body.first_streak_created;
  if (body.first_goal_created != null) updates.first_goal_created = body.first_goal_created;
  if (body.apps_connected != null) updates.apps_connected = body.apps_connected;

  const { error } = await supabase
    .from('onboarding_sessions')
    .update(updates)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

**Step 3: Run type-check**

Run: `cd /c/Users/Aaron/repos/life_design && pnpm turbo type-check --filter=web`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/web/src/app/api/onboarding/status/route.ts apps/web/src/app/api/onboarding/card/route.ts
git commit -m "feat(api): add card tracking to onboarding API routes"
```

---

## Task 8: Build Card 1 — Welcome & Privacy

**Files:**
- Create: `apps/web/src/components/onboarding/cards/welcome-card.tsx`

**Step 1: Build the component**

```typescript
'use client';

interface WelcomeCardProps {
  onNext: () => void;
}

export default function WelcomeCard({ onNext }: WelcomeCardProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-stone-50 to-stone-100">
      <div className="max-w-lg w-full space-y-10 text-center">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#9BB89B] to-[#739A73] flex items-center justify-center shadow-lg">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <h1 className="font-serif text-4xl text-stone-900">Welcome to Opt In</h1>
          <p className="text-stone-500 text-lg">Your AI-powered personal analytics companion</p>
        </div>

        {/* Info blocks */}
        <div className="space-y-6 text-left">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-sage-100 flex items-center justify-center flex-shrink-0 mt-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sage-600"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
            </div>
            <div>
              <h3 className="font-medium text-stone-900">How it works</h3>
              <p className="text-sm text-stone-600 mt-1">You check in daily across 8 life dimensions — career, finance, health, fitness, family, social, romance, and growth. Our AI finds patterns, correlations, and insights you'd never spot alone.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0 mt-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-600"><path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z" /></svg>
            </div>
            <div>
              <h3 className="font-medium text-stone-900">AI that works for you</h3>
              <p className="text-sm text-stone-600 mt-1">We use AI to understand your life patterns and give you personalised guidance. It learns from your data to become more helpful over time — like a mentor that actually knows your story.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-600"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            </div>
            <div>
              <h3 className="font-medium text-stone-900">Your data is yours</h3>
              <p className="text-sm text-stone-600 mt-1">We don't sell your data to third parties or use it to improve our products. Every user's data is encrypted (AES-256) and only viewable to our systems when you're logged in. We literally cannot access it. The more you log in and share, the better we can help you.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onNext}
          className="w-full py-4 rounded-2xl bg-stone-900 text-white font-medium text-lg hover:bg-stone-800 transition-colors"
        >
          Let's get started
        </button>

        {/* Footer links */}
        <p className="text-xs text-stone-400">
          <a href="/privacy" className="underline hover:text-stone-600">Privacy Policy</a>
          {' · '}
          <a href="/terms" className="underline hover:text-stone-600">Terms of Service</a>
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Run type-check**

Run: `cd /c/Users/Aaron/repos/life_design && pnpm turbo type-check --filter=web`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/src/components/onboarding/cards/welcome-card.tsx
git commit -m "feat(web): add Card 1 — Welcome & Privacy"
```

---

## Task 9: Build Card 2 — Expectations

**Files:**
- Create: `apps/web/src/components/onboarding/cards/expectations-card.tsx`

**Step 1: Build the component**

Same pattern as Card 1 — full-screen, centred, headline + 3 blocks + section overview + CTA. Content from design doc Card 2. Include visual section preview showing 8 section icons (Goal, Wellbeing, Baseline, Personality, Drive, Satisfaction, Needs, Style) with "~76 questions" label.

**Step 2: Run type-check, commit**

```bash
git add apps/web/src/components/onboarding/cards/expectations-card.tsx
git commit -m "feat(web): add Card 2 — Expectations"
```

---

## Task 10: Build Card 3 — Data Import Prompt

**Files:**
- Create: `apps/web/src/components/onboarding/cards/data-import-card.tsx`

**Step 1: Build the pre-profiling data import screen**

A grid of integration cards, each with provider icon, name, description, and "Connect" button. Connect buttons trigger the existing OAuth flows at `/api/auth/{provider}`. Include skip option and privacy reminder. Track connected apps via the onboarding card API (`PATCH /api/onboarding/card`).

The existing OAuth routes are:
- `/api/auth/strava`
- `/api/auth/spotify`
- `/api/auth/google` (Calendar)
- `/api/auth/slack`
- `/api/auth/notion`
- `/api/auth/instagram`

For Apple Health, use the existing `AppleHealthImport` component from `apps/web/src/components/connectors/AppleHealthImport.tsx`.

**Step 2: Run type-check, commit**

```bash
git add apps/web/src/components/onboarding/cards/data-import-card.tsx
git commit -m "feat(web): add Card 3 — Data Import prompt"
```

---

## Task 11: Refactor ProfilingWizard into Embeddable Mode

**Files:**
- Modify: `apps/web/src/components/onboarding/profiling-wizard.tsx`

**Step 1: Add `embedded` prop to ProfilingWizard**

Refactor the wizard to accept:

```typescript
interface ProfilingWizardProps {
  embedded?: boolean;              // When true, no layout chrome, no redirect
  onComplete?: (answers: RawAnswers, summary: ProfileSummaryTemplate | null) => void;
  initialAnswers?: RawAnswers;     // For resuming
}
```

When `embedded === true`:
- Remove the `min-h-screen` and `bg-gradient` wrappers (parent card provides them)
- Remove the router redirect on completion — call `onComplete` instead
- Remove the `phase === 'mentors'` step (Card 8 handles mentor intro now)
- Keep the progress bar, section intros, question rendering, and answer persistence

**Step 2: Update `apps/web/src/app/(protected)/onboarding/page.tsx`**

For backward compatibility, the standalone page still uses `<ProfilingWizard />` without `embedded`.

**Step 3: Run existing profiling wizard tests**

Run: `cd /c/Users/Aaron/repos/life_design && pnpm turbo test --filter=web -- --testPathPattern=profiling-wizard`
Expected: PASS (existing tests should still work)

**Step 4: Commit**

```bash
git add apps/web/src/components/onboarding/profiling-wizard.tsx apps/web/src/app/\(protected\)/onboarding/page.tsx
git commit -m "refactor(web): make ProfilingWizard embeddable with onComplete callback"
```

---

## Task 12: Build Card 4 — Check-in Intro + First Check-in

**Files:**
- Create: `apps/web/src/components/onboarding/cards/checkin-intro-card.tsx`

**Step 1: Build the component with 3 sub-screens**

Sub-screen 1: Explanation (headline, 4 info blocks, CTA)
Sub-screen 2: Embed `CheckInForm` with `MoodSegment` (1-10 numbered picker). Use `DurationType.Quick` default. On submit, save the check-in via the existing check-in service and call `PATCH /api/onboarding/card` with `first_checkin_completed: true`.
Sub-screen 3: Celebration (confetti animation, message, "Next" CTA)

Use internal `useState` for sub-screen progression.

**Step 2: Run type-check, commit**

```bash
git add apps/web/src/components/onboarding/cards/checkin-intro-card.tsx
git commit -m "feat(web): add Card 4 — Check-in intro + first check-in"
```

---

## Task 13: Build Card 5 — Streaks

**Files:**
- Create: `apps/web/src/components/onboarding/cards/streaks-card.tsx`

**Step 1: Build the component**

Explanation blocks + animated StreakCounter + interactive "add your first custom streak" form. The custom streak form needs: name input, category picker (health, fitness, growth, career, social, etc.), "Add streak" button. On add, persist via a new API route or existing streak service, then call `PATCH /api/onboarding/card` with `first_streak_created: true`.

Note: The existing `user_streaks` table tracks check-in streaks only. Custom streaks will need a new `custom_streaks` table or column. For now, build the UI and create a simple `custom_streaks` table:

```sql
-- Add to migration 00024 or create 00025
CREATE TABLE custom_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_completed_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE custom_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own custom streaks"
  ON custom_streaks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Step 2: Run type-check, commit**

```bash
git add apps/web/src/components/onboarding/cards/streaks-card.tsx supabase/migrations/00025_custom_streaks.sql
git commit -m "feat(web): add Card 5 — Streaks intro + custom streak creation"
```

---

## Task 14: Build Card 6 — Connect Apps

**Files:**
- Create: `apps/web/src/components/onboarding/cards/connect-apps-card.tsx`

**Step 1: Build the component**

Thank-you message + integration cards grid. Each card shows: icon, provider name, description, "Connect" button. On connect, trigger existing OAuth flows. Poll or listen for connection status. Show green checkmark on connected providers. "Skip for now" link. Track via `PATCH /api/onboarding/card` with `apps_connected: [...]`.

**Step 2: Run type-check, commit**

```bash
git add apps/web/src/components/onboarding/cards/connect-apps-card.tsx
git commit -m "feat(web): add Card 6 — Connect Apps"
```

---

## Task 15: Build Card 7 — Dashboard Tour + First Goal

**Files:**
- Create: `apps/web/src/components/onboarding/cards/dashboard-tour-card.tsx`

**Step 1: Build the component with 2 sub-screens**

Sub-screen 1: Stylised dashboard preview with annotated callouts (Wheel of Life, Streak Counter, Insight Cards, Trend Charts, Correlation Cards). Can be a static illustration or a screenshot with overlay annotations.

Sub-screen 2: Goal creation — preset inspiration cards (tappable, populate the form) + full goal creation form. Reuse field structure from the existing `apps/web/src/app/(protected)/goals/new/` page. On save, persist via existing goals API. "Skip" option. Call `PATCH /api/onboarding/card` with `first_goal_created: true`.

**Step 2: Run type-check, commit**

```bash
git add apps/web/src/components/onboarding/cards/dashboard-tour-card.tsx
git commit -m "feat(web): add Card 7 — Dashboard tour + first goal"
```

---

## Task 16: Build Card 8 — AI Companion

**Files:**
- Create: `apps/web/src/components/onboarding/cards/ai-mentor-card.tsx`

**Step 1: Build the component**

Progressive reveal of 3 blocks (insights → mentor evolution → grows with you). Visual: Life Orb with pulsing animation (import from `apps/web/src/components/dashboard/life-orb.tsx`). CTA "Start my journey" calls `onComplete`.

**Step 2: Run type-check, commit**

```bash
git add apps/web/src/components/onboarding/cards/ai-mentor-card.tsx
git commit -m "feat(web): add Card 8 — AI Companion intro"
```

---

## Task 17: Build OnboardingFlow Orchestrator

**Files:**
- Create: `apps/web/src/components/onboarding/onboarding-flow.tsx`

**Step 1: Build the orchestrator component**

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import WelcomeCard from './cards/welcome-card';
import ExpectationsCard from './cards/expectations-card';
import DataImportCard from './cards/data-import-card';
import ProfilingWizard from './profiling-wizard';
import CheckInIntroCard from './cards/checkin-intro-card';
import StreaksCard from './cards/streaks-card';
import ConnectAppsCard from './cards/connect-apps-card';
import DashboardTourCard from './cards/dashboard-tour-card';
import AIMentorCard from './cards/ai-mentor-card';

export default function OnboardingFlow() {
  const router = useRouter();
  const [currentCard, setCurrentCard] = useState(1);
  const [loading, setLoading] = useState(true);

  // Restore position from API or localStorage
  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Guest: restore from localStorage
        const saved = localStorage.getItem('opt-in-onboarding-card');
        if (saved) setCurrentCard(Number(saved));
        setLoading(false);
        return;
      }

      const res = await fetch('/api/onboarding/status');
      const data = await res.json();

      if (data.status === 'completed') {
        router.push('/dashboard');
        return;
      }

      if (data.current_card) setCurrentCard(data.current_card);
      setLoading(false);
    }
    init();
  }, [router]);

  const advanceCard = useCallback(async () => {
    const next = currentCard + 1;
    setCurrentCard(next);

    // Persist
    localStorage.setItem('opt-in-onboarding-card', String(next));
    await fetch('/api/onboarding/card', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_card: next }),
    }).catch(() => {}); // Non-blocking
  }, [currentCard]);

  const handleComplete = useCallback(async () => {
    await fetch('/api/onboarding/complete', { method: 'POST' }).catch(() => {});
    router.push('/dashboard');
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-pulse text-stone-400">Loading...</div>
      </div>
    );
  }

  // Card transition wrapper
  return (
    <div className="relative overflow-hidden">
      {currentCard === 1 && <WelcomeCard onNext={advanceCard} />}
      {currentCard === 2 && <ExpectationsCard onNext={advanceCard} />}
      {currentCard === 3 && <DataImportCard onNext={advanceCard} />}
      {currentCard === 4 && (
        <ProfilingWizard
          embedded
          onComplete={() => advanceCard()}
        />
      )}
      {currentCard === 5 && <CheckInIntroCard onNext={advanceCard} />}
      {currentCard === 6 && <StreaksCard onNext={advanceCard} />}
      {currentCard === 7 && <ConnectAppsCard onNext={advanceCard} />}
      {currentCard === 8 && <DashboardTourCard onNext={advanceCard} />}
      {currentCard === 9 && <AIMentorCard onComplete={handleComplete} />}
    </div>
  );
}
```

Note: Cards 3 (data import) and 4 (profiling) are separate — data import is Card 3, profiling wizard is Card 4, so the total rendered steps become 9 (with Card 3 split into import + profiling). Alternatively, merge data import into the profiling card's intro screen. Adjust numbering as needed during implementation.

**Step 2: Run type-check**

Run: `cd /c/Users/Aaron/repos/life_design && pnpm turbo type-check --filter=web`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/src/components/onboarding/onboarding-flow.tsx
git commit -m "feat(web): add OnboardingFlow orchestrator"
```

---

## Task 18: Wire OnboardingFlow into the Onboarding Page

**Files:**
- Modify: `apps/web/src/app/(protected)/onboarding/page.tsx`

**Step 1: Replace ProfilingWizard with OnboardingFlow**

```typescript
'use client';

import OnboardingFlow from '@/components/onboarding/onboarding-flow';

export default function OnboardingPage() {
  return <OnboardingFlow />;
}
```

**Step 2: Run full test suite**

Run: `cd /c/Users/Aaron/repos/life_design && pnpm turbo test`
Expected: PASS (some profiling wizard tests may need updating to account for embedded mode)

**Step 3: Commit**

```bash
git add apps/web/src/app/\(protected\)/onboarding/page.tsx
git commit -m "feat(web): wire OnboardingFlow into onboarding page"
```

---

## Task 19: Update Brand References — Life Design → Opt In

**Files:**
- Modify: Multiple files across the codebase (grep for "Life Design" and "life-design" in user-facing strings)

**Step 1: Find all user-facing brand references**

Run: `grep -ri "life design" apps/web/src/ --include="*.tsx" --include="*.ts" -l`

Update display names, page titles, meta tags, and copy. Do NOT rename package names, directory names, or technical identifiers — only user-facing strings.

**Step 2: Commit**

```bash
git commit -m "chore: update user-facing brand from Life Design to Opt In"
```

---

## Task 20: Add Card Transition Animations

**Files:**
- Modify: `apps/web/src/components/onboarding/onboarding-flow.tsx`
- Modify: `apps/web/src/app/globals.css` (or a new CSS module)

**Step 1: Add CSS transitions**

Add slide-in/slide-out transitions for card changes using CSS `translateX` with a spring-like cubic bezier. Wrap each card in a `<div>` with transition classes controlled by card state.

```css
.card-enter {
  transform: translateX(100%);
  opacity: 0;
}
.card-enter-active {
  transform: translateX(0);
  opacity: 1;
  transition: transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms ease;
}
.card-exit {
  transform: translateX(0);
  opacity: 1;
}
.card-exit-active {
  transform: translateX(-100%);
  opacity: 0;
  transition: transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms ease;
}
```

**Step 2: Add top progress indicator**

A thin progress bar at the very top showing overall card progress (1/9). Separate from the profiling wizard's internal progress bar.

**Step 3: Commit**

```bash
git commit -m "feat(web): add card transition animations and progress indicator"
```

---

## Task 21: End-to-End Smoke Test

**Files:**
- Modify: `e2e/` (if Playwright tests exist)

**Step 1: Manual smoke test**

Run: `cd /c/Users/Aaron/repos/life_design && pnpm dev --filter=web`

Test the full flow:
1. Sign up or log in as a new user (or clear onboarding state)
2. Verify Card 1 (Welcome) renders with Opt In branding
3. Advance to Card 2 (Expectations)
4. Advance to Card 3 (Data Import) — verify OAuth buttons work or skip
5. Advance to Card 4 (Profiling) — answer a few questions, verify progress saves
6. Complete profiling, advance to Card 5 (Check-in) — do first check-in with 1-10 segment
7. Advance to Card 6 (Streaks) — add a custom streak
8. Advance to Card 7 (Connect Apps) — skip or connect
9. Advance to Card 8 (Dashboard Tour) — set a goal or skip
10. Advance to Card 9 (AI Mentor) — click "Start my journey"
11. Verify redirect to `/dashboard`
12. Close browser, reopen — verify onboarding doesn't replay

**Step 2: Fix any issues found**

**Step 3: Final commit**

```bash
git commit -m "test: verify onboarding flow end-to-end"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Add `baseline` section type | `packages/core/src/profiling/types.ts` |
| 2 | Add baseline psychometric types | `packages/core/src/profiling/psychometric-types.ts` |
| 3 | Add baseline instrument definitions | `packages/core/src/profiling/instruments.ts` |
| 4 | Add baseline scoring functions + tests | `packages/core/src/profiling/psychometric-scoring.ts` |
| 5 | Add baseline questions to web schema | `apps/web/src/lib/profiling/question-schema.ts` |
| 6 | DB migration — card tracking | `supabase/migrations/00024_onboarding_card_tracking.sql` |
| 7 | Update onboarding API routes | `apps/web/src/app/api/onboarding/` |
| 8 | Card 1 — Welcome & Privacy | `apps/web/src/components/onboarding/cards/welcome-card.tsx` |
| 9 | Card 2 — Expectations | `apps/web/src/components/onboarding/cards/expectations-card.tsx` |
| 10 | Card 3 — Data Import | `apps/web/src/components/onboarding/cards/data-import-card.tsx` |
| 11 | Refactor ProfilingWizard | `apps/web/src/components/onboarding/profiling-wizard.tsx` |
| 12 | Card 4 — Check-in intro | `apps/web/src/components/onboarding/cards/checkin-intro-card.tsx` |
| 13 | Card 5 — Streaks | `apps/web/src/components/onboarding/cards/streaks-card.tsx` + migration |
| 14 | Card 6 — Connect Apps | `apps/web/src/components/onboarding/cards/connect-apps-card.tsx` |
| 15 | Card 7 — Dashboard Tour + Goal | `apps/web/src/components/onboarding/cards/dashboard-tour-card.tsx` |
| 16 | Card 8 — AI Companion | `apps/web/src/components/onboarding/cards/ai-mentor-card.tsx` |
| 17 | OnboardingFlow orchestrator | `apps/web/src/components/onboarding/onboarding-flow.tsx` |
| 18 | Wire into onboarding page | `apps/web/src/app/(protected)/onboarding/page.tsx` |
| 19 | Brand rename (user-facing) | Multiple files |
| 20 | Card transitions + progress bar | CSS + orchestrator |
| 21 | E2E smoke test | Manual + e2e/ |
