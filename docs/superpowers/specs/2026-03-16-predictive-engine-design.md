# Predictive Engine & Contextual Awareness — Design Spec

**Date:** 2026-03-16
**Status:** Approved (Rev 3 — all spec review issues resolved)
**Author:** Aaron + Claude

## Objective

Build a privacy-first, hyper-personalized predictive engine that runs entirely on-device. The system reduces daily check-in friction to near-zero, learns the user's unique lifestyle correlations, and proactively defends their baseline through context-aware interventions.

## System Architecture

```
                  ┌──────────────────────────────────────────────────┐
                  │                Browser (Client-Side Only)         │
                  │                                                  │
  Integrations ──►│  Feature Pipeline ──► Normalization Store        │
  (Strava,        │       │                    (Dexie)               │
   Calendar,      │       ▼                                          │
   Spotify,       │  NormalisedMLFeatures ──► Season Modifiers       │
   Apple Health)  │       │                      │                   │
                  │       ▼                      ▼                   │
                  │  ┌─────────────────────────────────┐             │
                  │  │   Training Worker (Web Worker #2) │            │
                  │  │   LocalTrainer (3-tier)           │            │
                  │  │   Cold → Warm → Personalized      │            │
                  │  └──────────┬────────────────────────┘            │
                  │             │                                     │
                  │             ▼                                     │
                  │  ModelWeights (Dexie) ──► Inference               │
                  │             │                                     │
                  │             ▼                                     │
                  │  PredictiveSliderGroup ◄── ExplainabilityTooltip │
                  │  (GhostSlider × 8)                               │
                  │             │                                     │
                  │       SpotifyReflection (active prompts)         │
                  │             │                                     │
                  │             ▼                                     │
                  │  User Check-in ──► Dexie + Supabase/localStorage │
                  │             │                                     │
                  │             ▼                                     │
                  │  Guardian Agent ──► Action Synthesizer            │
                  │  (Anomaly Detection)    │                        │
                  │                         ▼                        │
                  │                  GuardianAlert (Nudge/Modal)     │
                  └──────────────────────────────────────────────────┘
```

All ML computation stays on-device. No lifestyle data leaves the browser. Check-in scores sync to Supabase for the existing correlation/insights pipeline only.

---

## Conventions & Integration Context

### Existing Codebase

- **Monorepo:** `apps/web/` (Next.js 15), `packages/core/`, `packages/ai/`, `packages/ai-local/`, `packages/ui/`
- **Existing Dexie DB:** `apps/web/src/lib/db/schema.ts` — `LifeDesignDB` class at version 3 with 9 tables (`checkIns`, `goals`, `insights`, `correlations`, `connectedAppData`, `mentorMemory`, `nudges`, `activeChallenges`, `badges`). Version 3 uses empty stores `{}` (Dexie v4+ pattern — only declare stores that change).
- **Existing check-in UX:** `apps/web/src/app/(protected)/checkin/checkin-client.tsx` is a **12-step wizard** (step 0 = mood on 1-5 scale converted to 1-10 via `moodTo10()`, steps 1-8 = one dimension per step on 1-10 scale, step 9 = smart journal prompt, step 10 = reflection, step 11 = complete). Dimension scores use 1-10 tap buttons, NOT sliders.
- **Mood scale:** UI collects mood on 1-5 scale (Struggling/Low/Neutral/Good/Thriving), stored as 1-10 via `moodTo10(mood5) = mood5 * 2`. The ML model trains and predicts on the **1-10 storage scale**. The Ghost Slider for mood must map back to the 1-5 display scale for the UI.
- **Existing Web Worker:** `packages/ai-local/src/worker.ts` — handles NLP tasks (embed, classify, summarize). The new training worker is a **separate, second Web Worker** with its own client class.
- **Naming convention:** The codebase uses British spelling (`NormalisedFeature`, `normaliseSignal`). New types follow this convention: `NormalisedMLFeatures` (not `NormalizedFeatures`).
- **Component directory:** Existing check-in components live in `apps/web/src/components/checkin/` (no hyphen). New components go here too.

### File Path Convention

All paths in this spec are relative to the monorepo root. Every file is prefixed with its package/app:
- `apps/web/src/...` for app-level code
- `packages/core/src/...` for shared types and logic

---

## Subsystem 1: Foundation — Types & Persistence

