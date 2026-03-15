# ML/AI Systems Integration — Design Specification

## Overview

Connect all ML/AI systems to the existing Life Design UI, build missing infrastructure, and verify full integration. This document covers 8 sub-projects that collectively deliver the complete AI-powered experience.

---

## Sub-project 1: `packages/ai-local` — Refactor to Single-Model

### Purpose
Refactor the **existing** `packages/ai-local` package from a 3-model architecture (~158MB total) to a single-model approach (~23MB) using only `Xenova/all-MiniLM-L6-v2`. Classification and summarization are reimplemented using embedding-based techniques instead of dedicated NLI and seq2seq models.

### Current State
The package already exists with:
- `AILocalClient` class (Web Worker-based, main thread proxy)
- `MODEL_REGISTRY` with 3 models: `all-MiniLM-L6-v2` (embedding), `mobilebert-uncased-mnli` (classification), `distilbart-cnn-6-6` (summarization)
- Modules: `embed.ts`, `classify.ts`, `summarize.ts`, `similarity.ts`, `voice-processor.ts`, `worker.ts`, `models.ts`

### Changes

**`models.ts`:** Remove `classification` and `summarization` entries from `MODEL_REGISTRY`. Keep only the `embedding` entry.

**`classify.ts`:** Replace NLI-based zero-shot classification with cosine-similarity-based classification:
1. Pre-compute embeddings for dimension labels + descriptions (lazy, cached)
2. For input text, compute embedding via `embed()`
3. Cosine similarity between text embedding and each dimension embedding
4. Return normalized scores as `Record<DimensionLabel, number>`

**`summarize.ts`:** Replace abstractive summarization with extractive:
1. Split text into sentences
2. Compute embedding for each sentence and the full text centroid
3. Rank sentences by cosine similarity to centroid
4. Return top N sentences (up to maxLength chars)

**`worker.ts`:** Remove the `classification` and `summarization` pipeline initializations. Route `classify` and `summarize` worker messages through the embedding pipeline + new algorithms.

**`AILocalClient` (index.ts):** API surface stays the same — `embed()`, `classify()`, `summarize()`, `classifyGoal()`, `classifyJournal()`, `detectMood()`, `journalPreview()`, `summarizeWeekly()`, `processVoice()`, `dispose()`. No breaking changes for consumers.

**`voice-processor.ts`:** Keep as-is. Voice check-in integration (Sub-project 6) uses this existing module.

**Fallback:** Methods that depend on the model return `null` or throw if the worker fails. Consumers already handle this via the existing `Promise`-based error rejection.

### Test Strategy
- Unit tests for new cosine-similarity classifier (mock embeddings, verify ranking)
- Unit tests for extractive summarizer (mock embeddings, verify sentence extraction)
- Existing `AILocalClient` lifecycle tests remain valid

---

## Sub-project 2: DB Schema Extension + LifeDesignProvider

### Purpose
Extend Dexie with tables for challenges and badges. Create a React context provider that initializes all engine instances and exposes them via hooks. Add seed data utility.

### Schema Changes

**Extend existing DBCheckIn** with optional embedding field:
```ts
// Added to existing DBCheckIn interface
interface DBCheckIn {
  // ... existing fields ...
  embedding?: number[]; // Float32Array serialized as number[] for Dexie storage
}
```

No new index needed — embeddings are accessed by iterating check-ins (similarity search scans all).

**New Dexie Tables:**

```ts
interface DBChallenge {
  id?: number;
  templateId: string;
  title: string;
  description: string;
  dimension: Dimension;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  status: 'active' | 'completed' | 'abandoned';
  tasks: { title: string; description: string }[];
  createdAt: Date;
}

interface DBChallengeProgress {
  id?: number;
  challengeId: number;
  taskIndex: number;
  completedAt: Date;
}

interface DBBadge {
  id?: number;
  key: string; // unique identifier e.g. 'first-checkin'
  title: string;
  description: string;
  emoji: string;
  dimension?: Dimension;
  awardedAt: Date;
  seen: boolean; // for "new badge" notifications
}
```

