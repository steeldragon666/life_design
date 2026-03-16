# Architecture Overview

## System Summary

Life Design is a personal analytics platform that tracks 8 life dimensions (career, finance, health, fitness, family, social, romance, growth) through daily check-ins, external data integrations, and AI-powered mentoring. It correlates signals across dimensions to surface actionable insights.

```
                        ┌─────────────────────────────────────────────┐
                        │              Vercel (syd1)                  │
                        │  ┌───────────────────────────────────────┐  │
                        │  │         Next.js 15 (App Router)       │  │
    Browser ──SSE/REST──│──│   Server Components ←→ API Routes    │  │
                        │  │   Client Components (React 19)        │  │
                        │  └─────────────┬───────────────┬─────────┘  │
                        └────────────────┼───────────────┼────────────┘
                                         │               │
                    ┌────────────────────┘               └────────────────┐
                    ▼                                                      ▼
         ┌──────────────────┐                                ┌──────────────────────┐
         │  Supabase (PG)   │                                │   External Services  │
         │  ─────────────── │                                │  ─────────────────── │
         │  Auth + RLS      │                                │  Gemini 1.5 Flash    │
         │  15 migrations   │                                │  Stripe              │
         │  23+ tables      │                                │  Strava / Spotify    │
         │  2 RPC functions │                                │  Google Calendar     │
         └──────────────────┘                                │  Apple Health (iOS)  │
                                                             │  Notion / Slack      │
                                                             │  OpenWeather         │
    ┌──────────────────────┐                                 └──────────────────────┘
    │  Browser Web Worker  │
    │  ─────────────────── │
    │  Transformers.js     │
    │  Embeddings (384d)   │
    │  Classification      │
    │  Summarisation       │
    └──────────────────────┘
```

---

## Monorepo Structure

Managed by **pnpm workspaces** with **Turborepo** for task orchestration.

```
life-design/
├── apps/
│   ├── web/                    Next.js 15 + React 19 web application
│   └── mobile/                 React Native / Expo (iOS + Android)
├── packages/
│   ├── core/                   Zero-dependency: types, enums, config, scoring,
│   │                           correlation, connectors, feature extraction
│   ├── ai/                     Server-side Gemini integration (chat, personas,
│   │                           insights, pathways, voice analysis)
│   ├── ai-local/               Browser-side Transformers.js (embeddings,
│   │                           zero-shot classification, summarisation)
│   └── ui/                     Design tokens + shared React components
├── supabase/
│   └── migrations/             15 SQL migrations (00001–00015)
├── turbo.json                  Task pipeline (build → test → lint → type-check)
├── pnpm-workspace.yaml         Workspace globs: packages/*, apps/*
└── vercel.json                 Deployment config (syd1 region, security headers)
```

### Package Dependency Graph

```
@life-design/core  (zero dependencies)
       ▲
       ├──── @life-design/ai      (+@google/generative-ai)
       ├──── @life-design/ui      (+react peer)
       └──── @life-design/ai-local (+@huggingface/transformers)

apps/web  imports all four packages
apps/mobile  imports core + ui
```

---

## Package Responsibilities

### `@life-design/core`

Zero-dependency foundation. All pure functions, types, and enums.

