# ML/AI Systems Integration — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire all existing ML/AI engines and UI components together, build the missing AnalysisPipeline orchestrator and LifeDesignProvider, refactor ai-local to single-model, add challenge routes and navigation, and verify the full integrated experience.

**Architecture:** The app already has BadgeSystem, ChallengeEngine, NudgeScheduler, InsightGenerator, DigestGenerator, SmartJournalPrompt, DashboardInsightsFeed, and the ai-local package built. This plan connects them via a new AnalysisPipeline orchestrator exposed through a React context LifeDesignProvider, wires the pre-built UI components into their pages, adds missing routes and navigation, and refactors ai-local from 3 models to 1.

**Tech Stack:** Next.js 14 (App Router), Dexie (IndexedDB), Transformers.js, Recharts, Vitest, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-16-ml-ai-integration-design.md`

**Spec deviations (intentional):**
- The spec proposes `BadgeSystem.checkAndAwardBadges(context: BadgeContext)` with a rich `BadgeContext` interface. The actual codebase already has a working `BadgeSystem.checkAfterCheckIn(checkIn: DBCheckIn)` API. We use the **existing** API rather than rewriting it. The existing badge definitions and awarding logic are sufficient.
- The spec proposes `DBChallenge` / `DBChallengeProgress` tables. The codebase already has `DBActiveChallenge` with a simpler `taskCompletion: Record<string, boolean>` approach. We use the existing schema.
- The spec proposes a richer `DBBadge` with `key`, `title`, `emoji`, `seen` fields. The codebase uses `{ badgeId, earnedAt, context? }` with definitions in `badge-definitions.ts`. We use the existing pattern.

---

## Existing Infrastructure (already built — do NOT recreate)

| Module | Location | Status |
|--------|----------|--------|
| BadgeSystem | `src/lib/achievements/badge-system.ts` | Working, tested |
| BadgeDefinitions | `src/lib/achievements/badge-definitions.ts` | Working |
| BadgeUnlockModal | `src/components/achievements/BadgeUnlockModal.tsx` | Working |
| BadgeGrid | `src/components/achievements/BadgeGrid.tsx` | Working |
| ChallengeEngine | `src/lib/challenges/challenge-engine.ts` | Working, tested |
| ChallengeLibrary | `src/lib/challenges/challenge-library.ts` | Working (10+ challenges) |
| NudgeScheduler | `src/lib/nudge/nudge-scheduler.ts` | Working, tested |
| InsightGenerator | `src/lib/insights/insight-generator.ts` | Working |
| DigestGenerator | `src/lib/digest/digest-generator.ts` | Working, tested |
| WeeklyDigestView | `src/components/digest/WeeklyDigestView.tsx` | Working |
| DashboardInsightsFeed | `src/components/dashboard/DashboardInsightsFeed.tsx` | Working |
| NudgeCard | `src/components/nudge/NudgeCard.tsx` | Working |
| SmartJournalPrompt | `src/components/check-in/SmartJournalPrompt.tsx` | Working |
| IntegrationsPanel | `src/components/settings/IntegrationsPanel.tsx` | Working |
| VoiceCheckin | `src/components/checkin/voice-checkin.tsx` | Working |
| AILocalClient | `packages/ai-local/src/index.ts` | Working (3-model) |
| DB Schema v2 | `src/lib/db/schema.ts` | Working (badges + activeChallenges tables) |

---

## Chunk 1: ai-local Single-Model Refactor

### Task 1: Refactor models.ts to single embedding model

**Files:**
- Modify: `packages/ai-local/src/models.ts`

- [ ] **Step 1: Remove classification and summarization models from MODEL_REGISTRY**

```ts
// packages/ai-local/src/models.ts — Replace MODEL_REGISTRY (lines 14-27) with:
export const MODEL_REGISTRY: Record<ModelTask, ModelConfig> = {
  embedding: {
    modelId: 'Xenova/all-MiniLM-L6-v2',
    sizeMB: 23,
  },
};

