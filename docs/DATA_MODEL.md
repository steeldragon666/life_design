# Data Model

## Overview

The Life Design data model is built on Supabase (PostgreSQL) with 23+ tables across 15 migrations. Every table has Row Level Security (RLS) enabled — users can only access their own data.

The schema divides into six domains:
1. **Identity** — user profiles and onboarding state
2. **Check-ins** — daily mood and dimension tracking
3. **Goals** — planning, milestones, pathways
4. **Mentoring** — AI mentor conversations and memory
5. **Integrations** — external data sources and sync pipeline
6. **Platform** — subscriptions, gamification, entitlements

---

## Entity Relationship Diagram

```
                                auth.users
                                    │
                            ┌───────┴───────┐
                            ▼               │
                        profiles            │
                       ┌────┴────┐          │
            ┌──────────┤         ├──────────┼──────────────────────────┐
            ▼          ▼         ▼          ▼                          ▼
        checkins    goals    user_mentors  integrations          subscriptions
            │          │         │              │                      │
            ▼          │         ▼              ▼               subscription_events
    dimension_scores   │   mentor_messages  integration_metrics
                       │                                          user_connections
                       ├──► goal_dimensions                       connector_sync_log
                       ├──► goal_milestones
                       ├──► goal_progress                     feature_store
                       └──► pathways                          daily_checkins
                                │                             daily_insights
                           pathway_steps                      user_streaks
                                                              user_progress
         insights                                             user_nudges
         correlation_results                                  user_insights_seen
         mentor_conversation_summaries                        entitlements
```

---

## Custom Enum Types

Defined in migration `00001` and extended in `00004`:

```sql
CREATE TYPE dimension AS ENUM (
  'career', 'finance', 'health', 'fitness',
  'family', 'social', 'romance', 'growth'
);

CREATE TYPE mentor_type      AS ENUM ('stoic', 'coach', 'scientist');
CREATE TYPE duration_type    AS ENUM ('quick', 'deep');
CREATE TYPE insight_type     AS ENUM ('trend', 'correlation', 'suggestion',
                                     'goal_progress', 'goal_risk');
CREATE TYPE goal_horizon     AS ENUM ('short', 'medium', 'long');
CREATE TYPE goal_status      AS ENUM ('active', 'completed', 'paused', 'abandoned');
CREATE TYPE goal_tracking_type AS ENUM ('milestone', 'metric');

CREATE TYPE integration_provider AS ENUM (
  'strava', 'google_calendar', 'gmail', 'slack',
  'instagram', 'weather', 'spotify', 'apple_health',
  'notion', 'banking'
);

CREATE TYPE integration_status AS ENUM ('connected', 'disconnected', 'error');
```

TypeScript equivalents in `packages/core/src/enums.ts`.

---

## Domain 1: Identity

### profiles

Extends `auth.users`. Auto-created via `handle_new_user()` trigger on signup.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, FK → auth.users, CASCADE | Same ID as auth user |
| `email` | TEXT | NOT NULL | From auth provider |
| `display_name` | TEXT | | User's chosen name |
| `onboarded` | BOOLEAN | NOT NULL, DEFAULT false | Completed onboarding flow |
| `profession` | TEXT | | Extracted during onboarding |
| `interests` | TEXT[] | DEFAULT '{}' | User interests |
| `projects` | TEXT[] | DEFAULT '{}' | Active projects |
| `hobbies` | TEXT[] | DEFAULT '{}' | Hobbies |
| `skills` | TEXT[] | DEFAULT '{}' | Skills |
| `postcode` | TEXT | | For weather integration |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Auto-updated via trigger |

**RLS**: SELECT + UPDATE own row. INSERT open (for trigger).

**Trigger**: `handle_new_user()` — `AFTER INSERT ON auth.users` → inserts profile with id + email.

---

## Domain 2: Check-ins

### checkins

One row per user per day. The primary data capture mechanism.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `user_id` | UUID | NOT NULL, FK → profiles, CASCADE | |
| `date` | DATE | NOT NULL | Calendar date |
| `mood` | INTEGER | NOT NULL, CHECK (1-10) | Overall mood score |
| `duration_type` | duration_type | NOT NULL, DEFAULT 'quick' | Quick or deep check-in |
| `journal_entry` | TEXT | | Free-text journal |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Auto-updated via trigger |