### Purpose
Define the core type contracts and extend the existing Dexie schema with ML pipeline tables.

### New Files
- `apps/web/src/lib/ml/types.ts`

### Modified Files
- `apps/web/src/lib/db/schema.ts` — Add version 4 migration with 4 new tables + extend `DBCheckIn`

### Types (`apps/web/src/lib/ml/types.ts`)

```typescript
/**
 * All values scaled 0.0 to 1.0 where 0.5 is the user's "normal" (30-day rolling mean).
 */
export interface NormalisedMLFeatures {
  // Physical Signals (Apple Health / Strava)
  sleep_duration_score: number;
  sleep_quality_score: number;
  physical_strain: number;
  recovery_status: number;

  // Cognitive/Work Signals (Google Calendar)
  meeting_load: number;
  context_switching_penalty: number;
  deep_work_opportunity: number;
  after_hours_work: number;

  // Digital Signals (Screen Time / Spotify)
  digital_fatigue: number;
  doomscroll_index: number;
  audio_valence: number;
  audio_energy: number;

  // Temporal / Contextual
  day_of_week_sin: number;    // sin(2π·day/7)
  day_of_week_cos: number;    // cos(2π·day/7)
  is_weekend: boolean;        // Derived: dayOfWeek === 0 || dayOfWeek === 6. Intentional redundancy with sin/cos for cold-start heuristics.

  // Season encoding (one-hot: exactly one is 1.0, rest are 0.0)
  season_sprint: number;      // 1.0 if active season is Sprint, else 0.0
  season_recharge: number;    // 1.0 if active season is Recharge, else 0.0
  season_exploration: number; // 1.0 if active season is Exploration, else 0.0
  // Maintenance is the implicit default when all three are 0.0
}

export interface IFeatureExtractor {
  extract(date: Date, lookbackDays: number): Promise<NormalisedMLFeatures>;
  imputeMissing(raw: Partial<NormalisedMLFeatures>): NormalisedMLFeatures;
}

export interface TrainingPair {
  date: string;
  features: NormalisedMLFeatures;
  labels: Partial<Record<Dimension, number>>;  // Actual user scores (1-10). Partial because Quick mode only scores 3 dimensions.
  mood: number;                                // 1-10 (stored scale)
  ai_accepted: boolean;
  completeDimensions: boolean;                 // true if all 8 dimensions scored (Deep/Predictive mode). Training on partial labels uses only the scored dimensions.
}

export interface PredictionResult {
  scores: Record<Dimension, number>;  // Predicted dimension scores (1-10)
  mood: number;                       // Predicted mood (1-10)
  confidence: Record<Dimension, number>; // Per-dimension confidence (0-1)
  topWeights: Record<Dimension, FeatureWeight[]>; // For explainability
}

export interface FeatureWeight {
  feature: keyof NormalisedMLFeatures;
  weight: number;
  humanLabel: string; // e.g., "low sleep quality"
}

export type ModelTier = 'cold' | 'warm' | 'personalized';

export interface ModelWeightsRecord {
  id: string;                           // e.g., 'current', 'previous'
  tier: ModelTier;
  version: number;                      // Monotonically increasing
  updatedAt: number;                    // Unix timestamp
  sampleSize: number;                   // Check-ins used for training
  coefficients: Record<string, number>; // Feature → weight mappings
  subjectivityGaps: Record<string, number>; // Per-dimension dampening factors
  validationLoss: number;               // MAE on held-out set
}

export interface FeatureLogRecord {
  date: string;                 // YYYY-MM-DD, primary key
  features: NormalisedMLFeatures;
  imputedFields: string[];      // Which fields were guessed
  featureConfidence: number;    // Ratio of real vs imputed (0-1)
  extractedAt: number;          // Unix timestamp
}

export interface GuardianLogEntry {
  id?: number;
  timestamp: number;
  triggerType: 'burnout' | 'isolation' | 'flow_state';
  escalationLevel: 1 | 2 | 3;
  actionSuggested: string;
  userAccepted: boolean;
  dimensionsAffected: Dimension[];
  deviationMagnitude: number;   // How far from baseline (in σ)
}

export type SeasonName = 'Sprint' | 'Recharge' | 'Exploration' | 'Maintenance';

export interface SeasonRecord {
  id?: number;
  name: SeasonName;
  startDate: string;            // YYYY-MM-DD
  endDate?: string;             // Null if open-ended (active)
  isActive: boolean;
  triggerSource: 'manual' | 'calendar_heuristic' | 'guardian_escalation';
  weights: Record<Dimension, number>; // The weight matrix for this season
}

export interface NormalisationStatsRecord {
  feature: string;              // Primary key: e.g., 'sleep_duration_score'
  mean30d: number;
  stddev30d: number;
  median: number;
  sampleCount: number;
  lastUpdated: number;          // Unix timestamp
}

export interface SpotifyReflectionRecord {
  id?: number;
  date: string;                 // YYYY-MM-DD, links to check-in
  artistName: string;
  trackNames: string[];
  listeningMinutes: number;
  audioValence: number;         // 0-1 from Spotify API
  audioEnergy: number;          // 0-1 from Spotify API
  userMoodResponse: 'energised' | 'calm' | 'melancholic' | 'nostalgic' | 'neutral';
  userFreeText?: string;
  createdAt: number;
}

export interface TrainerConfig {
  minSamplesWarm: number;         // Default: 7
  minSamplesPersonalised: number; // Default: 14
  learningRate: number;           // Default: 0.1
  maxIterations: number;          // Default: 50
  maxDepth: number;               // Default: 3
  lossFunction: 'mse';           // Mean Squared Error
  validationSplit: number;        // Default: 0.2 (hold out 20% for validation)
}
```