// Also update ModelTask type:
export type ModelTask = 'embedding';
```

- [ ] **Step 2: Run type check**

Run: `cd apps/web && pnpm tsc --noEmit 2>&1 | head -30`
Expected: Errors in classify.ts and summarize.ts referencing `MODEL_REGISTRY.classification` and `MODEL_REGISTRY.summarization` — this is expected, we fix those next.

---

### Task 2: Rewrite classify.ts to use cosine-similarity classification

**Files:**
- Modify: `packages/ai-local/src/classify.ts`
- Reference: `packages/ai-local/src/embed.ts` (for `embed` function)
- Reference: `packages/ai-local/src/similarity.ts` (for `cosineSimilarity`)

- [ ] **Step 1: Replace classify.ts with embedding-based classification**

Replace the entire file. The new implementation:
1. Removes `@huggingface/transformers` zero-shot pipeline import
2. Uses `embed` from `./embed` and `cosineSimilarity` from `./similarity`
3. Pre-computes dimension label embeddings (lazy, cached in module scope)
4. All existing exported functions (`classifyDimension`, `classifyGoal`, `classifyJournalEntry`, `detectMoodFromText`) keep their signatures but use cosine similarity instead of NLI

Key implementation details:
- `DIMENSION_DESCRIPTIONS` maps each dimension to a rich text description (e.g., `"career: professional work, job satisfaction, career growth, workplace fulfillment"`)
- `getDimensionEmbeddings()` lazily computes and caches embeddings for all 8 descriptions
- `classifyDimension(text)` embeds the text, computes cosine similarity against all 8 dimension embeddings, normalizes to sum=1
- `classifyGoal(text)` uses same approach, threshold at 0.15
- `classifyJournalEntry(text)` uses dimension classification + simple keyword-based sentiment (positive/negative word lists) instead of NLI
- `detectMoodFromText(text)` uses keyword-based sentiment mapping to 1-10 scale

- [ ] **Step 2: Run type check on ai-local package**

Run: `cd packages/ai-local && pnpm tsc --noEmit 2>&1 | head -20`
Expected: Errors only in summarize.ts now (classify.ts should be clean)

---

### Task 3: Rewrite summarize.ts to use extractive summarization

**Files:**
- Modify: `packages/ai-local/src/summarize.ts`

- [ ] **Step 1: Replace summarize.ts with extraction-based summarization**

Replace the entire file. The new implementation:
1. Removes `@huggingface/transformers` summarization pipeline import
2. Uses `embed`, `embedBatch` from `./embed` and `cosineSimilarity` from `./similarity`
3. `summarize(text, maxLength)`: splits into sentences, embeds each + full text centroid, ranks by cosine similarity, returns top N sentences up to maxLength chars
4. `generateJournalPreview(text)`: short text returns as-is, long text uses summarize with maxLength=120
5. `summarizeWeeklyJournals(journals)`: concatenates, then runs extractive summarization with maxLength=300

Sentence splitting: `text.match(/[^.!?]+[.!?]+/g)` with fallback to full text as single sentence.

- [ ] **Step 2: Run type check**

Run: `cd packages/ai-local && pnpm tsc --noEmit`
Expected: PASS — no type errors

---

### Task 4: Update worker.ts to route through embedding pipeline

**Files:**
- Modify: `packages/ai-local/src/worker.ts`

- [ ] **Step 1: Update worker imports**

The worker already imports from `./classify` and `./summarize` — since we kept the same function signatures, the worker should work without changes. Verify:

Run: `cd packages/ai-local && pnpm tsc --noEmit`
Expected: PASS

- [ ] **Step 2: Commit ai-local refactor**

```bash
git add packages/ai-local/src/models.ts packages/ai-local/src/classify.ts packages/ai-local/src/summarize.ts
git commit -m "refactor(ai-local): single-model approach using only embedding model

Replace NLI classification and abstractive summarization with
cosine-similarity-based alternatives. Reduces model download from
~158MB to ~23MB while keeping the same API surface."
```

---

### Task 5: Add tests for new classify and summarize implementations

**Files:**
- Create: `packages/ai-local/src/__tests__/classify.test.ts`
- Create: `packages/ai-local/src/__tests__/summarize.test.ts`

- [ ] **Step 1: Write classify tests**

Test with mocked `embed` function (vi.mock('./embed')). Verify:
- Empty text returns uniform scores
- Non-empty text returns Record<DimensionLabel, number> with scores summing to ~1
- `classifyGoal` filters dimensions below 0.15 threshold
- `detectMoodFromText` returns 1-10 range

- [ ] **Step 2: Write summarize tests**

Test with mocked `embed`/`embedBatch`/`cosineSimilarity`. Verify:
- Empty text returns empty string
- Short text (<100 chars) returns unchanged in `generateJournalPreview`
- Multi-sentence text returns subset of sentences
- `summarizeWeeklyJournals` handles empty array

- [ ] **Step 3: Run tests**

Run: `cd packages/ai-local && pnpm vitest run`
Expected: All tests pass

- [ ] **Step 4: Commit tests**

```bash
git add packages/ai-local/src/__tests__/
git commit -m "test(ai-local): add tests for cosine-similarity classify and extractive summarize"
```

---

## Chunk 2: Schema, AnalysisPipeline, LifeDesignProvider, Seed Data

### Task 5b: Extend DBCheckIn with embedding field

**Files:**
- Modify: `apps/web/src/lib/db/schema.ts`

- [ ] **Step 1: Add `embedding` field to DBCheckIn interface**

In `schema.ts`, add to the `DBCheckIn` interface (after `tags: string[]`):
```ts
embedding?: number[]; // Float32Array serialized for Dexie storage (384 dims from MiniLM)
```

- [ ] **Step 2: Add Dexie version 3 migration**

After the existing `this.version(2).stores({...})` block, add:
```ts
// Version 3: Add embedding field to checkIns (no index change needed — stored inline)
this.version(3).stores({});
// No stores change needed — embedding is optional and not indexed.
// Dexie handles new optional fields on existing records automatically.
```

- [ ] **Step 3: Type check**

Run: `cd apps/web && pnpm tsc --noEmit 2>&1 | head -10`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/db/schema.ts
git commit -m "feat(db): add embedding field to DBCheckIn, bump schema to v3"
```

---

### Task 6: Create AnalysisPipeline class

**Files:**
- Create: `apps/web/src/lib/analysis/analysis-pipeline.ts`
- Test: `apps/web/src/lib/__tests__/analysis-pipeline.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// apps/web/src/lib/__tests__/analysis-pipeline.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { LifeDesignDB } from '@/lib/db/schema';
import { AnalysisPipeline } from '@/lib/analysis/analysis-pipeline';
import { Dimension } from '@life-design/core';

describe('AnalysisPipeline', () => {
  let db: LifeDesignDB;
  let pipeline: AnalysisPipeline;

  beforeEach(() => {
    db = new LifeDesignDB();
    pipeline = new AnalysisPipeline(db);
  });

  afterEach(async () => { await db.delete(); });

  it('runIncrementalAnalysis returns summary with insights', async () => {
    // Seed 15 check-ins to trigger correlation computation
    for (let i = 14; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      await db.checkIns.add({
        date: d.toISOString().slice(0, 10),
        mood: 5 + Math.round(Math.random() * 3),
        dimensionScores: { [Dimension.Career]: 6, [Dimension.Health]: 7 },
        tags: [],
        createdAt: d,
      });
    }

    const latest = (await db.checkIns.orderBy('date').last())!;
    const result = await pipeline.runIncrementalAnalysis(latest);

    expect(result).toHaveProperty('newInsights');
    expect(result).toHaveProperty('newCorrelations');
    expect(result).toHaveProperty('newBadges');
    expect(result).toHaveProperty('embeddingStored');
    expect(Array.isArray(result.newInsights)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm vitest run src/lib/__tests__/analysis-pipeline.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement AnalysisPipeline**

```ts
// apps/web/src/lib/analysis/analysis-pipeline.ts
import { computeAllPairCorrelations } from '@life-design/core';
import type { LifeDesignDB, DBCheckIn } from '@/lib/db/schema';
import { InsightGenerator, type Insight } from '@/lib/insights/insight-generator';
import type { AILocalClient } from '@life-design/ai-local';
import type { BadgeSystem } from '@/lib/achievements/badge-system';

