# Life Design: ML & Analysis Explainer

A comprehensive guide to every analytical technique, ML model, and data processing pipeline in the Life Design application. This document explains what is being computed, how the pieces interact, what insights are extracted, and why those insights matter.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [The Data Model: 8 Life Dimensions](#the-data-model)
3. [Layer 1 — Signal Ingestion & Feature Extraction](#layer-1)
4. [Layer 2 — Statistical Analysis](#layer-2)
5. [Layer 3 — Client-Side ML (Transformers.js)](#layer-3)
6. [Layer 4 — Server-Side AI (Gemini)](#layer-4)
7. [Layer 5 — Insight Synthesis & Delivery](#layer-5)
8. [Supporting Systems](#supporting-systems)
9. [Complete Data Flow Diagram](#data-flow)
10. [File Index](#file-index)
11. [N-of-1 Personalised Prediction Models](#nof1-models)
12. [SHAP Explainability](#shap-explainability)
13. [Federated Learning](#federated-learning)
14. [Spotify Mood Classification](#spotify-mood)
15. [Exercise-Mood Lag Analysis](#exercise-mood-lag)
16. [HRV Stress Computation](#hrv-stress)
17. [Linguistic Biomarker Detection](#linguistic-biomarkers)
18. [Financial Stress Index](#financial-stress)

---

<a name="architecture-overview"></a>
## 1. Architecture Overview

The app processes user data through five analytical layers:

```
Raw Data Sources                Statistical Analysis           ML / AI
─────────────────               ────────────────────           ──────
Check-ins (mood, scores)  ──►   Pearson correlation      ──►  Zero-shot classification
Integration APIs          ──►   Lagged correlation       ──►  Semantic embeddings
Voice transcripts         ──►   Trend detection          ──►  Abstractive summarization
Onboarding conversations  ──►   Streak computation       ──►  Gemini insight generation
                                Balance index            ──►  Gemini pathway planning
                                Moving averages          ──►  Gemini voice analysis
                                Volatility               ──►  Gemini nudge generation
```

**Key principle**: The system uses a layered fallback architecture. Deterministic statistics run first and always. Client-side ML (Transformers.js in a Web Worker) adds semantic understanding without API calls. Server-side Gemini adds generative AI when available. Each layer enriches the previous one but never blocks it.

---

<a name="the-data-model"></a>
## 2. The Data Model: 8 Life Dimensions

Every analytical technique in the app maps back to 8 life dimensions:

| Dimension | What it tracks |
|-----------|---------------|
| **Career** | Job satisfaction, professional growth, leadership, income |
| **Finance** | Budget health, savings, debt, investments |
| **Health** | Sleep, stress, energy, mental wellness |
| **Fitness** | Exercise frequency, steps, cardio, strength |
| **Family** | Parenting, home life, family relationships |
| **Social** | Friendships, community, networking |
| **Romance** | Partner relationship, dating, intimacy |
| **Growth** | Learning, skills, reading, personal development |

**Why 8 dimensions?** Life satisfaction research consistently shows that wellbeing is multi-dimensional. A user scoring 9/10 in Career but 2/10 in Health has a fundamentally different experience than someone at 5/10 across the board. The system tracks each dimension independently to detect trade-offs, correlations, and imbalances.

**Source**: `packages/core/src/enums.ts` — `Dimension` enum and `DIMENSION_LABELS`

---

<a name="layer-1"></a>
## 3. Layer 1 — Signal Ingestion & Feature Extraction

### 3.1 Check-In Data (Primary Signal)

Users submit check-ins containing:
- **Mood** (1-10 scale)
- **Dimension scores** (1-10 per dimension)
- **Journal entry** (free text)
- **Duration type** (quick vs. deep)

This is the richest and most reliable signal. Every downstream analysis depends on it.

**Source**: `apps/web/src/lib/services/checkin-service.ts`

### 3.2 Integration Provider Mapping

External APIs are normalized into `NormalizedSignal` objects:

```typescript
{ dimension: Dimension, score: number (0-10), confidence: number (0-1), rawData: unknown }
```

Each provider uses a domain-specific scoring formula:

#### Apple Health → Health + Fitness dimensions
```
healthScore = steps/9000 * 0.35 + sleep/8h * 0.35 + restingHR_delta * 0.20 + activeEnergy/500kcal * 0.10
fitnessScore = workouts/5 * 0.50 + activeEnergy/700kcal * 0.30 + steps/12000 * 0.20
confidence = (evidence_points_present / 5), clamped to [0.2, 1.0]
```

**What it extracts**: Sleep quality, activity level, heart rate variability, workout consistency.
**Why it matters**: Health data is objectively measured (not self-reported), providing a ground-truth signal to validate or challenge the user's self-reported Health/Fitness scores.

#### Strava → Fitness dimension
```
score = consistency/6_sessions * 0.25 + volume/180min * 0.35 + endurance/35km * 0.25 + intensity/150bpm * 0.15
confidence = (activities / 12) * 0.9 + (has_HR ? 0.1 : 0)
```

**What it extracts**: Training consistency, volume, endurance, intensity.
**Why it matters**: Multi-factor scoring avoids rewarding just one type of fitness. A user who runs 1km every day (high consistency, low volume) scores differently from someone who runs a marathon monthly (low consistency, high volume).

#### Google Calendar → Career dimension
```
score = planning/10events * 0.30 + schedule/22h * 0.45 + focus_keywords * 0.25
```

**What it extracts**: Calendar density, focus time vs. meeting time, planning behavior.
**Why it matters**: "Deep work" and "focus" event detection identifies whether the user is spending time on high-leverage activities vs. meeting overload.

#### Spotify → Growth dimension
```
score = artist_diversity * 0.35 + content_score * 0.20 + listening_volume * 0.25 + curation * 0.20
```

**What it extracts**: Musical breadth, listening habits, exploration vs. repetition.
**Why it matters**: Research links musical exploration to openness and growth mindset. Sudden shifts to melancholic genres can indicate mood changes (the mentor system explicitly watches for this).

#### Notion → Growth dimension
```
score = activity/30pages * 0.45 + structure/8dbs * 0.20 + recency * 0.35
```

**What it extracts**: Knowledge management activity, system organization, recent engagement.

#### Slack → Career + Social dimensions
```
careerScore = collaboration * 0.50 + network_breadth * 0.25 + focused_coordination * 0.25
socialScore = network_breadth * 0.50 + collaboration * 0.30 + focused_coordination * 0.20
```

**What it extracts**: Collaboration patterns, network size, ratio of public vs. private communication.

**Source**: `packages/core/src/feature-extraction.ts`

### 3.3 Typed Feature Extraction (Connectors)

For providers with structured APIs (Strava, Google Calendar), the system extracts typed `NormalisedFeature` objects:

```typescript
{ feature: string, dimension: Dimension, value: number, source: string, confidence: number, recordedAt: Date }
```

Examples:
- Strava: `distance_km`, `moving_time_min`, `avg_heart_rate`, `suffer_score`
- Calendar: `event_count`, `meeting_minutes`, `focus_minutes`

**Why this matters**: Raw features are preserved alongside the composite score, enabling future ML models to learn from granular data rather than pre-aggregated scores.

**Source**: `packages/core/src/feature-extraction.ts` — `extractStravaFeatures()`, `extractCalendarFeatures()`

### 3.4 Onboarding Profile Extraction

During onboarding, the system extracts user profile data from natural conversation using regex-based NLP:

| Pattern | Regex | Extracts |
|---------|-------|----------|
| Name | `/my name is\s+([A-Za-z]...)/i` | First name |
| Location | `/i live in\|i am based in\|i'm from/i` | City/region |
| Profession | `/i am\|i'm\|i work as/i` | Job title |
| Marital status | `/single\|married\|partnered\|divorced/i` | Relationship status |
| Interests | `/i enjoy\|i like\|my interests include/i` | Comma-separated list |
| Goals | `/my goal is to\|i want to\|i'd like to/i` | Goal text + inferred horizon |

Goal horizon is inferred from temporal keywords:
- "this week/month" → short (1-6 months)
- "this year/12 months" → medium (6-18 months)
- "2 years/someday" → long (18-60 months)

**Why regex over LLM?** Speed and cost. This runs on every message during onboarding — an LLM call per message would add 200-500ms latency and API cost. The regex approach is instant, deterministic, and good enough for initial profiling. The LLM layer (`packages/ai`) can refine later.

**Source**: `apps/web/src/lib/onboarding-extraction.ts`

---

<a name="layer-2"></a>
## 4. Layer 2 — Statistical Analysis

### 4.1 Pearson Correlation

**What it computes**: The linear relationship between two time series (r in [-1, +1]).

```
r = Σ(x - x̄)(y - ȳ) / √[Σ(x - x̄)² · Σ(y - ȳ)²]
```

**Where it's used**:
1. **Goal correlation** (`goal-correlation.ts`): Correlates mood series with dimension score series to detect which dimensions drive a goal's trajectory.
2. **Cross-dimension correlation** (`correlation.ts`): Computes all pairwise correlations between the 8 dimensions to find which dimensions move together.

**Example insight**: "Your Career trajectory tends to improve when Finance scores rise" (r=0.72, meaning they move together strongly).

**Why Pearson specifically?** It captures linear relationships in continuously scored data (1-10 scales). The system explicitly filters out weak correlations (|r| < 0.25 for goals, |r| < 0.3 for cross-dimension) to avoid noise.

**Source**: `packages/core/src/correlation.ts` — `pearsonCorrelation()`

### 4.2 Lagged Correlation

**What it computes**: The strongest correlation when one series is shifted by 0-3 days relative to another.

```
For each lag in [-3, +3]:
  Align x[i] with y[i + lag]
  Compute Pearson r
  Keep the lag with highest |r|
```

**Why this matters**: Life dimensions don't always move simultaneously. Poor sleep on Monday might show up as low Career performance on Wednesday. The lag detection surfaces these delayed effects:
- "Health and Career move together with a 2-day lag" → sleep deprivation affects work performance 2 days later
- "Fitness and Romance have a 1-day lag" → exercise today correlates with better relationship scores tomorrow

**Tie-breaking**: When multiple lags produce the same |r|, the system prefers: higher overlap → smaller |lag| (Occam's razor — the simplest explanation wins).

**Source**: `packages/core/src/correlation.ts` — `laggedCorrelation()`

### 4.3 Statistical Significance (p-value)

**What it computes**: The probability that the observed correlation occurred by chance.

The system uses Fisher Z transformation:
```
Z = 0.5 * ln((1 + r) / (1 - r))
z_score = |Z| * √(n - 3)
p = 2 * (1 - Φ(z_score))    // two-tailed test
```

Where Φ is the normal CDF, approximated using the Abramowitz & Stegun error function.

**Guardrails applied**:
- Minimum sample size: n ≥ 14 (two weeks of data)
- Minimum effect size: |r| ≥ 0.3 (moderate correlation)
- Minimum confidence threshold: varies by context (0.45 for goals, 0.55 for holistic synthesis)

**Why these thresholds?** With daily check-ins, the first two weeks produce ~14 data points. Below that, even strong correlations are statistically unreliable. The |r| ≥ 0.3 threshold filters out "technically significant but practically meaningless" correlations.

**Source**: `packages/core/src/correlation.ts` — `approximatePValue()`, `computeConfidence()`

### 4.4 Confidence Scoring

**What it computes**: A composite confidence score (0-1) blending three factors:

```
confidence = 0.45 * effect_size + 0.35 * statistical_significance + 0.20 * sample_size
```

Where:
- `effect_size` = how far |r| exceeds 0.3, normalized to [0, 1]
- `statistical_significance` = 1 - p_value
- `sample_size` = how far n exceeds 14, normalized over 30 days

**Why a composite score?** A high r with 15 data points is less trustworthy than a moderate r with 60 data points. The composite balances effect size (how big is the relationship?), significance (could it be random?), and sample size (how much evidence exists?).

**Source**: `packages/core/src/correlation.ts` — `computeConfidence()`

### 4.5 Trend Detection (Linear Regression Slope)

**What it computes**: The slope of a best-fit line through equally-spaced score values.

```
slope = (n * Σxy - Σx * Σy) / (n * Σx² - (Σx)²)
```

- Positive slope = improving
- Negative slope = declining
- Near-zero slope = stable

**Where it's used**:
- Weekly digest: mood trend slope over the last 7 days
- Dashboard: dimension trend direction
- Holistic synthesis: trend data per dimension

**Why linear regression?** With 7-14 daily data points, more complex models (ARIMA, exponential smoothing) are overkill. A simple slope captures "are things getting better or worse?" without overfitting.

**Source**: `packages/core/src/scoring.ts` — `computeTrend()`

### 4.6 Moving Average

**What it computes**: A sliding window average for smoothing noisy time series.

```
For window size w:
  result[i] = mean(scores[i-w+1 ... i])
```

**Why it matters**: Raw daily scores are noisy (one bad day doesn't mean a downward trend). The moving average smooths out daily variance to reveal the underlying trajectory.

**Source**: `packages/core/src/scoring.ts` — `computeMovingAverage()`

### 4.7 Volatility (Sample Standard Deviation)

**What it computes**: How much a dimension's scores fluctuate.

```
σ = √[Σ(x - x̄)² / (n - 1)]
```

**Why it matters**: High volatility in a dimension signals instability. A user with Health scores bouncing between 3 and 9 has a different experience than someone stable at 6. The balance index uses volatility to detect this.

**Source**: `packages/core/src/scoring.ts` — `computeVolatility()`

### 4.8 Balance Index

**What it computes**: How evenly balanced the user's dimension scores are (0 = completely imbalanced, 1 = perfectly balanced).

```
normalizedSpread = volatility / max(|mean|, 1)
balance = 1 - normalizedSpread
```

**Why it matters**: A user scoring 9/10 in Career but 2/10 in Health is "succeeding" in aggregate (mean = 5.5) but deeply imbalanced. The balance index captures this — high balance means all dimensions are similarly scored, not that all scores are high.

**Source**: `packages/core/src/scoring.ts` — `computeBalanceIndex()`

### 4.9 Streak Computation

**What it computes**: Consecutive days of check-ins ending on the reference date.

```
While dateSet.has(current):
  streak++
  current = previousDay(current)
```

**Why it matters**: Consistency of self-reporting is itself a metric. A 30-day streak means the analytical engine has 30 data points — enough for strong correlations. The system uses streak data to:
- Encourage consistency ("Protect your 14-day streak")
- Gate certain insights (cross-dimension correlations require n ≥ 14)
- Calculate week-over-week streak trends

**Source**: `packages/core/src/scoring.ts` — `computeStreak()`

### 4.10 Week Bucketing & Delta Analysis

**What it computes**: Splits check-ins into current week and previous week, then computes deltas.

```
current_week = checkins where date ∈ [referenceDate - 6, referenceDate]
previous_week = checkins where date ∈ [referenceDate - 13, referenceDate - 7]
mood_delta = avg_mood(current) - avg_mood(previous)
```

**Where it's used**:
- Dashboard insights: "Mood trend is improving" / "Mood trend is softening" (threshold: |delta| ≥ 0.4 points)
- Weekly digest: week-over-week dimension comparisons
- Rising dimensions: dimensions that improved ≥ 0.5 points week-over-week

**Source**: `apps/web/src/lib/weekly-digest.ts`, `apps/web/src/lib/dashboard-insights.ts`

### 4.11 Novelty-Ranked Insights

**What it computes**: Correlations are ranked by a composite of novelty (has the user seen this before?) and confidence.

```
composite_score = novelty * 0.65 + confidence * 0.35
novelty = 1.0 (new pattern) or 0.2 (previously shown)
```

**Why novelty matters**: Showing the same "Health and Fitness are correlated" insight every day is useless. The novelty ranking prioritizes new discoveries, then falls back to previously-seen high-confidence patterns.

**Source**: `packages/core/src/correlation.ts` — `rankInsightsByNovelty()`

### 4.12 Goal Timeline Progress

**What it computes**: How much of a goal's timeline has elapsed.

```
horizonDays = { short: 180, medium: 540, long: 1825 }
startedAt = targetDate - horizonDays
progress = (now - startedAt) / (targetDate - startedAt) * 100
```

**Why this matters**: Combined with momentum labels ("on_track", "at_risk", "completed"), this identifies goals that are running out of time. A goal at 85% timeline with little progress triggers an "at_risk" alert.

**Source**: `apps/web/src/lib/goal-correlation.ts`

---

<a name="layer-3"></a>
## 5. Layer 3 — Client-Side ML (Transformers.js)

All client-side ML runs in a Web Worker to keep the main thread responsive. Models are downloaded from Hugging Face CDN on first use (~160MB total) and cached in IndexedDB.

### 5.1 Semantic Embeddings

**Model**: `Xenova/all-MiniLM-L6-v2` (~23MB quantized)
**Output**: 384-dimensional Float32Array, L2-normalized

**How it works**:
1. Text is tokenized and passed through a 6-layer MiniLM transformer
2. Token embeddings are mean-pooled (averaged across all tokens)
3. The resulting vector is L2-normalized to unit length

**What it enables**:
- **Cosine similarity**: Since vectors are unit-length, cosine similarity = dot product. Two journal entries about "feeling stressed at work" and "career pressure is mounting" will have high similarity (~0.85) even though they share no exact words.
- **Cross-dimension insight matching**: Journal embeddings are compared against dimension prototype embeddings to find which dimensions a free-text entry relates to.

**Why this matters**: The keyword-based dimension inference (`DIMENSION_KEYWORDS` in `goal-correlation.ts`) fails on synonyms — "got promoted" contains no keyword from the `career` list. Semantic embeddings understand that "got promoted" is about career without needing the word "career" to appear.

**Source**: `packages/ai-local/src/embed.ts`, `apps/web/src/lib/dashboard-insights.ts` — `cosineSimilarity()`, `findSemanticDimensionMatches()`

### 5.2 Zero-Shot Text Classification

**Model**: `Xenova/mobilebert-uncased-mnli` (~25MB quantized)
**Output**: Probability distribution over 8 dimension labels

**How it works**:
1. Text is paired with each candidate label ("This text is about {career}")
2. A Natural Language Inference (NLI) model scores entailment vs. contradiction
3. Entailment scores become dimension probabilities

**Example**:
```
Input: "Got promoted to team lead after finishing my MBA"
Output: { career: 0.89, growth: 0.72, finance: 0.45, ... }
```

**What it enables**: `inferGoalDimensionSemantic()` replaces the brittle keyword matching for goal dimension assignment. The system falls back to keyword matching if the ML model is unavailable.

**Why zero-shot NLI?** No training data needed. The model generalizes to any label set — if the app adds a 9th dimension, it works immediately without retraining.

**Source**: `packages/ai-local/src/classify.ts`, `apps/web/src/lib/goal-correlation.ts` — `inferGoalDimensionSemantic()`

### 5.3 Abstractive Summarization

**Model**: `Xenova/distilbart-cnn-6-6` (~110MB quantized)
**Output**: Condensed text summary

**How it works**:
1. Input text is tokenized and encoded by a 6-layer DistilBART encoder
2. A 6-layer decoder generates summary tokens autoregressively
3. Output is constrained by `max_new_tokens` (default: 100) and `min_length`

**Where it's used**:
- **Journal preview**: Real-time summary preview as the user types a journal entry (debounced 500ms)
- **Weekly digest enhancement**: When the Gemini API is unavailable, the local summarizer condenses the week's journal entries into a mentor note
- **`buildFallbackWeeklyDigestWithAI()`**: Replaces the static mentor note template with a personalized summary

**Why local summarization?** Gemini produces better summaries, but requires an API call (200-500ms latency, cost per call, requires internet). The local model runs instantly after first load, works offline, and provides a real-time preview experience that would be impractical with an API.

**Source**: `packages/ai-local/src/summarize.ts`, `apps/web/src/lib/weekly-digest.ts`, `apps/web/src/components/checkin/journal-preview.tsx`

### 5.4 Web Worker Architecture

All three ML pipelines run in a single shared Web Worker:

```
Main Thread                          Web Worker
───────────                          ──────────
AILocalClient.embed("text")    ─►    feature-extraction pipeline
  promise map: id → resolve    ◄─    Float32Array[384] (zero-copy transfer)

AILocalClient.classify("text") ─►    zero-shot-classification pipeline
  promise map: id → resolve    ◄─    { career: 0.89, ... }

AILocalClient.summarize("text") ─►   summarization pipeline
  promise map: id → resolve     ◄─   "summary string"
```

**Why a Web Worker?** Transformers.js runs ONNX Runtime (WebAssembly), which is compute-intensive. Without a Worker, inference would freeze the UI for 100-500ms per call. The Worker keeps the main thread free, and `Float32Array` buffers are transferred (not copied) via structured clone for zero-copy performance.

**Source**: `packages/ai-local/src/worker.ts`, `packages/ai-local/src/index.ts` — `AILocalClient`

---

<a name="layer-4"></a>
## 6. Layer 4 — Server-Side AI (Gemini)

### 6.1 Insight Generation (Gemini 1.5 Flash)

**Input**: Check-in time series + world context (weather, local news)
**Output**: JSON array of typed insights (trend, correlation, suggestion)

The model receives:
- Mood and dimension score history
- World context (weather, professional trends)
- Instructions to detect trends, correlations, and actionable suggestions

**Why Gemini for insights?** The statistical engine detects patterns but can't explain them in natural language. Gemini bridges the gap: "Your Health scores have been declining since Tuesday — this coincides with the cold snap in your area. Consider indoor exercise alternatives."

**Source**: `packages/ai/src/insights.ts`

### 6.2 Pathway Generation (Gemini 1.5 Pro)

**Input**: Goal definition + user profile + current dimension scores + rough plan
**Output**: Structured pathway with steps, dimension impacts, risks, suggestions

The model:
1. Structures a rough plan into 5-10 concrete steps
2. Scores each step's impact on all 8 dimensions (-5 to +5)
3. Identifies risks based on current trends
4. Suggests mitigation strategies

**Why Gemini 1.5 Pro (not Flash)?** Pathway generation requires multi-step reasoning about trade-offs. A goal of "Get promoted" might help Career (+4) but risk Health (-2) and Family (-1). The Pro model handles this nuanced reasoning better.

**Source**: `packages/ai/src/pathways.ts`

### 6.3 Voice Journal Analysis (Gemini 1.5 Flash)

**Input**: Spoken transcript from voice check-in
**Output**: Extracted mood (1-10), dimension scores with notes, polished journal entry

The model:
1. Extracts a mood score from the spoken content
2. Identifies mentioned dimensions and assigns scores
3. Cleans the transcript (removes filler words, fixes grammar)

**Why AI for voice?** Voice transcripts are messy ("um, yeah, so work was, um, pretty stressful"). The model simultaneously extracts structured data and produces a readable journal entry.

**Source**: `packages/ai/src/voice-analysis.ts`

### 6.4 Nudge Generation (Gemini 1.5 Flash)

**Input**: Holistic state synthesis (scores + trends + correlations + goals)
**Output**: 1-2 short actionable nudges (max 20 words each)

The holistic state synthesis (`synthesizeHolisticState`) feeds the AI with:
- Average scores per dimension
- Trend directions
- Top 3 correlation patterns (with narratives)
- Balance index
- Active goals and pathway steps

**Why AI-generated nudges?** Deterministic nudges repeat. AI nudges adapt to the user's current state: "Your Fitness trend is up but Career is dipping — protect your gym routine while scheduling one focus block today."

**Source**: `apps/web/src/lib/services/nudge-engine.ts`, `packages/ai/src/personas.ts`

### 6.5 Mentor Persona System

Three mentor archetypes shape all AI responses:

| Archetype | Persona | Tone | When to use |
|-----------|---------|------|-------------|
| **Therapist** | Eleanor | Warm, reflective, validating | Low mood, emotional processing |
| **Coach** | Theo | Direct, action-oriented, encouraging | High energy, goal pursuit |
| **Sage** | Maya | Philosophical, systems-thinking | Pattern recognition, perspective |

The system prompt includes:
- Profession-aware context (industry-specific stressors)
- Integration data summaries (Spotify mood shifts, sleep patterns, financial trends)
- Correlation patterns (framed as "exploratory, not causal")
- Conversation memory (recent summaries for continuity)
- Mood adaptation (tone shifts based on current mood level)

**Source**: `packages/ai/src/personas.ts`, `apps/web/src/lib/mentor-orchestrator.ts`

---

<a name="layer-5"></a>
## 7. Layer 5 — Insight Synthesis & Delivery

### 7.1 Dashboard Insights

Insights are generated and prioritized by type:

| Priority | Type | Source | Example |
|----------|------|--------|---------|
| 0 | `goal_risk` | Timeline analysis | "7 days left with 90% timeline elapsed" |
| 1 | `goal_progress` | Timeline + momentum | "Momentum building on Learn Spanish" |
| 2 | `correlation` | Pearson r + lagged r | "Career and Finance move together" |
| 3 | `trend` | Week-over-week delta | "Mood trend is improving" |
| 4 | `suggestion` | Weakest dimension | "Support your Social dimension" |

Maximum 6 insights are shown, sorted by priority. This ensures urgent signals (at-risk goals) always surface above general suggestions.

**Source**: `apps/web/src/lib/dashboard-insights.ts`

### 7.2 Weekly Digest

The weekly digest has two paths:

**Gemini path**: Sends a structured prompt with all stats to Gemini 1.5 Flash, requesting JSON sections (wins, patterns, focus areas, mentor note).

**Fallback path**: If Gemini is unavailable, generates deterministic sections from computed stats. If the local summarizer is available, it enriches the mentor note by summarizing the week's journal entries.

**Source**: `apps/web/src/lib/weekly-digest.ts`

### 7.3 Holistic State Synthesis

The system's central "brain" that combines all signals into a unified context:

```
synthesizeHolisticState(world, performance, intent)
  ├── world: weather, nearby hubs, professional trends
  ├── performance: scores, trends, activities, correlation matrix
  └── intent: active goals, current pathway step

  Output:
  ├── primaryFocus: the weakest dimension (opportunity gap)
  ├── balanceIndex: 0-1 balance score
  ├── correlationHighlights: top 3 novel, significant patterns
  ├── narratives: human-readable correlation descriptions
  └── actionableIntelligence: the most important insight
```

This synthesis is consumed by:
- Nudge generation (AI creates nudges from the holistic state)
- Mentor prompts (the mentor sees the full context)
- Dashboard rendering (primary focus, balance visualization)

**Source**: `packages/core/src/holistic.ts`

### 7.4 Micro-Moment Nudges

Time-windowed nudges (morning/midday/evening) adapt to:
- **Mood level**: Low mood → "Keep it soft right now; one tiny action is enough." High mood → "You have usable energy; channel it into one clear move."
- **Mentor archetype**: Coach → "commit", Sage → "honor", Therapist → "offer"
- **Cadence preference**: Light (2/day), Balanced (3/day), Focused (3/day with intensity)
- **Nearest active goal**: Nudges reference the most urgent goal by name

Nudge IDs are deterministic (hash of date + window + archetype + user + goal + mood), ensuring the same nudge isn't regenerated on page refresh.

**Source**: `apps/web/src/lib/micro-moments.ts`

---

<a name="supporting-systems"></a>
## 8. Supporting Systems

### 8.1 Mood Adaptation

**What it computes**: A weighted mood level that blends the latest check-in with a 5-day rolling average.

```
weightedMood = latest * 0.70 + rolling_average * 0.30
level = weightedMood ≤ 4.5 → "low" | ≥ 7.5 → "high" | else → "neutral"
```

Each level has a tone modifier that adjusts AI response style (more warmth for low mood, more energy for high mood).

**Why weighted?** A single bad day shouldn't trigger "low mood" mode if the user has been doing well all week. The 70/30 blend respects the current state while considering recent context.

**Source**: `apps/web/src/lib/mood-adapter.ts`

### 8.2 Conversation Memory

A circular buffer (max 50 entries) storing two types of memory:
- **Key facts**: Extracted from conversations ("User mentioned daughter's birthday is next week")
- **Exchange summaries**: Condensed conversation turns for continuity

The memory snapshot (last 8 entries) is injected into every mentor prompt, enabling multi-session continuity without storing full conversation history.

**Source**: `apps/web/src/lib/conversation-memory.ts`

### 8.3 Session Integrity (FNV-1a Hashing)

Onboarding sessions use FNV-1a hash checksums to detect data corruption:

```javascript
hash = 2166136261  // FNV offset basis
for each char:
  hash ^= charCode
  hash = hash * 16777619  // FNV prime
return (hash >>> 0).toString(16)
```

This enables:
- **Write-conflict detection**: If two tabs modify the session, the checksum mismatch is detected and the newer data wins
- **Corruption recovery**: Invalid sessions are repaired with logged repair reasons
- **Payload budgeting**: Sessions are capped at 200KB; oldest messages are trimmed when exceeded

**Source**: `apps/web/src/lib/onboarding-session.ts`

---

<a name="data-flow"></a>
## 9. Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA SOURCES                                      │
├────────────────┬──────────────┬───────────────┬──────────────┬──────────────┤
│ Check-ins      │ Integrations │ Voice         │ Onboarding   │ Goals        │
│ mood, scores,  │ Strava, Cal, │ Transcripts   │ Conversation │ title, dims, │
│ journal, type  │ Spotify, etc │               │ messages     │ milestones   │
└───────┬────────┴──────┬───────┴───────┬───────┴──────┬───────┴──────┬───────┘
        │               │               │              │              │
        ▼               ▼               ▼              ▼              ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                    LAYER 1: SIGNAL NORMALIZATION                          │
│  normalizeProviderPayload() → NormalizedSignal { dim, score, confidence }│
│  extractProfileDeterministically() → regex-based NLP                     │
│  extractStravaFeatures() / extractCalendarFeatures() → NormalisedFeature│
└───────────────────────────────────┬───────────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                    LAYER 2: STATISTICAL ANALYSIS                          │
│  pearsonCorrelation() ──► laggedCorrelation() ──► approximatePValue()    │
│  computeTrend() ──► computeMovingAverage() ──► computeVolatility()       │
│  computeStreak() ──► computeBalanceIndex() ──► computeAllPairCorrelations│
│  detectSignificantPatterns() ──► rankInsightsByNovelty()                  │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌─────────────────────┐ ┌────────────────────┐ ┌─────────────────────────┐
│  LAYER 3: LOCAL ML  │ │ LAYER 4: GEMINI AI │ │ HOLISTIC SYNTHESIS      │
│  (Web Worker)       │ │ (Server-side)      │ │                         │
│                     │ │                    │ │ synthesizeHolisticState()│
│  embed() → 384-dim  │ │ generateInsights() │ │   ├── primaryFocus      │
│  classify() → dims  │ │ generatePathway()  │ │   ├── balanceIndex      │
│  summarize() → text │ │ analyzeVoice()     │ │   ├── correlationHighs  │
│                     │ │ generateNudges()   │ │   └── actionableIntel   │
└─────────┬───────────┘ └────────┬───────────┘ └────────────┬────────────┘
          │                      │                           │
          └──────────────────────┼───────────────────────────┘
                                 ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                    LAYER 5: INSIGHT DELIVERY                              │
│  buildDashboardInsights() → prioritized insight cards                     │
│  buildWeeklyDigestSeed() → weekly summary with stats + patterns          │
│  generateMicroMomentNudges() → time-windowed actionable nudges           │
│  buildMentorSystemPrompt() → context-rich AI mentor conversations        │
│  inferMoodAdaptation() → tone-adjusted responses                         │
└───────────────────────────────────────────────────────────────────────────┘
```

---

<a name="file-index"></a>
## 10. File Index

### Core Analytics (`packages/core/src/`)
| File | Techniques | Key Functions |
|------|-----------|---------------|
| `correlation.ts` | Pearson r, lagged correlation, Fisher Z p-value, confidence scoring, novelty ranking | `pearsonCorrelation`, `laggedCorrelation`, `computeAllPairCorrelations`, `detectSignificantPatterns`, `rankInsightsByNovelty` |
| `scoring.ts` | Linear regression, moving average, sample std dev, balance index, streak counting | `computeTrend`, `computeMovingAverage`, `computeVolatility`, `computeBalanceIndex`, `computeStreak`, `computeWeightedScore` |
| `holistic.ts` | Multi-signal synthesis, opportunity gap detection | `synthesizeHolisticState` |
| `feature-extraction.ts` | Weighted composite scoring, provider normalization, typed feature extraction | `normalizeProviderPayload`, `extractStravaFeatures`, `extractCalendarFeatures` |
| `enums.ts` | Dimension model, label registry | `Dimension`, `ALL_DIMENSIONS`, `DIMENSION_LABELS` |

### Client-Side ML (`packages/ai-local/src/`)
| File | Techniques | Key Functions |
|------|-----------|---------------|
| `embed.ts` | Transformer feature extraction, mean pooling, L2 normalization | `embed`, `embedBatch` |
| `classify.ts` | Zero-shot NLI classification | `classifyDimension` |
| `summarize.ts` | Abstractive summarization | `summarize` |
| `worker.ts` | Web Worker message protocol, zero-copy buffer transfer | Message handler |
| `index.ts` | Promise-map request routing | `AILocalClient` |
| `models.ts` | Model registry | `MODEL_REGISTRY` |

### Server-Side AI (`packages/ai/src/`)
| File | Techniques | Key Functions |
|------|-----------|---------------|
| `insights.ts` | LLM-powered trend/correlation/suggestion detection | `generateInsights` |
| `pathways.ts` | LLM-powered goal pathway generation with dimension impact scoring | `generatePathway` |
| `voice-analysis.ts` | LLM-powered transcript → structured data extraction | `analyzeVoiceJournal` |
| `personas.ts` | Context-aware prompt engineering with correlation injection | `buildSystemPrompt` |
| `chat.ts` | Streaming chat with Gemini | `streamMentorChat` |

### App-Level Analysis (`apps/web/src/lib/`)
| File | Techniques | Key Functions |
|------|-----------|---------------|
| `goal-correlation.ts` | Keyword-based + semantic dimension inference, timeline progress, mood-dimension correlation | `inferGoalDimension`, `inferGoalDimensionSemantic`, `buildGoalInsights` |
| `dashboard-insights.ts` | Cosine similarity, semantic dimension matching, priority-ranked insight generation | `cosineSimilarity`, `findSemanticDimensionMatches`, `buildDashboardInsights` |
| `weekly-digest.ts` | Week bucketing, delta analysis, AI-enhanced fallback | `buildWeeklyDigestSeed`, `buildFallbackWeeklyDigest`, `buildFallbackWeeklyDigestWithAI` |
| `mood-adapter.ts` | Weighted mood level inference, tone adaptation | `inferMoodAdaptation` |
| `micro-moments.ts` | Time-windowed nudge scheduling, deterministic hashing | `generateMicroMomentNudges`, `getDeterministicNextNudgeSuggestion` |
| `conversation-memory.ts` | Circular buffer memory, key-fact extraction | `appendConversationMemoryEntry`, `buildConversationMemorySnapshot` |
| `mentor-orchestrator.ts` | Multi-signal prompt assembly | `buildMentorSystemPrompt`, `buildGuidedMeditationPrompt` |
| `onboarding-extraction.ts` | Regex-based NLP, profile merging | `extractProfileDeterministically`, `mergeExtractedProfiles` |
| `onboarding-session.ts` | FNV-1a hashing, checksum validation, payload budgeting | `buildOnboardingSession`, `parseOnboardingSession` |
| `use-ai-local.ts` | React hook lifecycle for ML client | `useAILocal` |

### Research-Backed Redesign Additions (`packages/core/src/`)
| File | Techniques | Key Functions |
|------|-----------|---------------|
| `health/hrv-analysis.ts` | RMSSD, SDNN, stress classification from RR intervals | `computeHRVMetrics` |
| `integrations/spotify-mood.ts` | Russell's Circumplex Model mood classification from audio features | `classifyMoodFromAudioFeatures`, `aggregateTrackMoods` |
| `integrations/strava-mood.ts` | Exercise-mood lagged correlation (0 to maxLag days) | `computeExerciseMoodLag` |
| `integrations/financial-stress.ts` | Financial stress index (spending deviation, income stability, impulse detection) | `computeFinancialStressIndex`, `computeSpendingBaseline` |
| `nlp/linguistic-biomarkers.ts` | Cognitive distortion detection (all-or-nothing, catastrophising, personalisation) | `detectLinguisticBiomarkers` |
| `federated/aggregation.ts` | Sample-count-weighted FedAvg gradient aggregation | `aggregateGradients` |
| `ml/model-types.ts` | Ridge regression model artifact types | `ModelArtifact`, `TrainingRequest`, `TrainingResult` |
| `jitai/rules.ts` | Context-aware intervention rule engine | `evaluateJITAIRules` |
| `privacy/opt-in-tiers.ts` | Tiered data sharing and feature gating | `isFeatureAvailable` |
| `ema/question-selector.ts` | Adaptive EMA question selection with burden budgeting | `selectQuestions` |
| `safety/crisis-detection.ts` | Two-tier regex crisis pattern matching with false-positive suppression | `detectCrisisIndicators` |
| `profiling/psychometric-scoring.ts` | PHQ-9 and GAD-7 clinical instrument scoring with input clamping | `scorePHQ9`, `scoreGAD7` |

---

<a name="nof1-models"></a>
## 11. N-of-1 Personalised Prediction Models

**What it does**: Trains a per-user ridge regression model to predict dimension scores from feature vectors. Each user gets their own model, trained only on their data.

**Model**: Ridge regression (L2-regularised linear model)
- Input features: extracted from `feature_store` (mood history, sleep, exercise, HRV, etc.)
- Target: a specific dimension score (e.g., predict tomorrow's Health score)
- Output: `ModelArtifact` containing weights, intercept, feature importance, and training metrics (MSE, R²)

**Why ridge regression?** With 30-100 data points per user, complex models (neural nets, gradient boosting) overfit badly. Ridge regression is stable with small n, interpretable (each weight maps to a feature), and fast to train on-device or server-side. The L2 penalty prevents any single feature from dominating.

**Storage**: `model_artifacts` table (migration `00036`) — one row per user per dimension per model version.

**Minimum samples**: 30 data points required before training (configurable via `TrainingRequest.minSamples`).

**Source**: `packages/core/src/ml/model-types.ts`

---

<a name="shap-explainability"></a>
## 12. SHAP Explainability

**What it does**: Computes SHAP (SHapley Additive exPlanations) values for each prediction to explain why the model made a specific prediction.

**For linear models**, SHAP values have a closed-form solution:
```
shap_value[i] = weight[i] * (feature_value[i] - mean_feature_value[i])
```

Each SHAP explanation contains:
- `base_value`: the model intercept (average prediction)
- `predicted_value`: the actual prediction
- `feature_contributions`: array of `{feature, value, shap_value}` — how much each feature pushed the prediction above or below the base value

**Why SHAP?** Users seeing "predicted Health: 3.2" is useless without context. SHAP enables explanations like: "Your predicted Health is 3.2 — sleep quality (-1.1) and exercise (-0.5) are pulling it down, while social activity (+0.8) is helping."

**Storage**: `shap_explanations` table (migration `00037`).

---

<a name="federated-learning"></a>
## 13. Federated Learning

**What it does**: Enables population-level model improvement without any user sharing raw data.

**Pipeline**:
```
1. Local training: Each user trains a ridge regression model locally
2. Gradient encoding: Model weights + bias + sample count are packaged
3. Submission: Encoded gradients submitted to a federated round (gradient_submissions)
4. Round management: Coordinator opens rounds, waits for min_participants (default 5)
5. Aggregation: Sample-count-weighted FedAvg
     avgWeight[i] = Σ (weight[i] * sampleCount / totalSamples) for each participant
6. Distribution: Aggregate weights distributed as initialisation for next local training cycle
```

**Aggregation formula (FedAvg)**:
```
For each weight dimension i:
  avgWeight[i] = Σ_k (n_k / N) * w_k[i]

Where n_k = samples from participant k, N = total samples, w_k = participant k's weights
```

**Privacy guarantees**:
- Server never sees raw user data — only model gradients
- Minimum participant threshold prevents de-anonymisation from small rounds
- Opt-in only (requires `Full` privacy tier)

**Storage**: `federated_rounds` + `gradient_submissions` (migration `00041`).

**Source**: `packages/core/src/federated/aggregation.ts`

---

<a name="spotify-mood"></a>
## 14. Spotify Mood Classification

**What it does**: Classifies listening mood from Spotify audio features using Russell's Circumplex Model of Affect.

**Model**: Russell's Circumplex maps emotions on two axes:
- **Valence** (x-axis): negative ← → positive emotion (Spotify `valence` feature, 0-1)
- **Energy** (y-axis): low ← → high arousal (Spotify `energy` feature, 0-1)

**Quadrant classification**:
| Valence | Energy | Mood |
|---------|--------|------|
| High (≥0.5) | High (≥0.5) | `energetic` (if both ≥0.7) or `happy` |
| High (≥0.5) | Low (<0.5) | `calm` |
| Low (<0.5) | High (≥0.5) | `tense` |
| Low (<0.5) | Low (<0.5) | `melancholic` |

**Confidence**: Based on distance from center point (0.5, 0.5). Points near the center are ambiguous (low confidence); points near the edges are clear (high confidence).
```
confidence = min(1, sqrt((valence - 0.5)² + (energy - 0.5)²) * 2)
```

**Multi-track aggregation**: `aggregateTrackMoods()` averages audio features across recently played tracks before classifying.

**Why this matters**: Sudden shifts from high-valence to low-valence listening patterns can indicate mood changes. The mentor system can detect "your listening has shifted toward more melancholic music this week" and probe gently.

**Source**: `packages/core/src/integrations/spotify-mood.ts`

---

<a name="exercise-mood-lag"></a>
## 15. Exercise-Mood Lag Analysis

**What it does**: Computes the correlation between exercise intensity and mood at different time lags (0 to N days).

**Algorithm**:
```
For each lag in [0, maxLag]:
  Pair exercise intensity on date D with mood on date D+lag
  Compute Pearson correlation over all matched pairs
  Assess significance: |r| > 2/√n (rough p<0.05 threshold)
```

**What it surfaces**:
- Lag 0: "Exercise today correlates with better mood today"
- Lag 1: "Exercise today correlates with better mood tomorrow"
- The optimal lag reveals whether exercise effects are immediate or delayed

**Significance threshold**: Uses the simple approximation `|r| > 2/√n` for p<0.05, requiring at least 4 paired observations.

**Source**: `packages/core/src/integrations/strava-mood.ts`

---

<a name="hrv-stress"></a>
## 16. HRV Stress Computation

**What it does**: Computes standard time-domain HRV metrics from raw RR interval data (inter-beat intervals in milliseconds).

**Metrics computed**:

| Metric | Formula | Meaning |
|--------|---------|---------|
| **RMSSD** | √(mean(successive_differences²)) | Parasympathetic (vagal) tone — higher = more relaxed |
| **SDNN** | σ(all_intervals) | Overall HRV — higher = more adaptive |
| **Mean RR** | mean(all_intervals) | Average time between heartbeats |
| **Mean HR** | 60000 / meanRR | Heart rate in BPM |

**Stress classification** (based on RMSSD):
| RMSSD | Stress Level | Score Range |
|-------|-------------|-------------|
| ≥ 50ms | Low | 0-50 |
| 20-49ms | Moderate | 51-80 |
| < 20ms | High | 81-100 |

**Stress score formula**: `score = max(0, min(100, round(100 * (1 - rmssd/100))))`

**Why RMSSD?** RMSSD is the gold-standard short-term HRV metric for assessing parasympathetic nervous system activity. It's robust against slow trends in heart rate and can be reliably computed from as few as 60 seconds of RR interval data.

**Source**: `packages/core/src/health/hrv-analysis.ts`, storage in `hrv_metrics` table (migration `00034`)

---

<a name="linguistic-biomarkers"></a>
## 17. Linguistic Biomarker Detection

**What it does**: Scans journal text for cognitive distortions and sentiment indicators that may signal psychological distress.

**Cognitive distortions detected**:

| Distortion | Pattern Examples | Confidence |
|-----------|------------------|------------|
| All-or-nothing thinking | "always", "never", "everything", "completely" | 0.70 |
| Catastrophising | "worst", "terrible", "disaster", "unbearable" | 0.75 |
| Personalisation | "my fault", "because of me", "I caused" | 0.80 |

**Sentiment indicators** (word counts):
- Negative words: sad, hopeless, worthless, anxious, overwhelmed, etc.
- Positive words: happy, grateful, proud, confident, inspired, etc.
- First-person singular pronouns (I, me, my) — elevated usage correlates with depression
- Absolute terms (always, never, everything) — correlates with cognitive rigidity

**Risk classification**:
| Condition | Risk Level |
|-----------|-----------|
| ≥3 distortions OR negative words exceed positive by 3+ | `elevated` |
| ≥1 distortion | `moderate` |
| Otherwise | `low` |

**Why regex over ML?** Deterministic, instant, zero-cost, interpretable. Each detected distortion includes the exact trigger word and position for audit. ML-based approaches (BERT fine-tuning) could improve accuracy but add latency and require labelled training data.

**Source**: `packages/core/src/nlp/linguistic-biomarkers.ts`, results stored in `journal_analysis` table (migration `00040`)

---

<a name="financial-stress"></a>
## 18. Financial Stress Index

**What it does**: Computes a 0-100 financial stress index from transaction data against a spending baseline.

**Four factors** (weighted combination):

| Factor | Weight | What it measures |
|--------|--------|-----------------|
| Spending deviation | 40% | % above/below daily spending baseline |
| Income stability | 20% | Coefficient of variation of weekly income (lower CV = more stable) |
| Late-night purchases | 20% | Transactions after 22:00 (impulse spending indicator) |
| Discretionary ratio shift | 20% | Change in essential vs discretionary spending ratio |

**Stress score formula**:
```
stressIndex = spendingScore * 0.4 + incomeInstabilityScore * 0.2 + lateNightScore * 0.2 + ratioScore * 0.2
```

**Stress levels**: 0-30 = low, 31-60 = moderate, 61-100 = high

**Triggers**: Human-readable explanations generated for each contributing factor (e.g., "Spending 40% above baseline", "Late-night purchases detected").

**Baseline computation**: `computeSpendingBaseline()` calculates average daily spend, weekly income, and per-category averages from historical transactions over a configurable window.

**Source**: `packages/core/src/integrations/financial-stress.ts`