### Model Output Shape
The model predicts **9 values**: 8 dimension scores (Career, Finance, Health, Fitness, Family, Social, Romance, Growth) plus mood. All on the 1-10 scale matching the existing `DBCheckIn` schema.

### Dexie Schema Migration (`apps/web/src/lib/db/schema.ts`)

Extend the existing `LifeDesignDB` class with a **version 4** migration. Following the v3 pattern, only declare new/changed stores:

```typescript
// New tables added in version 4. Existing tables are unchanged and omitted (Dexie v4+ pattern).
this.version(4).stores({
  featureLogs: 'date, extractedAt',
  mlModelWeights: 'id, tier, version',
  guardianLogs: '++id, timestamp, triggerType',
  seasons: '++id, name, isActive',
  normalisationStats: 'feature',  // Per-feature rolling mean/stddev/median
  spotifyReflections: '++id, date', // Spotify reflection responses linked to check-ins
});
```

Add `ai_accepted` field to existing `DBCheckIn`:
```typescript
export interface DBCheckIn {
  // ... existing fields ...
  ai_accepted?: boolean; // true = user confirmed AI predictions without meaningful changes
}
```

**Semantics of `ai_accepted`:**
- `true` = user hit "Confirm AI Predictions" or moved sliders with delta ≤ 1 on all dimensions. Low training signal (model was right).
- `false` or `undefined` = user manually scored. High training signal (model was wrong or no predictions available).
- "Meaningful change" threshold: delta > 1 on any dimension.

### Data Retention Policy
- Feature logs older than **90 days** are pruned on app startup
- Guardian logs older than **180 days** are pruned
- Model weights: keep only `current` and `previous` (for rollback)
- On `QuotaExceededError`: prune oldest feature logs first, then guardian logs

### Dependency
- `dexie` is already installed (`apps/web/src/lib/db/schema.ts` imports it). No new dependency needed.

---

## Subsystem 2: Feature Pipeline

### Purpose
Transform raw integration data into the `NormalisedMLFeatures` vector that feeds the inference engine.

### New Files
- `apps/web/src/lib/ml/normalization-store.ts`
- `apps/web/src/lib/ml/feature-pipeline.ts`

### Three Transformations

**1. Z-Score Normalization**
```
z = (raw - mean_30d) / stddev_30d
normalized = sigmoid(z)  // Clamps to 0.0–1.0
```
"7 hours of sleep" scores differently for a 6-hour sleeper vs a 9-hour sleeper.

**2. Cyclic Time Encoding**
```
day_of_week_sin = sin(2π · dayOfWeek / 7)
day_of_week_cos = cos(2π · dayOfWeek / 7)
```
Saturday (6) and Sunday (0) become numerically adjacent.

**3. Missing Data Imputation**
- Source didn't sync → fall back to user's historical median for that feature
- No history exists → default to 0.5 (neutral)
- `FeatureLogRecord.imputedFields` tracks which fields were guessed
- `FeatureLogRecord.featureConfidence` = `1 - (imputedFields.length / totalFields)`