export interface AnalysisSummary {
  insightCount: number;
  correlationCount: number;
  badgeCount: number;
  lastAnalysisAt: Date;
}

export class AnalysisPipeline {
  private insightGenerator: InsightGenerator;

  constructor(
    private db: LifeDesignDB,
    private aiLocal?: AILocalClient,
    private badgeSystem?: BadgeSystem,
  ) {
    this.insightGenerator = new InsightGenerator(db);
  }

  async runIncrementalAnalysis(checkIn: DBCheckIn): Promise<{
    newInsights: Insight[];
    newCorrelations: number;
    newBadges: string[];
    embeddingStored: boolean;
  }> {
    // 1. Generate insights
    const newInsights = await this.insightGenerator.generateDashboardInsights();

    // 2. Correlations (if 14+ check-ins)
    let newCorrelations = 0;
    const checkInCount = await this.db.checkIns.count();
    if (checkInCount >= 14) {
      const allCheckIns = await this.db.checkIns.orderBy('date').toArray();
      // Convert DBCheckIn[] to the format computeAllPairCorrelations expects:
      // Array of { dimensionScores: Record<Dimension, number> }
      const pairs = computeAllPairCorrelations(
        allCheckIns.map(ci => ci.dimensionScores)
      );
      // Clear old correlations and store fresh ones
      const existingCount = await this.db.correlations.count();
      await this.db.correlations.clear();
      await this.db.correlations.bulkAdd(
        pairs
          .filter(p => Math.abs(p.coefficient) >= 0.3) // only meaningful correlations
          .map(p => ({
            dimension1: p.dimensionA,
            dimension2: p.dimensionB,
            strength: p.coefficient,
            description: `${p.dimensionA} and ${p.dimensionB} are ${p.coefficient > 0 ? 'positively' : 'negatively'} correlated`,
            sampleSize: allCheckIns.length,
            calculatedAt: new Date(),
          }))
      );
      const newCount = await this.db.correlations.count();
      newCorrelations = Math.max(0, newCount - existingCount);
    }

    // 3. Embedding (if AI ready)
    let embeddingStored = false;
    if (this.aiLocal && checkIn.journal) {
      try {
        const embedding = await this.aiLocal.embed(checkIn.journal);
        await this.db.checkIns.update(checkIn.id!, {
          embedding: Array.from(embedding),
        });
        embeddingStored = true;
      } catch { /* AI not ready, skip */ }
    }

    // 4. Badges
    const newBadges: string[] = [];
    if (this.badgeSystem) {
      const earned = await this.badgeSystem.checkAfterCheckIn(checkIn);
      newBadges.push(...earned.map(b => b.key)); // BadgeDefinition uses 'key', not 'id'
    }

    return { newInsights, newCorrelations, newBadges, embeddingStored };
  }

  async runFullReanalysis(): Promise<void> {
    const allCheckIns = await this.db.checkIns.orderBy('date').toArray();
    if (allCheckIns.length < 2) return;

    // Recompute all correlations
    if (allCheckIns.length >= 14) {
      const pairs = computeAllPairCorrelations(
        allCheckIns.map(ci => ci.dimensionScores)
      );
      await this.db.correlations.clear();
      await this.db.correlations.bulkAdd(
        pairs
          .filter(p => Math.abs(p.coefficient) >= 0.3)
          .map(p => ({
            dimension1: p.dimensionA,
            dimension2: p.dimensionB,
            strength: p.coefficient,
            description: `${p.dimensionA} and ${p.dimensionB} are ${p.coefficient > 0 ? 'positively' : 'negatively'} correlated`,
            sampleSize: allCheckIns.length,
            calculatedAt: new Date(),
          }))
      );
    }

    // Regenerate insights
    await this.insightGenerator.generateDashboardInsights();

    // Recompute embeddings for check-ins with journals (if AI available)
    if (this.aiLocal) {
      for (const ci of allCheckIns) {
        if (ci.journal && !ci.embedding) {
          try {
            const embedding = await this.aiLocal.embed(ci.journal);
            await this.db.checkIns.update(ci.id!, { embedding: Array.from(embedding) });
          } catch { break; } // stop if AI fails
        }
      }
    }
  }

  async getLatestAnalysis(): Promise<AnalysisSummary> {
    const [insightCount, correlationCount, badgeCount] = await Promise.all([
      this.db.insights.count(),
      this.db.correlations.count(),
      this.db.badges.count(),
    ]);
    return {
      insightCount, correlationCount, badgeCount,
      lastAnalysisAt: new Date(),
    };
  }
}
```

**Note:** `computeAllPairCorrelations` from `@life-design/core` expects an array of dimension score maps. Check its actual signature in `packages/core/src/correlation.ts` and adapt the mapping if needed.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm vitest run src/lib/__tests__/analysis-pipeline.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/analysis/ apps/web/src/lib/__tests__/analysis-pipeline.test.ts
git commit -m "feat: add AnalysisPipeline orchestrator for post-check-in analysis"
```

---