**Unique**: `(user_id, date)` — one check-in per day.
**Index**: `idx_checkins_user_date ON (user_id, date DESC)`

### dimension_scores

Eight scores per check-in, one per dimension.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK | |
| `checkin_id` | UUID | NOT NULL, FK → checkins, CASCADE | |
| `dimension` | dimension | NOT NULL | One of 8 dimensions |
| `score` | INTEGER | NOT NULL, CHECK (1-10) | Self-reported score |
| `note` | TEXT | | Optional per-dimension note |

**Unique**: `(checkin_id, dimension)` — one score per dimension per check-in.

### daily_checkins (denormalised)

Denormalised copy for ML pipeline performance. One row per user per day.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL, FK → auth.users, CASCADE | |
| `checkin_date` | DATE | NOT NULL | |
| `completed_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Exact completion time |
| `mode` | TEXT | CHECK ('standard', 'deep') | |
| `mood_score` | SMALLINT | CHECK (1-10) | |
| `energy_level` | SMALLINT | CHECK (1-10) | |
| `dimension_scores` | JSONB | | All 8 scores in one field |
| `journal_entry` | TEXT | | |
| `streak_count` | INTEGER | NOT NULL, DEFAULT 0 | Streak at time of check-in |
| `processing_status` | TEXT | CHECK ('pending', 'complete', 'failed') | ML pipeline status |

**Unique**: `(user_id, checkin_date)`

---

## Domain 3: Goals

### goals

User-defined goals with horizon-based time framing.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL, FK → profiles, CASCADE | |
| `title` | TEXT | NOT NULL | Goal name |
| `description` | TEXT | | Detailed description |
| `horizon` | goal_horizon | NOT NULL | short (1-6mo), medium (6mo-1.5yr), long (1.5-5yr) |
| `status` | goal_status | NOT NULL, DEFAULT 'active' | active, completed, paused, abandoned |
| `tracking_type` | goal_tracking_type | NOT NULL | milestone or metric |
| `target_date` | DATE | NOT NULL | Deadline |
| `metric_target` | NUMERIC | | Target value for metric goals |
| `metric_current` | NUMERIC | DEFAULT 0 | Current progress |
| `metric_unit` | TEXT | | Unit label (e.g., "km", "$") |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Auto-updated |

**Indexes**: `(user_id)`, `(user_id, status)`

### goal_dimensions

Many-to-many: which life dimensions a goal impacts.

| Column | Type | Constraints |
|--------|------|-------------|
| `goal_id` | UUID | PK, FK → goals, CASCADE |
| `dimension` | dimension | PK |

### goal_milestones

Discrete sub-tasks for milestone-tracked goals. Ordered by `position`.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `goal_id` | UUID | NOT NULL, FK → goals, CASCADE |
| `title` | TEXT | NOT NULL |
| `position` | INTEGER | NOT NULL, DEFAULT 0 |
| `completed` | BOOLEAN | NOT NULL, DEFAULT false |
| `completed_at` | TIMESTAMPTZ | |

### goal_progress

Time-series metric values for metric-tracked goals.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `goal_id` | UUID | NOT NULL, FK → goals, CASCADE |
| `metric_value` | NUMERIC | |
| `note` | TEXT | |
| `recorded_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

### pathways

AI-generated or user-created action plans to achieve a goal.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK | |
| `goal_id` | UUID | NOT NULL, FK → goals, CASCADE | |
| `title` | TEXT | NOT NULL | |
| `description` | TEXT | | |
| `ai_generated` | BOOLEAN | NOT NULL, DEFAULT false | Whether Gemini created it |
| `dimension_impacts` | JSONB | DEFAULT '[]' | Predicted impact per dimension |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | Auto-updated |

### pathway_steps