| Module | Responsibility |
|--------|---------------|
| `config.ts` | Validated singleton `AppConfig` from env vars; `validateConfig()` + `getConfig()` |
| `enums.ts` | `Dimension` (8), `MentorType` (3), `DurationType`, `InsightType` (5), `GoalHorizon`, `GoalStatus`, `GoalTrackingType`, `IntegrationProvider` (10), `IntegrationStatus` |
| `types.ts` | Domain interfaces: `Profile`, `CheckIn`, `DimensionScore`, `Mentor`, `Goal`, `Pathway`, `Integration`, `Subscription`, `ChatMessage` |
| `validation.ts` | Input validation + type guards |
| `scoring.ts` | `computeTrend()` (linear regression), `computeMovingAverage()`, `computeVolatility()` (sample std dev), `computeBalanceIndex()`, `computeStreak()`, `computeWeightedScore()` |
| `correlation.ts` | `pearsonCorrelation()`, `laggedCorrelation()` (0-3 day window), Fisher Z p-value, confidence scoring, `computeAllPairCorrelations()`, `detectSignificantPatterns()` |
| `feature-extraction.ts` | `normalizeSignal()`, `extractFeatures()` — transforms raw data into ML-ready feature vectors |
| `holistic.ts` | `synthesizeHolisticState()` — combines world context, performance data, and intent into unified analytical output |
| `connectors/` | `LifeConnector` interface + implementations: Strava, Google Calendar, Apple Health, OAuth manager |

### `@life-design/ai`

Server-side AI layer. Requires `GOOGLE_AI_API_KEY`.

| Module | Responsibility |
|--------|---------------|
| `client.ts` | Authenticated Gemini client initialisation |
| `chat.ts` | `sendMentorMessage()` + `streamMentorMessage()` — Gemini 1.5 Flash, temp 0.8, 1024 max tokens |
| `personas.ts` | `buildSystemPrompt()` + `PERSONA_CONFIGS` — constructs user-aware system prompts with profession, goals, dimension scores, correlation insights, conversation memory |
| `insights.ts` | AI insight generation (trend, correlation, suggestion) |
| `pathways.ts` | `generatePathway()` + `generateMilestones()` — AI-generated goal execution plans with dimension impact predictions |
| `voice-analysis.ts` | Voice journal processing, sentiment extraction, mood mapping |

### `@life-design/ai-local`

Browser-side ML via Transformers.js in a Web Worker.

| Module | Responsibility |
|--------|---------------|
| `models.ts` | Model registry: `all-MiniLM-L6-v2` (embed), `mobilebert-uncased-mnli` (classify), `distilbart-cnn-6-6` (summarise) |
| `worker.ts` | Web Worker entry — lazily loads pipelines, handles message routing, zero-copy Float32Array transfer |
| `embed.ts` | 384-dimensional embeddings with mean pooling + L2 normalisation |
| `classify.ts` | Zero-shot classification against 8 dimension labels |
| `summarize.ts` | Abstractive summarisation |
| `index.ts` | `AILocalClient` class — spawns Worker, promise-map routing, `embed()` / `classify()` / `summarize()` / `dispose()` |

### `@life-design/ui`

Design system and shared components.

| Module | Responsibility |
|--------|---------------|
| `tokens.ts` | Colour palette, typography scale, spacing (4px baseline), border radius, shadows, breakpoints, z-index, transitions |
| Components | Button, Input, Card, Modal, Navigation, Chart wrappers (Recharts), responsive grid |

---

## Web Application Architecture

### Next.js App Router (apps/web)

- **Server Components** (default) for data fetching and initial rendering
- **Client Components** (`"use client"`) for interactive UI (forms, charts, chat)
- **API Routes** in `src/app/api/` for server-side business logic
- **Streaming** via Server-Sent Events for mentor chat

### API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat` | POST | Mentor conversation — rate-limited, streams via SSE or returns JSON. Accepts message, history, systemPrompt, userId, optional memory persistence |
| `/api/auth/callback` | GET | OAuth callback — exchanges Supabase auth code for session, redirects to dashboard |
| `/api/billing/checkout` | POST | Stripe checkout — creates customer, subscription (7-day trial) or one-time lifetime payment |
| `/api/health` | GET | Health check — validates env vars + Supabase connectivity, returns status with 30s cache |

### Client-Side Libraries