### Task 7: Create LifeDesignProvider + hooks

**Files:**
- Create: `apps/web/src/providers/LifeDesignProvider.tsx`
- Modify: `apps/web/src/components/app-providers.tsx`

- [ ] **Step 1: Create LifeDesignProvider**

```tsx
// apps/web/src/providers/LifeDesignProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
import { db } from '@/lib/db';
import type { LifeDesignDB } from '@/lib/db/schema';
import { AnalysisPipeline } from '@/lib/analysis/analysis-pipeline';
import { NudgeScheduler } from '@/lib/nudge/nudge-scheduler';
import { ChallengeEngine } from '@/lib/challenges/challenge-engine';
import { BadgeSystem } from '@/lib/achievements/badge-system';
import { AILocalClient, type AILocalProgress } from '@life-design/ai-local';

interface LifeDesignContextValue {
  db: LifeDesignDB;
  analysisPipeline: AnalysisPipeline;
  nudgeScheduler: NudgeScheduler;
  challengeEngine: ChallengeEngine;
  badgeSystem: BadgeSystem;
  aiLocal: AILocalClient;
  aiReady: boolean;
  aiProgress: number;
}

const LifeDesignContext = createContext<LifeDesignContextValue | null>(null);

export function LifeDesignProvider({ children }: { children: ReactNode }) {
  const [aiReady, setAiReady] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);

  const handleProgress = useCallback((p: AILocalProgress) => {
    if (p.progress !== undefined) setAiProgress(p.progress);
    if (p.status === 'ready') setAiReady(true);
  }, []);

  const [value] = useState<Omit<LifeDesignContextValue, 'aiReady' | 'aiProgress'>>(() => {
    const badgeSystem = new BadgeSystem(db);
    const challengeEngine = new ChallengeEngine(db);
    const nudgeScheduler = new NudgeScheduler(db);
    const aiLocal = new AILocalClient({ onProgress: handleProgress });
    const analysisPipeline = new AnalysisPipeline(db, aiLocal, badgeSystem);
    return { db, analysisPipeline, nudgeScheduler, challengeEngine, badgeSystem, aiLocal };
  });

  // Start nudge scheduler on mount + preload AI model (non-blocking)
  const startedRef = useRef(false);
  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      value.nudgeScheduler.start();
      // Non-blocking AI model preload: call embed with empty text to trigger model download
      value.aiLocal.embed('').then(() => setAiReady(true)).catch(() => {});
    }
    return () => {
      value.nudgeScheduler.stop();
      value.aiLocal.dispose();
    };
  }, [value]);

  const contextValue: LifeDesignContextValue = { ...value, aiReady, aiProgress };

  return (
    <LifeDesignContext.Provider value={contextValue}>
      {children}
    </LifeDesignContext.Provider>
  );
}

// Hooks
export function useAnalysisPipeline(): AnalysisPipeline {
  const ctx = useContext(LifeDesignContext);
  if (!ctx) throw new Error('useAnalysisPipeline must be inside LifeDesignProvider');
  return ctx.analysisPipeline;
}

export function useNudges(): NudgeScheduler {
  const ctx = useContext(LifeDesignContext);
  if (!ctx) throw new Error('useNudges must be inside LifeDesignProvider');
  return ctx.nudgeScheduler;
}

export function useChallenges(): ChallengeEngine {
  const ctx = useContext(LifeDesignContext);
  if (!ctx) throw new Error('useChallenges must be inside LifeDesignProvider');
  return ctx.challengeEngine;
}

export function useBadges(): BadgeSystem {
  const ctx = useContext(LifeDesignContext);
  if (!ctx) throw new Error('useBadges must be inside LifeDesignProvider');
  return ctx.badgeSystem;
}

export function useAIStatus(): { ready: boolean; progress: number } {
  const ctx = useContext(LifeDesignContext);
  if (!ctx) throw new Error('useAIStatus must be inside LifeDesignProvider');
  return { ready: ctx.aiReady, progress: ctx.aiProgress };
}
```

- [ ] **Step 2: Wire into app-providers.tsx**

Add `LifeDesignProvider` inside the existing provider stack in `apps/web/src/components/app-providers.tsx`:

```tsx
import { LifeDesignProvider } from '@/providers/LifeDesignProvider';

// Inside AppProviders, wrap children:
<GuestProvider>
  <LifeDesignProvider>
    <SoundscapeProvider>{children}</SoundscapeProvider>
  </LifeDesignProvider>
</GuestProvider>
```

- [ ] **Step 3: Type check**

Run: `cd apps/web && pnpm tsc --noEmit 2>&1 | head -20`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/providers/LifeDesignProvider.tsx apps/web/src/components/app-providers.tsx
git commit -m "feat: add LifeDesignProvider with analysis, nudge, challenge, badge hooks"
```

---

### Task 8: Create seed data utility

**Files:**
- Create: `apps/web/src/lib/db/seed.ts`

- [ ] **Step 1: Implement seedDevelopmentData**

Generate 30 days of check-ins with realistic patterns:
- Fitness/health: gradual upward trend (start ~4, end ~7)
- Career: plateau around 6-7
- Social: dip mid-month (drop to 3-4), then recovery to 6
- Mood: correlated with dimension averages ± noise
- 3 active goals with varying progress
- 5 correlations (career↔finance, health↔fitness, social↔romance, etc.)
- 3 awarded badges (streak-7, dim-health-mastery, balance-harmony)

The function should:
1. Clear existing data first (`db.checkIns.clear()`, etc.)
2. Return `{ checkInCount, goalCount, badgeCount, correlationCount }` summary
3. Be callable from browser console: `await window.__seedData()`

Expose via `window.__seedData = seedDevelopmentData` in dev mode only:
```ts
if (process.env.NODE_ENV === 'development') {
  (window as any).__seedData = seedDevelopmentData;
}
```

**Note:** Do NOT seed embeddings — those require the AI model to be loaded and will be generated on-demand by the AnalysisPipeline.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/db/seed.ts
git commit -m "feat: add seed data utility for development testing"
```