Ordered actions within a pathway.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `pathway_id` | UUID | NOT NULL, FK → pathways, CASCADE |
| `title` | TEXT | NOT NULL |
| `description` | TEXT | |
| `position` | INTEGER | NOT NULL, DEFAULT 0 |
| `completed` | BOOLEAN | NOT NULL, DEFAULT false |
| `completed_at` | TIMESTAMPTZ | |

---

## Domain 4: Mentoring

### mentors

Preset mentor configurations (not user-created). Readable by all authenticated users.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK | |
| `name` | TEXT | NOT NULL | Display name |
| `type` | mentor_type | NOT NULL | stoic, coach, scientist |
| `description` | TEXT | NOT NULL | User-facing description |
| `system_prompt` | TEXT | NOT NULL | Base Gemini system prompt |
| `avatar_url` | TEXT | | |

### user_mentors

Which mentors a user has activated.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | NOT NULL, FK → profiles, CASCADE |
| `mentor_id` | UUID | NOT NULL, FK → mentors, CASCADE |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true |

**Unique**: `(user_id, mentor_id)`

### mentor_messages

Chat history between user and mentor.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_mentor_id` | UUID | NOT NULL, FK → user_mentors, CASCADE |
| `role` | TEXT | NOT NULL, CHECK ('user', 'assistant') |
| `content` | TEXT | NOT NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

**Index**: `(user_mentor_id, created_at)` — for chronological retrieval.

### mentor_conversation_summaries

Cross-session memory. Stores condensed exchange pairs for injecting into future system prompts.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL, FK → profiles, CASCADE | |
| `source` | TEXT | NOT NULL, DEFAULT 'chat' | Origin (chat, onboarding, etc.) |
| `user_message` | TEXT | NOT NULL | What user said |
| `mentor_response` | TEXT | NOT NULL | What mentor replied |
| `summary` | TEXT | NOT NULL | Condensed version for context window |
| `created_at` | TIMESTAMPTZ | | |

**Index**: `(user_id, created_at DESC)` — most recent summaries first.

---

## Domain 5: Integrations

### integrations (legacy)

Original OAuth connection tracking. Being superseded by `user_connections` for token storage.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | NOT NULL, FK → profiles, CASCADE |
| `provider` | integration_provider | NOT NULL |
| `status` | integration_status | NOT NULL, DEFAULT 'disconnected' |
| `access_token_encrypted` | TEXT | |
| `refresh_token_encrypted` | TEXT | |
| `token_expires_at` | TIMESTAMPTZ | |
| `metadata` | JSONB | DEFAULT '{}' |

**Unique**: `(user_id, provider)`

### user_connections (v2)

AES-256-GCM encrypted OAuth token storage. Replaces plaintext columns in `integrations`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL, FK → auth.users | |
| `provider` | TEXT | NOT NULL, CHECK (11 valid providers) | |
| `encrypted_tokens` | BYTEA | NOT NULL | AES-256-GCM: [authTag 16B \|\| ciphertext] |
| `token_iv` | BYTEA | NOT NULL | 12-byte GCM initialisation vector |
| `expires_at` | TIMESTAMPTZ | | For cheap freshness checks |
| `connected_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `last_sync_at` | TIMESTAMPTZ | | |
| `sync_enabled` | BOOLEAN | DEFAULT true | Circuit breaker flag |

**Unique**: `(user_id, provider)`
**RLS**: SELECT + DELETE for user. INSERT + UPDATE restricted to service_role only.

### integration_metrics

Provider data mapped to life dimensions.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `integration_id` | UUID | NOT NULL, FK → integrations, CASCADE |
| `dimension` | dimension | NOT NULL |
| `metric_name` | TEXT | NOT NULL |
| `metric_value` | NUMERIC | NOT NULL |
| `recorded_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

### health_metrics

Apple Health data synced from iOS via Capacitor bridge.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | NOT NULL, FK → profiles, CASCADE |
| `date` | DATE | NOT NULL |
| `sleep_hours` | NUMERIC | |
| `steps` | INTEGER | |
| `active_minutes` | INTEGER | |
| `heart_rate_avg` | INTEGER | |
| `heart_rate_variability` | INTEGER | |

**Unique**: `(user_id, date)`

### connector_sync_log

Audit trail for every data sync attempt. Written by service_role only.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL, FK → auth.users | |
| `connector` | TEXT | NOT NULL | e.g., 'apple_health', 'strava' |
| `status` | TEXT | CHECK ('syncing', 'success', 'partial', 'failed') | |
| `records_processed` | INT | NOT NULL, DEFAULT 0 | Raw records consumed |
| `features_stored` | INT | NOT NULL, DEFAULT 0 | Feature rows upserted |
| `error_message` | TEXT | | |
| `started_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `completed_at` | TIMESTAMPTZ | | |
| `metadata` | JSONB | | Connector-specific context |