Schema version bumped to 2 with migration. Version 2 adds challenges, challengeProgress, badges tables and the `embedding` field on checkIns (no index change needed — Dexie stores it inline). Existing check-ins will have `embedding` as `undefined` — this is expected and handled by the `?` optional marker.

### LifeDesignProvider

```tsx
// src/providers/LifeDesignProvider.tsx
const LifeDesignContext = createContext<LifeDesignContextValue | null>(null);

interface LifeDesignContextValue {
  db: LifeDesignDB;
  analysisEngine: AnalysisPipeline;
  nudgeScheduler: NudgeScheduler;
  challengeEngine: ChallengeEngine;
  badgeSystem: BadgeSystem;
  aiLocal: AILocalClient;
  aiReady: boolean;
  aiProgress: number;
}

// Hooks
export function useAnalysis(): AnalysisPipeline;
export function useNudges(): NudgeScheduler;
export function useChallenges(): ChallengeEngine;
export function useBadges(): BadgeSystem;
export function useAIStatus(): { ready: boolean; progress: number };
```

Provider wraps the app in `app-providers.tsx`. On mount:
1. Initialize model preloading (non-blocking)
2. Check for pending weekly digest
3. Initialize NudgeScheduler

### Seed Data

`src/lib/db/seed.ts`:
- `seedDevelopmentData()` generates 30 days of check-ins with:
  - Gradual upward trend in fitness/health
  - Career plateau around 6-7
  - Social dip mid-month then recovery
  - Realistic mood correlation with dimension averages
  - 3 active goals with varying progress
  - 5 correlations
  - 3 awarded badges
- Exposed as `window.__seedData = seedDevelopmentData` in dev mode

---

## Sub-project 3: AnalysisPipeline

### Purpose
Central orchestration class that runs analysis after check-ins. **Wraps** InsightGenerator (does not replace it) — AnalysisPipeline calls InsightGenerator internally plus coordinates additional work: correlation computation, embedding generation, and badge checking.

**Naming note:** The existing codebase has an `interface AnalysisEngine` (a bag of math functions like `computeTrend`, `computeBalanceIndex`) in `insight-generator.ts`, `smart-journal.ts`, and `scenario-engine.ts`. This new class is deliberately named `AnalysisPipeline` to avoid collision. They are unrelated.

### Relationship to InsightGenerator
- `InsightGenerator` remains unchanged — it generates insight objects from check-in data
- `AnalysisPipeline` is the **caller/orchestrator**: it instantiates `InsightGenerator`, calls its methods, then does additional work (correlations, embeddings, badges)
- Consumers that previously called `InsightGenerator` directly can continue to do so; `AnalysisPipeline` is for the higher-level post-check-in pipeline

### API

```ts
class AnalysisPipeline {
  private insightGenerator: InsightGenerator;

  constructor(
    db: LifeDesignDB,
    modelManager?: AILocalClient,
    badgeSystem?: BadgeSystem,
  );

  // After each check-in
  async runIncrementalAnalysis(checkIn: DBCheckIn): Promise<{
    newInsights: Insight[];
    newCorrelations: number;
    newBadges: string[];
    embeddingStored: boolean;
  }>;

  // Full recomputation
  async runFullReanalysis(): Promise<void>;

  // Current state queries
  async getLatestAnalysis(): Promise<AnalysisSummary>;
}
```

### Incremental Analysis Pipeline
1. Store check-in in Dexie (if not already stored)
2. If 14+ check-ins: recompute correlations via `computeAllPairCorrelations` from core, store in Dexie
3. Call `this.insightGenerator.generateDashboardInsights()` to produce new insights
4. If AILocalClient ready: compute journal embedding via `aiLocal.embed(checkIn.journal)`, store as `number[]` on the check-in record in Dexie
5. Build BadgeContext from current state, call `badgeSystem.checkAndAwardBadges(context)`
6. Return summary of what was generated

### BadgeContext Interface

```ts
interface BadgeContext {
  checkIn: DBCheckIn;
  totalCheckIns: number;
  currentStreak: number; // consecutive days
  allDimensionsScored: boolean; // all 8 dimensions have a score in this check-in
  maxDimensionScore: { dimension: Dimension; score: number; consecutiveDays: number };
  totalCorrelations: number;
  totalGoals: number;
  completedGoals: number;
  totalChallengesCompleted: number;
  activeChallenges: number;
  checkInTime: Date; // for time-based badges (Night Owl, Early Bird)
}
```