---

## Chunk 3: Dashboard + Check-in Integration

### Task 9: Wire DashboardInsightsFeed, WeeklyDigest modal, and live balance into dashboard

**Files:**
- Modify: `apps/web/src/app/(protected)/dashboard/dashboard-client.tsx`
- Reference: `apps/web/src/components/dashboard/DashboardInsightsFeed.tsx`
- Reference: `apps/web/src/components/digest/WeeklyDigestView.tsx`

- [ ] **Step 1: Import DashboardInsightsFeed, WeeklyDigestView, and hooks**

```tsx
import DashboardInsightsFeed from '@/components/dashboard/DashboardInsightsFeed';
import WeeklyDigestView from '@/components/digest/WeeklyDigestView';
import type { StoredDigest } from '@/lib/digest/digest-generator';
import { useNudges } from '@/providers/LifeDesignProvider';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
```

- [ ] **Step 2: Add nudge, digest, and badge state + live queries**

```tsx
// Inside DashboardClient component:
const nudgeScheduler = useNudges();
const [activeNudge, setActiveNudge] = useState<{ id: string; title: string; body: string; type: string } | null>(null);
const [showDigest, setShowDigest] = useState(false);

// Live query for latest digest from Dexie
const latestDigest = useLiveQuery(() =>
  db.digests?.orderBy('generatedAt').reverse().first()
) as StoredDigest | undefined;

// Live query for unseen badge count
const unseenBadgeCount = useLiveQuery(async () => {
  const all = await db.badges.toArray();
  return all.filter(b => !b.context?.includes('seen')).length;
}) ?? 0;

// Live query for dimension scores from most recent check-in (replaces static server data)
const liveLatestCheckIn = useLiveQuery(() =>
  db.checkIns.orderBy('date').reverse().first()
);
```

- [ ] **Step 3: Replace inline insights section with DashboardInsightsFeed**

Replace the "AI Insights" section (the `<div className="lg:col-span-3 space-y-4">` block) with:
```tsx
<div className="lg:col-span-3 space-y-4">
  <DashboardInsightsFeed
    insights={insights.map(i => ({
      id: String(i.id ?? i.headline),
      type: 'suggestion' as const,
      title: i.headline,
      body: i.body,
      dimension: i.dimension ?? null,
    }))}
    activeNudge={activeNudge}
    latestDigest={latestDigest ?? undefined}
    onDismissInsight={(id) => { /* mark dismissed in Dexie */ }}
    onDismissNudge={() => setActiveNudge(null)}
    onTalkToMentor={() => { /* router.push('/mentor') */ }}
    onViewDigest={() => setShowDigest(true)}
  />
</div>
```

- [ ] **Step 4: Add badge notification indicator in header**

Add a small badge count indicator next to the greeting. If `unseenBadgeCount > 0`, render:
```tsx
{unseenBadgeCount > 0 && (
  <Link href="/achievements" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FEF7F0] text-[#D4864A] text-xs font-medium">
    <TrophyIcon className="w-3.5 h-3.5" />
    {unseenBadgeCount} new
  </Link>
)}
```

Add TrophyIcon inline SVG (copy from `protected-layout-client.tsx`).

- [ ] **Step 5: Add WeeklyDigest modal**

At the bottom of the component, add:
```tsx
{showDigest && latestDigest && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="max-w-lg w-full max-h-[90vh] overflow-y-auto m-4 rounded-2xl bg-white shadow-xl">
      <WeeklyDigestView
        digest={latestDigest}
        onClose={() => setShowDigest(false)}
      />
    </div>
  </div>
)}
```

- [ ] **Step 6: Type check and verify**

Run: `cd apps/web && pnpm tsc --noEmit 2>&1 | head -20`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/\(protected\)/dashboard/dashboard-client.tsx
git commit -m "feat(dashboard): wire DashboardInsightsFeed, WeeklyDigest modal, nudge card, badge indicator"
```

---

### Task 10: Wire SmartJournalPrompt + analysis pipeline into check-in

**Files:**
- Modify: `apps/web/src/app/(protected)/checkin/checkin-client.tsx`
- Reference: `apps/web/src/components/check-in/SmartJournalPrompt.tsx`

- [ ] **Step 1: Add SmartJournalPrompt step between dimensions and reflection**

Current flow: step 0=mood, steps 1-8=dimensions, step 9=reflection, step 10=complete.
New flow: step 0=mood, steps 1-8=dimensions, **step 9=SmartJournalPrompt**, step 10=reflection, step 11=complete.

Update `totalSteps` to 11. Import SmartJournalPrompt.

Generate the prompt based on dimension scores just entered using `generateJournalPrompts` from `@/lib/smart-prompts` (check if this exists and what it exports).

- [ ] **Step 2: Wire AnalysisPipeline into submitCheckin**

After the existing Dexie write and badge check in `submitCheckin()`, add:

```ts
import { useAnalysisPipeline } from '@/providers/LifeDesignProvider';

// Inside component:
const analysisPipeline = useAnalysisPipeline();