---

## Domain 6: Platform

### feature_store

Time-series feature vectors powering the ML correlation pipeline. The analytical backbone.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `user_id` | UUID | PK (composite), FK → auth.users, CASCADE | |
| `dimension` | TEXT | NOT NULL | Life dimension |
| `feature` | TEXT | PK (composite) | Feature name (e.g., 'mood_score') |
| `value` | DOUBLE PRECISION | NOT NULL | Numeric value |
| `recorded_at` | TIMESTAMPTZ | PK (composite), DEFAULT now() | |
| `source` | TEXT | NOT NULL, DEFAULT 'manual' | Data origin |
| `confidence` | DOUBLE PRECISION | NOT NULL, DEFAULT 1.0, CHECK (0-1) | Signal confidence |

**Primary key**: `(user_id, feature, recorded_at)` — natural composite key for time-series data.
**Covering index**: `(user_id, dimension, recorded_at DESC) INCLUDE (feature, value, confidence)` — enables index-only scans for dimension-scoped queries.
**Retention**: Pruned after 18 months by `expire_stale_sessions()`.

### correlation_results

Cached correlation computations for fast dashboard reads.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL, FK → profiles, CASCADE | |
| `dimension_a` | TEXT | NOT NULL | First dimension |
| `dimension_b` | TEXT | NOT NULL | Second dimension |
| `correlation_coefficient` | DOUBLE PRECISION | NOT NULL | Pearson r value |
| `lag_days` | INTEGER | NOT NULL, DEFAULT 0 | Time lag (0-3 days) |
| `sample_size` | INTEGER | NOT NULL | Number of data points |
| `confidence` | DOUBLE PRECISION | NOT NULL | Composite confidence score |
| `p_value` | DOUBLE PRECISION | | Fisher Z significance |
| `insight_text` | TEXT | | Human-readable insight |
| `computed_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Retention**: Pruned after 90 days by `expire_stale_sessions()`.

### daily_insights

AI-generated insight bundles, one per user per day.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL, FK → auth.users, CASCADE | |
| `generated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `bundle` | JSONB | | Full insight payload |
| `headlines` | TEXT[] | | Summary headlines |
| `read` | BOOLEAN | NOT NULL, DEFAULT false | Dashboard notification state |

**Unique expression index**: `(user_id, generated_at::date)` — one insight per calendar day.
**Partial index**: `WHERE read = false` — sub-millisecond unread count.

### insights (legacy)

Individual AI insights. Being superseded by `daily_insights` bundles.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | NOT NULL, FK → profiles, CASCADE |
| `type` | insight_type | NOT NULL |
| `title` | TEXT | NOT NULL |
| `body` | TEXT | NOT NULL |
| `dimension` | dimension | |
| `generated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| `dismissed` | BOOLEAN | NOT NULL, DEFAULT false |

### user_insights_seen

Tracks which insights a user has seen, preventing re-surfacing.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | NOT NULL, FK → profiles, CASCADE |
| `insight_hash` | TEXT | NOT NULL |
| `first_seen_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| `dismissed` | BOOLEAN | NOT NULL, DEFAULT false |

**Unique**: `(user_id, insight_hash)`

### user_nudges

Scheduled micro-moment nudges (reminders, insights, milestone celebrations).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL, FK → profiles, CASCADE | |
| `category` | TEXT | CHECK ('reminder', 'insight', 'milestone') | |
| `title` | TEXT | NOT NULL | |
| `body` | TEXT | NOT NULL | |
| `payload` | JSONB | DEFAULT '{}' | Action data |
| `scheduled_for` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Delivery time |
| `delivered_at` | TIMESTAMPTZ | | When actually delivered |
| `dismissed` | BOOLEAN | NOT NULL, DEFAULT false | |