This context is assembled by AnalysisPipeline from Dexie queries before passing to BadgeSystem.

### Dependency
- Instantiates `InsightGenerator` internally (same DB instance)
- Uses `computeAllPairCorrelations` from `@life-design/core`
- Optional AILocalClient for embeddings
- Optional BadgeSystem for badge checks

---

## Sub-project 4: ChallengeEngine + BadgeSystem

### ChallengeEngine

10 built-in templates:
1. 7-Day Fitness Streak (fitness, 7 daily exercise tasks)
2. Mindfulness Week (health, 7 meditation tasks)
3. Social Reconnect (social, 5 reach-out tasks over 7 days)
4. Career Sprint (career, 5 professional development tasks)
5. Financial Check (finance, 5 money review tasks)
6. Family Focus (family, 7 daily connection tasks)
7. Romance Rekindle (romance, 5 date/connection tasks)
8. Growth Challenge (growth, 5 learning tasks)
9. Digital Detox (health, 7 screen-free evening tasks)
10. Gratitude Journal (growth, 7 daily gratitude tasks)

```ts
class ChallengeEngine {
  constructor(db: LifeDesignDB);

  getTemplates(): ChallengeTemplate[];
  async startChallenge(templateId: string): Promise<DBChallenge>;
  async completeTask(challengeId: number, taskIndex: number): Promise<void>;
  async abandonChallenge(challengeId: number): Promise<void>;
  async getActiveChallenges(): Promise<DBChallenge[]>;
  async getChallengeProgress(challengeId: number): Promise<DBChallengeProgress[]>;
  async getCompletedChallenges(): Promise<DBChallenge[]>;
}
```

### BadgeSystem

~15 badge definitions:
- **Streaks:** First Check-in, 7-Day Streak, 30-Day Streak, 90-Day Streak
- **Dimensions:** All 8 Scored, Dimension Master (any dim at 9+ for 7 days)
- **Insights:** First Correlation, Pattern Spotter (10+ correlations)
- **Goals:** First Goal Set, Goal Achiever (completed goal)
- **Challenges:** Challenge Starter, Challenge Champion (3 completed)
- **Social:** Mentor Chat Initiated
- **Special:** Night Owl (check-in after 10pm), Early Bird (before 7am)

```ts
class BadgeSystem {
  constructor(db: LifeDesignDB);

  async checkAndAwardBadges(context: BadgeContext): Promise<string[]>; // returns newly awarded badge keys
  async getAwardedBadges(): Promise<DBBadge[]>;
  async getNewBadges(): Promise<DBBadge[]>; // unseen
  async markBadgeSeen(badgeId: number): Promise<void>;
  getBadgeDefinitions(): BadgeDefinition[];
}
```

**BadgeContext** is defined in Sub-project 3 (AnalysisPipeline section). Each badge definition has a `check(context: BadgeContext): boolean` function that determines if the badge should be awarded.

```ts
interface BadgeDefinition {
  key: string;
  title: string;
  description: string;
  emoji: string;
  dimension?: Dimension;
  check: (context: BadgeContext) => boolean;
}
```

---

## Sub-project 5: Dashboard Integration

### Changes to `dashboard-client.tsx`

**Replace** the inline insights section (currently ~50 lines of custom rendering) with:
```tsx
<DashboardInsightsFeed
  insights={liveInsights}
  activeNudge={activeNudge}
  latestDigest={latestDigest}
  onDismissInsight={handleDismiss}
  onDismissNudge={handleDismissNudge}
  onTalkToMentor={() => router.push('/mentor')}
  onViewDigest={() => setShowDigest(true)}
/>
```

**Add** badge notification indicator in the header area (small dot or count badge).

**Add** WeeklyDigest modal/sheet when digest CTA is clicked.

**Replace** static "Life Balance" data with live scores from `useLiveQuery` on Dexie check-ins.