### Feature Confidence Gate
If `featureConfidence < 0.3` (more than 70% of features are imputed), **skip prediction** for that day. Fall back to the manual check-in UI with message: "Not enough data from your connected apps today for AI predictions. Score manually."

### Normalization Store (`normalization-store.ts`)
Dexie-backed persistence in the `normalisationStats` table (added in v4 migration). Each record is a `NormalisationStatsRecord` keyed by feature name:
- 30-day mean, standard deviation, and median
- Recalculated lazily (only when a new check-in is saved, not on every read)
- The store exposes `getStats(feature: string)` and `updateStats(feature: string, newValue: number)` methods

### `FeaturePipeline` Class
`feature-pipeline.ts` exports a `FeaturePipeline` class implementing `IFeatureExtractor`. It:
1. Queries `connectedAppData` from Dexie for the target date
2. Calls existing `normalizeProviderPayload()` from `@life-design/core` for raw extraction
3. Applies Z-score normalization against the normalization store
4. Applies cyclic time encoding
5. Imputes missing values
6. Returns `NormalisedMLFeatures` + confidence metadata

### Integration with Existing Code
- `@life-design/core/feature-extraction.ts` already extracts `NormalisedFeature[]` from Strava, Calendar, Spotify, Slack, Notion, Apple Health. The new pipeline consumes these as raw inputs.
- **Gap:** The Spotify connector currently maps diversity/curation/listening but **not** valence/energy. A new `extractSpotifyAudioFeatures()` function is needed. **Note:** Spotify deprecated `/v1/audio-features` in Nov 2024. Use the `/v1/tracks` endpoint which includes audio features in the response, or use the `/v1/recommendations` endpoint for valence/energy. The existing `SpotifyConnector` class lives in `packages/core/src/connectors.ts` (not a separate file) — add the method there.

---

## Subsystem 3: Local Inference Engine

### Purpose
On-device ML that maps NormalisedMLFeatures to predicted dimension scores. Trains locally — no data leaves the device.

### New Files
- `apps/web/src/lib/ml/trainer.ts`
- `apps/web/src/workers/training-worker.ts`
- `apps/web/src/lib/ml/training-client.ts` (Web Worker client wrapper)
- `apps/web/src/lib/ml/models/weights.json`

### Three-Tier Training Pipeline

| Phase | Check-ins Required | Model | Description |
|-------|--------------------|-------|-------------|
| Cold Start | 0–7 | Global Heuristics | Hardcoded weights from `weights.json`. Ships with the app. |
| Warm Start | 7–14 | Linear Regression | On-device OLS finds basic per-user correlations. |
| Personalised | 14+ | Gradient Boosting | Pure TypeScript implementation (~300 lines). Captures non-linear interactions. |

### Gradient Boosting Hyperparameters (via `TrainerConfig`)

| Parameter | Default | Rationale |
|-----------|---------|-----------|
| `learningRate` | 0.1 | Conservative for small datasets |
| `maxIterations` | 50 | Sufficient for 14-100 samples |
| `maxDepth` | 3 | Prevents overfitting on small data |
| `lossFunction` | MSE | Standard for regression |
| `validationSplit` | 0.2 | Hold out ~3 check-ins for validation |

### Subjectivity Gap

When `abs(predicted - actual) > 2.0` consistently (3+ occurrences) for a dimension:
1. Trainer records a dampening factor in `ModelWeightsRecord.subjectivityGaps`
2. UI renders that dimension's Ghost Slider with dotted/muted style
3. Tooltip: "You've been unpredictable here lately. How are you?"

### Training Triggers
- 7+ new check-ins since last training, OR
- Device is idle (via `requestIdleCallback`, with `setTimeout` fallback for Safari)
- Does NOT run on every check-in
- **Low-confidence check-ins:** When `featureConfidence < 0.3` (manual mode), the check-in still becomes a `TrainingPair` BUT only the user's scores (labels) are used — the imputed features are excluded from the gradient update. This prevents polluting the model while still capturing the user's ground truth.
- **Data retention ordering:** On app startup, run data pruning BEFORE triggering any training. Use `await db.featureLogs.where('extractedAt').below(ninetyDaysAgo).delete()` first, then check if training is needed.