### subscriptions

Stripe billing state. One row per user.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL, UNIQUE, FK → profiles, CASCADE | One subscription per user |
| `stripe_customer_id` | TEXT | UNIQUE | |
| `stripe_subscription_id` | TEXT | UNIQUE | Null for lifetime |
| `plan_type` | TEXT | CHECK ('monthly', 'annual', 'lifetime') | |
| `stripe_price_id` | TEXT | | |
| `status` | TEXT | CHECK (trialing, active, past_due, canceled, none, unpaid, incomplete, incomplete_expired, paused) | |
| `trial_start` | TIMESTAMPTZ | | |
| `trial_end` | TIMESTAMPTZ | | |
| `current_period_start` | TIMESTAMPTZ | | |
| `current_period_end` | TIMESTAMPTZ | | |
| `cancel_at_period_end` | BOOLEAN | NOT NULL, DEFAULT false | |
| `lifetime_access` | BOOLEAN | NOT NULL, DEFAULT false | Permanent access flag |

**Partial index**: `WHERE status = 'trialing'` — for nightly expiry job.

### subscription_events

Stripe webhook audit trail.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → profiles, ON DELETE SET NULL |
| `event_type` | TEXT | NOT NULL |
| `stripe_event_id` | TEXT | NOT NULL, UNIQUE |
| `metadata` | JSONB | NOT NULL, DEFAULT '{}' |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

### user_streaks

Per-user streak tracking with weekly freeze mechanic.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `user_id` | UUID | PK, FK → auth.users, CASCADE | One row per user |
| `current_streak` | INTEGER | NOT NULL, DEFAULT 0 | |
| `longest_streak` | INTEGER | NOT NULL, DEFAULT 0 | All-time best |
| `last_checkin_date` | DATE | | |
| `total_checkins` | INTEGER | NOT NULL, DEFAULT 0 | |
| `streak_freeze_available` | BOOLEAN | DEFAULT true | Can freeze this week |
| `streak_freeze_used_week` | BOOLEAN | DEFAULT false | Already used freeze |
| `week_start_date` | DATE | DEFAULT date_trunc('week', current_date) | Freeze reset boundary |

### user_progress

Gamification XP and level tracking.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `user_id` | UUID | PK, FK → auth.users, CASCADE | |
| `level` | INTEGER | NOT NULL, DEFAULT 1 | |
| `total_xp` | INTEGER | NOT NULL, DEFAULT 0 | |
| `current_streak` | INTEGER | NOT NULL, DEFAULT 0 | Denormalised from user_streaks |
| `longest_streak` | INTEGER | NOT NULL, DEFAULT 0 | |
| `total_checkins` | INTEGER | NOT NULL, DEFAULT 0 | |
| `deep_checkins` | INTEGER | NOT NULL, DEFAULT 0 | |
| `voice_entries` | INTEGER | NOT NULL, DEFAULT 0 | |
| `sources_connected` | INTEGER | NOT NULL, DEFAULT 0 | |
| `goals_completed` | INTEGER | NOT NULL, DEFAULT 0 | |

### entitlements

Static lookup table: which features are enabled per subscription plan. Public read, service_role write.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `plan` | TEXT | NOT NULL |
| `feature` | TEXT | NOT NULL |
| `enabled` | BOOLEAN | NOT NULL, DEFAULT true |

**Unique**: `(plan, feature)`

---

## Database Functions

### get_user_dashboard_data(p_user_id UUID) → JSONB

Returns all dashboard data in a single RPC call, avoiding N+1 queries.

**Returns**:
```json
{
  "subscription":    { "plan": "monthly", "status": "active", "trial_end": null },
  "streak":          { "current": 12, "longest": 30, "last_checkin": "2026-03-12" },
  "unread_count":    2,
  "latest_insights": [ ... ],
  "dimension_scores": { "health": 7.4, "fitness": 6.1, ... }
}
```

### expire_stale_sessions() → JSONB