### Data Sources
- Server-provided data (Supabase) remains for authenticated users
- Dexie data used for guest mode and real-time updates
- `useDashboardData` hook already merges these — extend it

---

## Sub-project 6: Check-in Integration

### Changes to `checkin-client.tsx`

**After step 8 (last dimension):** Insert a SmartJournalPrompt step before the reflection textarea. The prompt is generated from the dimension scores just entered.

**After submission (step 10):**
```ts
// In submitCheckin():
const dbCheckIn = await storeInDexie(checkInData);
const analysis = await analysisEngine.runIncrementalAnalysis(dbCheckIn);
if (analysis.newBadges.length > 0) {
  // Show badge awarded animation
}
```

**Voice check-in:** Add a microphone button on the mood step. Use the existing `startVoiceRecording`, `transcribeVoice`, and `processVoiceCheckIn` from `@life-design/ai-local` (already exported from `voice-processor.ts`). The existing `voice-checkin.tsx` component may also be reusable — check before building new UI.

---

## Sub-project 7: Goals + Settings Integration

### Goals Page
- Wire `goals-client.tsx` to show momentum indicators (trend arrows from last 7 check-ins for goal dimensions)
  - **Momentum algorithm:** Use `computeTrend(scores)` from `@life-design/core` on the last 7 check-in scores for each goal dimension. Positive slope = up arrow (green), negative = down arrow (red), near-zero (±0.05) = stable (gray).
- Show `PathwayCard` (existing `pathway-card.tsx`) for goals that have milestones
- Add timeline risk warning when a goal is >70% through its timeline with stalling momentum
  - **Timeline risk:** `daysElapsed / totalDays > 0.7 && momentum.slope <= 0`

### Settings Page
Add new sections to `settings/page.tsx`:
- **Connected Apps** — Render `IntegrationsPanel` component (already exists)
- **Nudge Schedule** — Time picker for morning/evening nudge times, toggle per type
- **Weekly Digest** — Day-of-week selector for when digest generates
- **AI Features** — Toggle for on-device models, model loading status, cache size, clear cache button
- **Mentor Memory** — List of learned facts from mentor conversations, with delete buttons
- **Challenge History** — List of completed challenges with dates

---

## Sub-project 8: Navigation + New Routes

### Navigation Changes

In `protected-layout-client.tsx`, add to `navItems`:
```ts
{ href: '/mentor', label: 'Mentor', icon: ChatIcon },
{ href: '/simulator', label: 'Simulate', icon: BeakerIcon },
{ href: '/challenges', label: 'Challenges', icon: TrophyIcon },
```

**Desktop sidebar:** Shows all 7 items (Home, Goals, Check-in, Mentor, Simulate, Challenges, Settings).

**Mobile bottom nav:** Keep 5 items max (Home, Goals, Check-in, Mentor, More). "More" opens a drawer with Simulator, Challenges, Settings.

### New Routes

**`/challenges`** — `ChallengeLibrary` component: Grid of challenge templates + active challenges section.

**`/challenges/[id]`** — `ActiveChallengeView`: Progress tracker, task checklist, completion celebration.

### Service Worker

Register in `app-providers.tsx` or layout:
```ts
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

The existing `app/sw.ts` already handles push notifications and background sync — just ensure it's registered.

---

## Verification Plan

1. `pnpm tsc --noEmit` — zero new TS errors
2. `pnpm vitest run` — all existing + new tests pass
3. `pnpm build` — clean production build
4. Manual smoke test with seed data:
   - App loads, AI model begins downloading (~23MB)
   - Create check-in, see SmartJournalPrompt before reflection step
   - Post-check-in analysis pipeline runs (insights, correlations, badges)
   - Dashboard shows DashboardInsightsFeed with live insights, nudge card, digest CTA
   - Mentor chat works with streaming (pre-existing, verify not broken)
   - Simulator produces projections (pre-existing, verify not broken)
   - Challenge can be started from `/challenges`, tasks completed
   - Badges award correctly, notification indicator appears
   - Settings shows all new sections (integrations, nudge config, AI features, mentor memory, challenge history)
   - Mobile nav works with 5 items + "More" drawer
   - Desktop nav shows all routes