### Model Versioning & Rollback
- `ModelWeightsRecord.version` increments on each successful training
- After training, validate on held-out set (most recent 20% of check-ins)
- Only promote new model if validation loss improves vs current
- Keep `current` and `previous` model records for rollback
- Use `navigator.locks.request('training')` to prevent concurrent training across tabs

### Web Worker Architecture
`training-worker.ts` is a **second, independent Web Worker** (separate from the existing `@life-design/ai-local` NLP worker). It handles only numerical ML. Lives at `apps/web/src/workers/training-worker.ts` (create the `workers/` directory; Next.js supports Web Workers via `new Worker(new URL(...), { type: 'module' })`).

**Dexie access from the Worker:** The training worker creates its own `LifeDesignDB` instance (Dexie supports multi-context access to the same IndexedDB). The worker reads `checkIns` and `featureLogs`, and writes `mlModelWeights`. This is safe because Dexie handles cross-context transactions. The main thread and worker never write to the same table concurrently (enforced by `navigator.locks`).

**`navigator.locks` fallback:** If `navigator.locks` is unavailable (rare — private browsing in some browsers), fall back to a simple `localStorage`-based mutex: write a timestamp, check if it's yours after 50ms. Not perfect but sufficient for preventing duplicate training runs.

**`requestIdleCallback` fallback:** Safari does not support `requestIdleCallback`. Use `setTimeout(fn, 5000)` as fallback when `requestIdleCallback` is undefined.

`training-client.ts` exports a `TrainingClient` class following the same pattern as `AILocalClient`:
- Promise-map routing with typed `TrainerRequest`/`TrainerResponse` messages
- Timeout handling (training timeout: 30s)
- Progress callbacks for UI
- Message types: `'train'`, `'predict'`, `'getModelInfo'`

### Day 14 Notification
After personalised training completes for the first time:
> "Life Design has learned your patterns. I've noticed your 'Career' score is 40% more sensitive to 'Sleep Quality' than the average person. I've adjusted your predictive check-ins to reflect this."

Uses the existing `nudges` Dexie table to surface this as a special notification.

### Implementation Note
For v1, gradient boosting is implemented in pure TypeScript (no XGBoost-WASM dependency). At 14–100 samples with 16 features, performance is identical. The `IFeatureExtractor` and `TrainerConfig` interfaces are model-agnostic — XGBoost-WASM can be swapped in later when data scale justifies the 2-3MB bundle.

---

## Subsystem 4: Predictive UI

### Purpose
Map inference engine outputs to frictionless daily check-in sliders with full transparency and active Spotify reflection.

### New Files
- `apps/web/src/components/checkin/ghost-slider.tsx`
- `apps/web/src/components/checkin/predictive-slider-group.tsx`
- `apps/web/src/components/checkin/explainability-tooltip.tsx`
- `apps/web/src/components/checkin/spotify-reflection.tsx`

### Ghost Slider UX

**Dual-handle slider (`ghost-slider.tsx`):**
- **Ghost handle** (translucent): AI's predicted score
- **Solid handle**: User's actual score (appears when they interact)

**Confidence visual states:**

| State | Handle Style | Tooltip |
|-------|-------------|---------|
| High confidence | Solid, glowing ghost | "Based on your 8h sleep and low meeting load." |
| Low confidence (high subjectivity gap) | Dotted, muted ghost | "You've been unpredictable here lately. How are you?" |
| User override | Solid user-colored + faint ghost | Shows delta between prediction and actual |

### Anti-Anchoring Safeguard
"Save" button is disabled until the user either:
1. Moves at least one slider (delta > 1 on any dimension), OR
2. Explicitly taps "Confirm AI Predictions" button

This forces a micro-moment of reflection, preventing acquiescence bias.

### Explainability Tooltip (`explainability-tooltip.tsx`)
On tap/hover, shows the top 2–3 feature weights influencing that prediction:
> "Your Social score is low because your context-switching penalty is unusually high today and your audio valence is melancholic."

Consumes `PredictionResult.topWeights` which maps dimensions to `FeatureWeight[]`.