Nightly maintenance. Called via pg_cron or Edge Function scheduler.

**Operations**:
1. Expire lapsed trials (trialing + past trial_end + no stripe_subscription_id)
2. Prune feature_store entries older than 18 months
3. Prune correlation_results older than 90 days

---

## Triggers

| Trigger | Table | Event | Function |
|---------|-------|-------|----------|
| `on_auth_user_created` | auth.users | AFTER INSERT | `handle_new_user()` — creates profile row |
| `set_updated_at` | profiles | BEFORE UPDATE | `update_updated_at()` — sets updated_at = now() |
| `set_updated_at` | checkins | BEFORE UPDATE | `update_updated_at()` |
| `set_updated_at` | integrations | BEFORE UPDATE | `update_updated_at()` |
| `set_goals_updated_at` | goals | BEFORE UPDATE | `update_updated_at()` |
| `set_pathways_updated_at` | pathways | BEFORE UPDATE | `update_updated_at()` |

---

## Migration History

| Migration | Description |
|-----------|-------------|
| `00001` | Core schema: profiles, checkins, dimension_scores, mentors, user_mentors, mentor_messages, insights, integrations, integration_metrics. RLS + triggers. |
| `00002` | Add `onboarded` flag to profiles |
| `00003` | Fix profiles INSERT policy for auth trigger |
| `00004` | Goals system: goals, goal_dimensions, goal_milestones, goal_progress, pathways, pathway_steps. Profile extensions (profession, interests, etc.). New providers + insight types. |
| `00005` | Add integration providers: spotify, apple_health, notion, banking |
| `00006` | health_metrics table + metadata JSONB on integrations |
| `00007` | correlation_results cache + user_insights_seen |
| `00008` | subscriptions + subscription_events (Stripe billing) |
| `00009` | mentor_conversation_summaries (cross-session memory) |
| `00010` | user_nudges (micro-moment queue) |
| `00011` | ML pipeline tables: feature_store, daily_checkins, daily_insights |
| `00012` | Gamification: user_streaks, user_progress, entitlements |
| `00013` | user_connections (AES-256-GCM token storage) + connector_sync_log |
| `00014` | Rebuilt connector_sync_log with richer schema |
| `00015` | Performance indexes, get_user_dashboard_data() RPC, expire_stale_sessions() |
| `00016` | pgvector extension, `vector(384)` columns on checkins/goals/daily_checkins, IVFFlat indexes, `find_similar_journal_entries()` RPC |

---

## Index Strategy

### Vector Indexes (IVFFlat cosine distance)
- `checkins (journal_embedding vector_cosine_ops) WITH (lists = 100)` — semantic similarity search for journal entries
- `goals (title_embedding vector_cosine_ops) WITH (lists = 50)` — semantic goal classification

### Covering Indexes (index-only scans)
- `feature_store (user_id, dimension, recorded_at DESC) INCLUDE (feature, value, confidence)` — dimension-scoped time-series queries

### Partial Indexes
- `daily_insights (user_id, generated_at DESC) WHERE read = false` — unread notification badge
- `subscriptions (status, trial_end) WHERE status = 'trialing'` — nightly trial expiry

### Composite Indexes
- `checkins (user_id, date DESC)` — user's recent check-ins
- `correlation_results (user_id, dimension_a, dimension_b)` — pair lookups
- `connector_sync_log (user_id, connector, started_at DESC)` — sync history
- `user_connections (sync_enabled, last_sync_at) WHERE sync_enabled = true` — sync scheduler

---

## Security Model

Every table follows this RLS pattern:

| Access Level | Capability |
|-------------|------------|
| **Authenticated user** | SELECT, INSERT, UPDATE, DELETE own rows only (`auth.uid() = user_id`) |
| **Service role** | Full access (bypasses RLS) — used by API routes, webhooks, Edge Functions |
| **Anonymous** | No access to any table except `entitlements` (read-only) and `mentors` (read-only) |

Token storage in `user_connections` is additionally restricted:
- Users can SELECT (metadata only) and DELETE their connections
- Only service_role can INSERT/UPDATE (encrypted tokens written server-side during OAuth flow)