// In submitCheckin, after db.checkIns.add:
const analysisResult = await analysisPipeline.runIncrementalAnalysis(dexieCheckIn as DBCheckIn);
```

The existing badge check can be removed since AnalysisPipeline handles it internally.

- [ ] **Step 3: Add voice check-in microphone button on mood step**

Import the existing VoiceCheckin component:
```tsx
import VoiceCheckin from '@/components/checkin/voice-checkin';
```

Add a `[showVoice, setShowVoice]` state. On the mood step (step 0), add a microphone button below the mood options:
```tsx
{/* Voice check-in option */}
<div className="mt-4 pt-4 border-t border-[#E8E4DD]/40">
  <button
    onClick={() => setShowVoice(!showVoice)}
    className="flex items-center gap-2 text-sm text-[#7D756A] hover:text-[#5A7F5A] transition-colors"
  >
    <MicIcon className="w-4 h-4" />
    {showVoice ? 'Hide voice check-in' : 'Or use voice check-in'}
  </button>
  {showVoice && (
    <div className="mt-3">
      <VoiceCheckin />
    </div>
  )}
</div>
```

Add MicIcon inline SVG (same pattern as other icons in the file).

The existing `VoiceCheckin` component (`src/components/checkin/voice-checkin.tsx`) handles recording, transcription, and analysis. It imports from `@life-design/ai`.

**Verification:** Before adding VoiceCheckin, run `grep -n "@life-design/ai" src/components/checkin/voice-checkin.tsx` to confirm the import path. If `@life-design/ai` doesn't resolve (package may not exist), update the import to use `@life-design/ai-local` or make VoiceCheckin self-contained.

- [ ] **Step 4: Type check**

Run: `cd apps/web && pnpm tsc --noEmit 2>&1 | head -20`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(protected\)/checkin/checkin-client.tsx
git commit -m "feat(checkin): add SmartJournalPrompt step, voice check-in, and wire AnalysisPipeline"
```

---

## Chunk 4: Goals, Settings, Navigation, Routes

### Task 11: Wire momentum indicators and PathwayCard into goals page

**Files:**
- Modify: `apps/web/src/app/(protected)/goals/goals-client.tsx`
- Reference: `packages/core/src/scoring.ts` (`computeTrend`)
- Reference: `apps/web/src/components/goals/pathway-card.tsx` (existing PathwayCard component)

- [ ] **Step 1: Add imports for momentum and PathwayCard**

```tsx
import { computeTrend } from '@life-design/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import PathwayCard from '@/components/goals/pathway-card';
```

- [ ] **Step 2: Add live query for recent check-ins**

```tsx
// Inside GoalsClient component:
const recentCheckIns = useLiveQuery(() =>
  db.checkIns.orderBy('date').reverse().limit(7).toArray()
);
```

- [ ] **Step 3: Add momentum indicator to each goal card**

Create a helper function to compute trend for a dimension:
```tsx
function getMomentum(dimension: string): { slope: number; label: string; color: string } {
  const scores = recentCheckIns
    ?.map(ci => ci.dimensionScores[dimension as Dimension])
    .filter((s): s is number => s !== undefined)
    .reverse() ?? []; // reverse to chronological order
  if (scores.length < 3) return { slope: 0, label: 'New', color: '#A8A198' };
  const slope = computeTrend(scores);
  if (slope > 0.05) return { slope, label: 'Rising', color: '#5A7F5A' };
  if (slope < -0.05) return { slope, label: 'Falling', color: '#D4864A' };
  return { slope, label: 'Stable', color: '#A8A198' };
}
```

In each goal's rendering block, after the category badge, add:
```tsx
{dimension && (() => {
  const momentum = getMomentum(dimension);
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: momentum.color + '15', color: momentum.color }}>
      {momentum.slope > 0.05 ? '\u2191' : momentum.slope < -0.05 ? '\u2193' : '\u2192'} {momentum.label}
    </span>
  );
})()}
```

- [ ] **Step 4: Add timeline risk warning**

For goals with `target_date`, add a warning when >70% through timeline with stalling momentum:
```tsx
{goal.target_date && dimension && (() => {
  const now = new Date();
  const start = new Date(goal.target_date); // approximate — use creation date if available
  const end = new Date(goal.target_date);
  const total = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  const momentum = getMomentum(dimension);
  if (total > 0 && elapsed / total > 0.7 && momentum.slope <= 0) {
    return (
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#D4864A] font-medium">
        <AlertTriangleIcon className="w-3 h-3" /> Timeline risk — momentum stalling
      </div>
    );
  }
  return null;
})()}
```

Add AlertTriangleIcon inline SVG.

- [ ] **Step 5: Add PathwayCard section for goals with pathways**

On the goal detail page (`goals/[goalId]/goal-detail-client.tsx`), if the goal has pathways, render:
```tsx
{goal.pathways && goal.pathways.length > 0 && (
  <div className="space-y-4 mt-6">
    <h3 className="font-['Instrument_Serif'] text-lg text-[#2A2623]">Pathways</h3>
    {goal.pathways.map(pathway => (
      <PathwayCard key={pathway.id} pathway={pathway} />
    ))}
  </div>
)}
```

The existing `PathwayCard` at `src/components/goals/pathway-card.tsx` expects:
```ts
{ id, title, description, ai_generated, dimension_impacts, pathway_steps }
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/\(protected\)/goals/
git commit -m "feat(goals): add momentum indicators, timeline risk warnings, and PathwayCard"
```

---

### Task 12: Add new sections to Settings page

**Files:**
- Modify: `apps/web/src/app/(protected)/settings/settings-client.tsx` (or `page.tsx` — check which has the UI)
- Reference: `apps/web/src/lib/nudge/nudge-scheduler.ts` (`NudgeScheduler`, `DEFAULT_SCHEDULE`)

- [ ] **Step 1: Add imports**

```tsx
import { useNudges, useAIStatus } from '@/providers/LifeDesignProvider';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
```

- [ ] **Step 2: Add Connected Apps section**

```tsx
import IntegrationsPanel from '@/components/settings/IntegrationsPanel';

// Add after existing SectionCards:
<SectionCard title="Connected Apps">
  <IntegrationsPanel />
</SectionCard>
```

- [ ] **Step 3: Add Nudge Schedule section**