### Spotify Reflection (`spotify-reflection.tsx`)
**Active reflection prompts** during the check-in flow:
- After the predictive sliders step, if Spotify data is available for that day
- Surfaces what the user listened to: "You listened to Radiohead for 3 hours today"
- Asks a reflective question: "How does this music make you feel?"
- User response options: emoji-based mood selector (energised / calm / melancholic / nostalgic / neutral) + optional free-text
- Response is stored in the `spotifyReflections` Dexie table as a `SpotifyReflectionRecord`, linked to the check-in by date. This becomes an additional training signal: the user's subjective interpretation of their music data, paired with the audio_valence/energy features. Over time, the model learns what valence/energy *means* for this specific user.

**When it shows:**
- Only when Spotify data is available for the check-in date
- At most 1 reflection prompt per check-in (pick the most notable listening session — longest duration or biggest valence deviation from norm)
- Can be dismissed/skipped

### Integration with Existing Check-in Wizard

The existing check-in at `checkin-client.tsx` is a **12-step wizard** (step 0 = mood on 1-5 scale, steps 1-8 = one dimension per step on 1-10 tap buttons, step 9 = smart journal, step 10 = reflection, step 11 = complete). The predictive UI integrates with this wizard, not replaces it.

**Two modes based on prediction availability:**

**Mode A — Predictions Available (warm/personalised model + featureConfidence >= 0.3):**
The wizard collapses dimensions into a single "Review Predictions" step:
- Step 0: Mood (ghost-predicted on 1-5 display scale — model predicts 1-10, display = predicted / 2)
- Step 1: Review All Dimensions (`PredictiveSliderGroup` with 8 ghost sliders, 1-10 scale)
- Step 2: Spotify Reflection (if Spotify data available, otherwise skip)
- Step 3: Smart Journal Prompt
- Step 4: Reflection text
- Step 5: Complete

This reduces a 12-step flow to 5-6 steps — the core friction reduction.

**Mode B — No Predictions (cold start or featureConfidence < 0.3):**
The existing 12-step wizard runs unchanged. No ghost sliders.

**Mode selection** happens at the top of `checkin-client.tsx` based on whether `TrainingClient.predict()` returns a result.

### Quick Check-in Integration
`CheckInForm` at `checkin-form.tsx` (used for dashboard quick check-in) already accepts `initialValues`. When predictions are available, pass predicted scores as `initialValues` and render `PredictiveSliderGroup` instead of the `DimensionCard` grid. Falls back to tap UI during cold start.

### Modifications to Existing Files
- `apps/web/src/app/(protected)/checkin/checkin-client.tsx` — Add prediction-aware mode switching. In Mode A, replace steps 1-8 with single PredictiveSliderGroup step. Add Spotify reflection step. Wire Dexie write-through. Compute `ai_accepted` (delta > 1 on any dimension = not accepted).
- `apps/web/src/components/checkin/checkin-form.tsx` — Conditional render: `PredictiveSliderGroup` when predictions available, `DimensionCard` grid otherwise.

---

## Subsystem 5: Guardian Agent

### Purpose
Proactive anomaly detection that catches downward spirals before they happen.

### New Files
- `apps/web/src/lib/agents/guardian-core.ts`
- `apps/web/src/lib/agents/action-synthesizer.ts`
- `apps/web/src/components/notifications/guardian-alert.tsx`

### Anomaly Detection

Compares 7-day rolling average against 30-day baseline per dimension. Uses existing `computeMovingAverage()`, `computeVolatility()`, and `computeTrend()` from `@life-design/core/scoring.ts`.

**Three trigger patterns:**

| Pattern | Condition | Duration |
|---------|-----------|----------|
| Burnout | Work >1.5σ above mean + Health/Mood >1.0σ below mean | 3+ consecutive days |
| Isolation | Social >1.5σ below mean + Digital Fatigue spikes | 3+ consecutive days |
| Flow State | All scores trending positively | 5+ days (protects momentum) |

### Escalation Ladder

| Level | Trigger | System Action | User Experience |
|-------|---------|---------------|-----------------|
| 1: Observe | 1–2 days negative deviation | Silent log to `guardianLogs`. Increase model sensitivity. | No visible change. |
| 2: Nudge | 3 days negative deviation | Write to existing `nudges` Dexie table with `type: 'guardian'`. Surfaces through existing nudge card on dashboard. | "Your recovery is trending down." |
| 3: Intervene | 5+ days or severe sudden drop | In-app modal via `guardian-alert.tsx`. High-friction: requires explicit dismiss or action. | "Guardian Alert: Burnout trajectory detected." |