| File | Purpose |
|------|---------|
| `src/lib/goal-correlation.ts` | Keyword + semantic goal-to-dimension inference, timeline progress, momentum classification |
| `src/lib/dashboard-insights.ts` | Builds prioritised insight cards (goal risk → progress → correlation → trend → suggestion), cosine similarity for semantic dimension matching |
| `src/lib/weekly-digest.ts` | Computes weekly summaries from check-in data, with optional local AI summarisation fallback |
| `src/lib/micro-moments.ts` | Time-windowed nudges (morning/midday/evening), mood-adaptive copy, mentor-archetype tone |
| `src/lib/conversation-memory.ts` | Circular buffer (max 50 entries) for key facts + exchange summaries |
| `src/lib/mood-adapter.ts` | Weighted mood: `latest * 0.70 + rolling_5day * 0.30`, three levels (low/neutral/high) |
| `src/lib/mentor-orchestrator.ts` | Assembles system prompt from archetype config + mood + memory snapshot |
| `src/lib/onboarding-extraction.ts` | Regex NLP for profile extraction (name, location, profession, interests, goals) |
| `src/lib/use-ai-local.ts` | React hook: `useAILocal()` — lazy Worker init, loading/ready/error state, progress tracking |

---

## Authentication & Authorization

### Auth Flow

```
User → /login or /signup
  → Supabase Auth (email/password or OAuth)
  → Session token (secure httpOnly cookie: sb-<project>-auth-token)
  → Redirect to /dashboard

OAuth providers:
  → Provider login → redirect to /api/auth/callback?code=...
  → exchangeCodeForSession(code)
  → Auto-create profile via handle_new_user() trigger
  → Store encrypted tokens in user_connections (AES-256-GCM)
```

### Security Layers

1. **Row Level Security (RLS)** on all 23+ tables — users only access their own data
2. **AES-256-GCM encryption** for OAuth tokens in `user_connections.encrypted_tokens` (bytea)
3. **Service role isolation** — admin operations (webhooks, sync, batch) bypass RLS via service key
4. **Security headers** — CSP, HSTS, X-Frame-Options: DENY, nosniff, strict referrer policy
5. **Rate limiting** on `/api/chat` endpoint
6. **CORS** via Next.js config

---

## Integration Architecture

### Connector Pattern

All external data sources implement the `LifeConnector` interface from `@life-design/core`:

```
Provider data → LifeConnector.fetch() → NormalisedSignal → feature_store
                                                                ↓
                                              correlation pipeline + ML
```

### Supported Integrations

| Provider | Dimensions Mapped | Auth |
|----------|-------------------|------|
| Strava | fitness, health | OAuth 2.0 |
| Google Calendar | career, social, family, romance | OAuth 2.0 |
| Spotify | social, romance, growth | OAuth 2.0 |
| Slack | social, career | OAuth 2.0 |
| Instagram | social, romance | OAuth 2.0 |
| Notion | growth, career | OAuth 2.0 |
| Apple Health | health, fitness | Capacitor bridge (iOS) |
| OpenWeather | health, fitness | API key |
| Open Banking | finance | TBD |

### Sync Pipeline

```
Connector → fetch data → normalise signals → upsert feature_store
                                                    ↓
                                           connector_sync_log (audit)
                                                    ↓
                                    circuit breaker (auto-disable after N failures)
```

---

## AI Architecture

### Two-Tier AI System

```
┌─────────────────────────────────┐    ┌─────────────────────────────────┐
│  Server-side (Gemini 1.5 Flash) │    │  Client-side (Transformers.js)  │
│  ──────────────────────────────  │    │  ──────────────────────────────  │
│  Mentor chat conversations      │    │  Text embeddings (384-dim)      │
│  Insight generation             │    │  Zero-shot classification       │
│  Goal pathway planning          │    │  Local summarisation            │
│  Voice analysis                 │    │  Runs in Web Worker             │
│  Weekly digest (primary)        │    │  Models cached in IndexedDB     │
│  Requires API key               │    │  No API key needed              │
└─────────────────────────────────┘    └─────────────────────────────────┘
```

### Mentor Persona System

Three archetypes with mood-adaptive behaviour:

| Archetype | Style | Approach |
|-----------|-------|----------|
| **Stoic** (Therapist) | Philosophy-based wisdom | Reflective questions, Socratic method |
| **Coach** | Goal-focused motivator | Action-oriented, accountability |
| **Scientist** (Sage) | Evidence-based | Data-driven, analytical frameworks |

System prompt assembly: `archetype config + user context (profession, goals, scores, correlations) + mood summary + conversation memory snapshot`

---

## Data Flow

### Check-in Pipeline

```
User check-in (mood 1-10, dimension scores 1-10, optional journal)
  ↓
  ├── checkins table (normalised)
  ├── dimension_scores table (8 per check-in)
  ├── daily_checkins table (denormalised for ML)
  ├── feature_store (time-series features)
  ├── user_streaks update
  └── user_progress XP update
        ↓
  Correlation pipeline runs
        ↓
  ├── correlation_results cache
  ├── daily_insights bundle (AI-generated)
  └── user_nudges queue (micro-moments)
```

### Insight Priority Stack

The dashboard displays up to 6 insights, ordered by priority:

1. **Goal risk** — goals near deadline with high timeline progress
2. **Goal progress** — on-track goals within 30 days of target
3. **Correlation** — statistically significant dimension relationships
4. **Trend** — mood direction changes (threshold: >=0.4 points)
5. **Suggestion** — weakest dimension + streak protection

---

## Deployment

### Vercel Configuration

- **Region**: `syd1` (Sydney, Australia)
- **Framework**: Next.js 15 with standalone output
- **Build**: `turbo build --filter=web`
- **Output**: `apps/web/.next`

### Environment Variables

**Required** (validated at startup by `validateConfig()`):

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard |
| `STRIPE_SECRET_KEY` | Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe dashboard |
| `STRIPE_PRICE_MONTHLY/ANNUAL/LIFETIME` | Stripe products |
| `GOOGLE_AI_API_KEY` | Google AI Studio |
| `STRAVA_CLIENT_ID/SECRET/REDIRECT_URI` | Strava API settings |
| `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI` | Google Cloud Console |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | Deployed URL |

**Optional**: `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY/HOST`

### Database Functions

| Function | Schedule | Purpose |
|----------|----------|---------|
| `get_user_dashboard_data(user_id)` | On request | Returns subscription, streak, unread count, insights, dimension scores in one RPC call |
| `expire_stale_sessions()` | Nightly (pg_cron) | Expires lapsed trials, prunes feature_store (>18mo), prunes correlation cache (>90d) |

---

## Testing Strategy

| Layer | Framework | Command |
|-------|-----------|---------|
| `packages/core` | Vitest | `pnpm test` — 215+ tests |
| `packages/ai` | Vitest | `pnpm test` |
| `packages/ai-local` | Vitest | `pnpm test` — 16 tests (mocked pipelines) |
| `apps/web` | Vitest | `pnpm test` |
| Type checking | TypeScript | `tsc --noEmit` |
| Turbo orchestration | — | `turbo test` runs all in dependency order |

---

## Key Design Decisions

1. **Monorepo with zero-dep core** — `@life-design/core` has no runtime dependencies, making it importable by any package without bloat
2. **Separate AI packages** — Server-side (Gemini, API keys) and browser-side (Transformers.js, Web Worker) are isolated by design
3. **Web Worker for ML** — All inference runs off the main thread to keep UI responsive
4. **RLS everywhere** — Every table has Row Level Security; no table is accessible across users
5. **AES-256-GCM for tokens** — OAuth credentials stored as encrypted bytea, not plaintext
6. **Denormalised analytics tables** — `daily_checkins` and `feature_store` exist alongside normalised `checkins`/`dimension_scores` to optimise ML pipeline joins
7. **Covering indexes** — `feature_store` has a covering index (`INCLUDE (feature, value, confidence)`) for index-only scans
8. **Dashboard RPC** — `get_user_dashboard_data()` aggregates all dashboard queries into one round-trip