```tsx
const nudgeScheduler = useNudges();
const [nudgeTimes, setNudgeTimes] = useState({
  morning: '08:00',
  midday: '13:00',
  evening: '20:00',
});

<SectionCard title="Nudge Schedule">
  <p className="text-xs text-[#A8A198] mb-3">When should we send you gentle reminders?</p>
  {(['morning', 'midday', 'evening'] as const).map(slot => (
    <div key={slot} className="flex items-center justify-between py-2">
      <span className="text-sm font-medium text-[#2A2623] capitalize">{slot}</span>
      <input
        type="time"
        value={nudgeTimes[slot]}
        onChange={(e) => {
          setNudgeTimes(prev => ({ ...prev, [slot]: e.target.value }));
          const [h, m] = e.target.value.split(':').map(Number);
          nudgeScheduler.updateSchedule({ [slot]: { hour: h, minute: m } });
        }}
        className="text-sm font-['DM_Mono'] text-[#5A7F5A] bg-[#F5F3EF] rounded-lg px-3 py-1.5 border border-[#E8E4DD]"
      />
    </div>
  ))}
</SectionCard>
```

- [ ] **Step 4: Add Weekly Digest section**

```tsx
const [digestDay, setDigestDay] = useState('sunday');

<SectionCard title="Weekly Digest">
  <p className="text-xs text-[#A8A198] mb-3">Which day should your weekly digest generate?</p>
  <select
    value={digestDay}
    onChange={(e) => setDigestDay(e.target.value)}
    className="text-sm bg-[#F5F3EF] rounded-lg px-3 py-2 border border-[#E8E4DD] text-[#2A2623]"
  >
    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(d => (
      <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
    ))}
  </select>
</SectionCard>
```

- [ ] **Step 5: Add AI Features section**

```tsx
const { ready: aiReady, progress: aiProgress } = useAIStatus();
const [aiEnabled, setAiEnabled] = useState(true);

<SectionCard title="AI Features">
  <ToggleRow
    label="On-Device AI"
    description="Enable local ML models for offline insights"
    value={aiEnabled}
    onChange={setAiEnabled}
  />
  <Divider />
  <div className="flex items-center justify-between py-1">
    <div>
      <p className="text-sm font-medium text-[#2A2623]">Model Status</p>
      <p className="text-xs text-[#A8A198] mt-0.5">
        {aiReady ? 'Ready (~23MB cached)' : aiProgress > 0 ? `Loading... ${Math.round(aiProgress * 100)}%` : 'Not loaded'}
      </p>
    </div>
    {aiReady && (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F4F7F4] text-[#5A7F5A] font-medium">Active</span>
    )}
  </div>
</SectionCard>
```

- [ ] **Step 6: Add Mentor Memory section**

```tsx
const mentorMemories = useLiveQuery(() => db.mentorMemory?.toArray() ?? []) ?? [];

<SectionCard title="Mentor Memory">
  <p className="text-xs text-[#A8A198] mb-3">Facts your AI mentor has learned about you</p>
  {mentorMemories.length === 0 ? (
    <p className="text-sm text-[#A8A198] italic">No memories yet. Chat with your mentor to build context.</p>
  ) : (
    <div className="space-y-2">
      {mentorMemories.map((mem, i) => (
        <div key={i} className="flex items-center justify-between py-1.5">
          <span className="text-sm text-[#3D3833] truncate flex-1">{mem.fact ?? mem.content ?? String(mem)}</span>
          <button
            onClick={async () => { if (mem.id) await db.mentorMemory?.delete(mem.id); }}
            className="text-[10px] text-[#D4864A] hover:underline ml-2 flex-shrink-0"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  )}
</SectionCard>
```

- [ ] **Step 7: Add Challenge History section**

```tsx
const completedChallenges = useLiveQuery(() =>
  db.activeChallenges.where('status').equals('completed').toArray()
) ?? [];

<SectionCard title="Challenge History">
  {completedChallenges.length === 0 ? (
    <p className="text-sm text-[#A8A198] italic">No completed challenges yet.</p>
  ) : (
    <div className="space-y-2">
      {completedChallenges.map(ch => (
        <div key={ch.id} className="flex items-center justify-between py-1.5">
          <span className="text-sm text-[#3D3833]">{ch.challengeId}</span>
          <span className="text-[10px] text-[#A8A198] font-['DM_Mono']">
            {ch.completedAt ? new Date(ch.completedAt).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' }) : ''}
          </span>
        </div>
      ))}
    </div>
  )}
</SectionCard>
```

- [ ] **Step 8: Type check and commit**

Run: `cd apps/web && pnpm tsc --noEmit 2>&1 | head -20`

```bash
git add apps/web/src/app/\(protected\)/settings/
git commit -m "feat(settings): add nudge schedule, weekly digest, AI features, mentor memory, challenge history"
```

---

### Task 13: Update navigation with new routes

**Files:**
- Modify: `apps/web/src/app/(protected)/protected-layout-client.tsx`

**Note:** The nav currently has: Home, Goals, Check-in, Challenges, Badges (`/achievements`), Settings. All target routes already exist on the filesystem: `/achievements` renders `BadgeGrid`, `/mentor` renders `mentor-client.tsx`, `/simulator` renders the Life Simulator. We're only wiring them into the nav. Final list: Home, Goals, Check-in, Mentor, Simulate, Challenges, Badges, Settings (8 items total).

- [ ] **Step 1: Add ChatIcon and BeakerIcon inline SVGs**

```tsx
function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function BeakerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 3h15M6 3v16a2 2 0 002 2h8a2 2 0 002-2V3" />
      <path d="M6 14h12" />
    </svg>
  );
}
```

- [ ] **Step 2: Update navItems array**