**Note on Level 3:** For v1, Level 3 uses an in-app modal (not push notifications). Push notifications require service worker infrastructure and permission flows that are out of scope for this spec. Can be added later.

### Guardian Nudge Integration
Level 2 nudges write to the existing `nudges` Dexie table (already used by `micro-moments.ts`):
```typescript
db.nudges.add({
  type: 'guardian',
  title: 'Recovery Alert',
  message: actionSynthesizer.generate(trigger),
  scheduledFor: new Date(),
  dismissed: false,
  createdAt: new Date(),
});
```
The existing dashboard nudge card already reads from this table.

### Action Synthesizer (`action-synthesizer.ts`)
Generates one immediate, frictionless action:
- **Bad:** "You seem stressed, try to relax."
- **Good:** "You've had 6 context-switches today and low deep sleep. Tap here to block 2 PM–4 PM for deep work."

Uses server-side Gemini (`@life-design/ai`) when online, or local template system for offline. Templates indexed by trigger type + top contributing features.

### Calendar Integration (Future Work)
Ghost event tagging (creating calendar blocks with `source: life-design-guardian`) requires Google Calendar **write** scope (`calendar.events`). This is **not in v1** — it requires additional OAuth consent. For v1, the action synthesizer suggests calendar actions but does not execute them directly.

### Feedback Loop
`GuardianLogEntry.userAccepted` tracks whether the user acted on suggestions. If ignored 3+ times for a specific `triggerType`, the Guardian decreases its proactivity score for that dimension — fewer nudges, higher threshold to trigger.

---

## Subsystem 6: Life Seasons

### Purpose
Macro-context that adjusts what "balanced" means based on the user's current life phase.

### New Files
- `apps/web/src/lib/context/season-manager.ts`
- `apps/web/src/lib/ml/modifiers.ts`
- `apps/web/src/components/settings/season-selector.tsx`

### Four Seasons

| Season | Weights (Career/Finance/Health/Fitness/Family/Social/Romance/Growth) | Suppressed Alerts |
|--------|----------------------------------------------------------------------|-------------------|
| Sprint | 1.5 / 1.0 / 0.8 / 0.7 / 0.7 / 0.5 / 0.5 / 1.3 | Low Social |
| Recharge | 0.7 / 0.8 / 1.5 / 1.3 / 1.2 / 1.0 / 1.0 / 0.8 | After-hours work |
| Exploration | 0.8 / 0.7 / 1.0 / 1.0 / 0.8 / 1.5 / 1.2 / 1.3 | Rigid isolation |
| Maintenance | 1.0 / 1.0 / 1.0 / 1.0 / 1.0 / 1.0 / 1.0 / 1.0 | None (default) |

### Impact on Balance Index

Changes from simple average to weighted:
```
Before: Index = Σ(Dn) / n
After:  Index = Σ(Dn · Wn) / Σ(Wn)
```

`computeWeightedScore()` in `@life-design/core/scoring.ts` already implements this formula. The season manager provides the weight vector.

### Season Modifiers (`modifiers.ts`)
Two responsibilities:

**1. Feature vector encoding:** Sets the one-hot season fields (`season_sprint`, `season_recharge`, `season_exploration`) in `NormalisedMLFeatures`. The model learns seasonal patterns from these features — e.g., "during Sprint, high meeting_load is normal."

**2. Guardian threshold adjustment:** Applies the season's weight matrix to the Guardian's anomaly detection. In Sprint mode, the Social dimension threshold is relaxed (requires >2.0σ instead of >1.5σ to trigger). In Recharge mode, after_hours_work triggers at a lower threshold.

The season weights (`SeasonRecord.weights`) are applied to the Balance Index calculation (via `computeWeightedScore()`) but are NOT applied to the raw feature vector — they modify the output interpretation, not the input data.

### AI-Assisted Transitions
- Calendar heuristics: Dense meeting clusters → suggest Sprint
- Guardian escalations: Burnout trajectory → suggest Recharge
- These surface as suggestions via the existing nudge system, never automatic changes
- User confirms or dismisses via `season-selector.tsx`

### Season Selector UI (`season-selector.tsx`)
Lives in Settings. Shows:
- Current active season with start date
- Four season cards with descriptions of what each prioritises
- "AI suggested" badge when a transition is recommended
- History of past seasons