Replace the `navItems` array:
```tsx
const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: HomeIcon },
  { href: '/goals', label: 'Goals', icon: TargetIcon },
  { href: '/checkin', label: 'Check-in', icon: SunIcon },
  { href: '/mentor', label: 'Mentor', icon: ChatIcon },
  { href: '/simulator', label: 'Simulate', icon: BeakerIcon },
  { href: '/challenges', label: 'Challenges', icon: FlameIcon },
  { href: '/achievements', label: 'Badges', icon: TrophyIcon },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
];
```

Desktop sidebar: show all 8 items (already renders all navItems in a `nav` element).

- [ ] **Step 3: Implement mobile "More" drawer for items beyond 5**

```tsx
import { useState } from 'react';

// Split for mobile:
const mobileMainItems = navItems.slice(0, 4); // Home, Goals, Check-in, Mentor
const mobileMoreItems = navItems.slice(4); // Simulate, Challenges, Badges, Settings

const [moreOpen, setMoreOpen] = useState(false);

// In the mobile bottom nav, replace the navItems.map with:
{mobileMainItems.map(item => (
  <Link key={item.href} href={item.href} className={/* same styles */}>
    <item.icon className="w-5 h-5" />
    <span className="text-[10px] font-medium">{item.label}</span>
    {isActive(item.href) && <div className="w-1 h-1 rounded-full bg-[#5A7F5A] mt-0.5" />}
  </Link>
))}

{/* "More" button */}
<button
  onClick={() => setMoreOpen(!moreOpen)}
  className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition-all ${moreOpen ? 'text-[#5A7F5A]' : 'text-[#A8A198]'}`}
>
  <MoreIcon className="w-5 h-5" />
  <span className="text-[10px] font-medium">More</span>
</button>
```

Add MoreIcon (three dots):
```tsx
function MoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
    </svg>
  );
}
```

**Active state for More items:** When on a route that lives in the "More" drawer (e.g. `/achievements`), the More button itself should highlight as active. Add: `const isMoreActive = mobileMoreItems.some(i => isActive(i.href));` and apply active styling to the More button when true.

Add a slide-up sheet:
```tsx
{moreOpen && (
  <>
    <div className="fixed inset-0 z-30 bg-black/20" onClick={() => setMoreOpen(false)} />
    <div className="fixed bottom-[calc(60px+env(safe-area-inset-bottom))] inset-x-0 z-35 bg-white rounded-t-2xl border-t border-[#E8E4DD] shadow-xl p-4 space-y-1">
      {mobileMoreItems.map(item => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMoreOpen(false)}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
            ${isActive(item.href) ? 'bg-[#F4F7F4] text-[#5A7F5A]' : 'text-[#7D756A] hover:bg-[#F5F3EF]'}`}
        >
          <item.icon className="w-5 h-5" />
          {item.label}
        </Link>
      ))}
    </div>
  </>
)}
```

- [ ] **Step 4: Type check**

Run: `cd apps/web && pnpm tsc --noEmit 2>&1 | head -20`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(protected\)/protected-layout-client.tsx
git commit -m "feat(nav): add mentor and simulator to navigation, implement mobile More drawer"
```

---

### Task 14: Verify /challenges routes (already built)

**Files (all already exist):**
- `apps/web/src/app/(protected)/challenges/page.tsx` — renders `<ChallengeLibrary />`
- `apps/web/src/app/(protected)/challenges/[id]/page.tsx` — renders `<ActiveChallengeView activeChallengeId={id} />`
- `apps/web/src/components/challenges/ChallengeLibrary.tsx` — grid of templates + active challenges
- `apps/web/src/components/challenges/ActiveChallengeView.tsx` — progress tracker + task checklist

These routes and components are **fully built**. This task is verification only.

- [ ] **Step 1: Verify ChallengeLibrary renders without errors**

Run: `cd apps/web && pnpm tsc --noEmit 2>&1 | grep -i challenge | head -10`
Expected: No errors in challenge files

- [ ] **Step 2: Verify the ChallengeEngine hook integration**

Confirm `ChallengeLibrary.tsx` uses `ChallengeEngine` from `@/lib/challenges/challenge-engine` and `CHALLENGE_LIBRARY` from `@/lib/challenges/challenge-library`. Confirm `ActiveChallengeView.tsx` uses `getChallengeById` and `ChallengeEngine`.

If either component creates its own `ChallengeEngine(db)` instance instead of using the `useChallenges()` hook from LifeDesignProvider, update to use the hook for consistency:
```tsx
import { useChallenges } from '@/providers/LifeDesignProvider';
const challengeEngine = useChallenges();
```

- [ ] **Step 3: Commit only if changes were made**

```bash
# Only if changes were needed:
git add apps/web/src/components/challenges/
git commit -m "refactor(challenges): use LifeDesignProvider hook instead of inline ChallengeEngine"
```

---

### Task 15: Register service worker

**Files:**
- Modify: `apps/web/src/components/app-providers.tsx`

- [ ] **Step 1: Add service worker registration**

Add to `AppProviders` component:
```tsx
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}, []);
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/app-providers.tsx
git commit -m "feat: register service worker for push notifications and background sync"
```

---

## Chunk 5: Verification

### Task 16: Full verification pass

- [ ] **Step 1: TypeScript check**

Run: `cd apps/web && pnpm tsc --noEmit`
Expected: Zero new errors (pre-existing errors in posthog-js/ai-local types are acceptable)

- [ ] **Step 2: Run all tests**

Run: `cd apps/web && pnpm vitest run`
Expected: All existing + new tests pass

- [ ] **Step 3: Production build**

Run: `cd apps/web && pnpm build`
Expected: Clean build, no errors

- [ ] **Step 4: Fix any issues found**

Address TypeScript errors, test failures, or build errors discovered in steps 1-3.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "fix: resolve integration issues found during verification"
```