---

## Complete File Manifest

### New Files (19 total)

| Subsystem | File | Purpose |
|-----------|------|---------|
| 1 | `apps/web/src/lib/ml/types.ts` | All ML type definitions (11 interfaces/types) |
| 2 | `apps/web/src/lib/ml/normalization-store.ts` | Rolling stats persistence |
| 2 | `apps/web/src/lib/ml/feature-pipeline.ts` | `FeaturePipeline` class implementing `IFeatureExtractor` |
| 3 | `apps/web/src/lib/ml/trainer.ts` | `LocalTrainer` class (3-tier) |
| 3 | `apps/web/src/lib/ml/training-client.ts` | Web Worker client (like `AILocalClient`) |
| 3 | `apps/web/src/workers/training-worker.ts` | Off-thread training Web Worker |
| 3 | `apps/web/src/lib/ml/models/weights.json` | Default global heuristic weights |
| 4 | `apps/web/src/components/checkin/ghost-slider.tsx` | Dual-handle slider primitive |
| 4 | `apps/web/src/components/checkin/predictive-slider-group.tsx` | 8-dimension predictor UI + Confirm All |
| 4 | `apps/web/src/components/checkin/explainability-tooltip.tsx` | Feature weight → human sentences |
| 4 | `apps/web/src/components/checkin/spotify-reflection.tsx` | Active listening reflection prompts |
| 5 | `apps/web/src/lib/agents/guardian-core.ts` | Anomaly detection engine |
| 5 | `apps/web/src/lib/agents/action-synthesizer.ts` | Contextual intervention generator |
| 5 | `apps/web/src/components/notifications/guardian-alert.tsx` | Level 3 intervention modal |
| 6 | `apps/web/src/lib/context/season-manager.ts` | Season definitions + transition logic |
| 6 | `apps/web/src/lib/ml/modifiers.ts` | Season bias application to features |
| 6 | `apps/web/src/components/settings/season-selector.tsx` | Season picker UI |

### Modifications to Existing Files (4 total)

| File | Change |
|------|--------|
| `apps/web/src/lib/db/schema.ts` | Version 4 migration: add `featureLogs`, `mlModelWeights`, `guardianLogs`, `seasons`, `normalisationStats`, `spotifyReflections` tables. Add `ai_accepted` to `DBCheckIn`. |
| `packages/core/src/connectors.ts` | Add Spotify audio features method (valence/energy via `/v1/tracks` endpoint — `/v1/audio-features` is deprecated) |
| `apps/web/src/components/checkin/checkin-form.tsx` | Conditional render: PredictiveSliderGroup when predictions available. Add SpotifyReflection step. |
| `apps/web/src/app/(protected)/checkin/checkin-client.tsx` | Wire Dexie write-through on save. Compute `ai_accepted`. |

### Dependencies
- No new npm dependencies. Dexie is already installed.

---

## Build Sequence

The prompt chain executes in dependency order:

```
Prompt 1 (Types + DB v4 migration)
    │
    ▼
Prompt 2 (Feature Pipeline + Normalization Store)
    │
    ▼
Prompt 3 (Trainer + Training Worker + Training Client)
    │
    ├──► Prompt 4 (Predictive UI + Spotify Reflection)
    │         needs inference outputs from Prompt 3
    │
    └──► Prompt 5a (Guardian Agent)
              needs check-in data + features from Prompts 1-2
              │
              ▼
         Prompt 5b (Life Seasons)
              needs Guardian triggers + feature pipeline from Prompts 2, 5a
```

- Prompts 1 → 2 → 3 are strictly sequential
- Prompts 4 and 5a can run in parallel after Prompt 3
- Prompt 5b depends on 5a (Guardian triggers feed season suggestions)

---

## Scoping Notes

### In Scope (v1)
- All 6 subsystems as described
- Pure TypeScript gradient boosting (no XGBoost-WASM)
- Level 3 Guardian as in-app modal (not push notification)
- Calendar actions as suggestions only (no direct calendar write)
- Spotify reflection as active prompts during check-in

### Out of Scope (Future Work)
- XGBoost-WASM upgrade for 200+ data point users
- Push notification infrastructure for Level 3 Guardian
- Calendar write access (creating events directly)
- Screen Time API integration (digital_fatigue, doomscroll_index will use imputation until API available)
- Cross-device model sync
