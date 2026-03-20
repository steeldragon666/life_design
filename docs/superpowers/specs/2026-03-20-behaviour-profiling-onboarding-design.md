# Behaviour-First Profiling Onboarding System

**Date:** 2026-03-20
**Status:** Draft
**Scope:** Full system — Phase 1 (onboarding + profiling + removal), Phase 2 (event pipeline + recomputation), Phase 3 (prediction + intervention engine)

---

## 1. Product Objective

Replace the current onboarding flow (welcome → name → about → mentor → complete) with a behaviour-first profiling system that:

- Builds a strong initial user model in 2–3 minutes via 18 structured questions
- Maximises predictive signal for downstream AI (goal success, dropout risk, intervention selection, adaptive scheduling)
- Treats onboarding answers as priors that are progressively overridden by real behavioural data
- Introduces all three mentors (Eleanor, Theo, Maya) as a team, not a selection

## 2. Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Full spec, all phases | Design everything now, build Phase 1 first |
| Data storage | Auth required | All profiling data in Supabase, no localStorage profiling |
| Mentors | All 3 introduced | Mentors advise in their domains; no single selection |
| Flow structure | Grouped sections | 4 themed sections of 3–6 questions each |
| Profile summary | Template + async LLM | Deterministic summary instant, LLM paragraph streams in |
| Event pipeline | Next.js API routes | Single codebase, matches existing patterns |
| Profile recomputation | Supabase DB function | plpgsql, close to data, fast, transactional |
| Architecture | Monolithic migration | Single PR, new tables + UI + old removal together |

## 3. System Architecture

### 3.1 Four-Layer Design

```
Layer A: Onboarding Collection
  → Captures 18 structured answers across 4 themed sections
  → Autosaves per-answer to Supabase
  → Resume-safe, back/next navigation

Layer B: Profiling Engine
  → Normalises raw answers to 0.0–1.0 feature vector
  → Derives composite scores (friction, discipline, dropout risk)
  → Generates template-based profile summary
  → Triggers async LLM enrichment

Layer C: Behavioural Learning Loop (Phase 2)
  → Ingests events via POST /api/events/ingest
  → Appends to behavior_events table
  → Triggers profile recomputation (Supabase function)
  → Shifts source_mix weights over time

Layer D: Prediction & Intervention Engine (Phase 3)
  → Phase 3a: Deterministic rules + weighted scoring
  → Phase 3b: Supervised models (logistic regression, GBT)
  → Phase 3c: Contextual bandits for intervention selection
```

### 3.2 Component Map

```
apps/web/
  src/
    app/(protected)/onboarding/
      page.tsx                    # New onboarding page (auth-gated)
      actions.ts                  # Server actions for onboarding
    app/api/
      onboarding/
        start/route.ts            # POST - create session
        answer/route.ts           # PATCH - save individual answer
        complete/route.ts         # POST - finalise and compute profile
        status/route.ts           # GET - resume state
      profile/
        route.ts                  # GET - fetch user profile
        recompute/route.ts        # POST - trigger recomputation
      events/
        ingest/route.ts           # POST - behavioural event ingestion
      predictions/
        dropout-risk/route.ts     # GET - current dropout risk
        interventions/route.ts    # GET - recommended interventions
    components/onboarding/
      profiling-wizard.tsx        # Main wizard shell
      section-header.tsx          # Section intro screen
      question-renderer.tsx       # Renders question by type
      question-types/
        scale-question.tsx        # 1-10 slider/buttons
        single-select.tsx         # Radio-style options
        multi-select.tsx          # Checkbox-style (max 2)
      progress-bar.tsx            # Section-grouped progress
      mentor-intro.tsx            # Meet all 3 mentors
      profile-summary.tsx         # Single-column narrative summary
    lib/
      profiling/
        normalisation.ts          # Raw answer → 0.0–1.0
        scoring.ts                # Derived scores (friction, discipline, etc.)
        summary-templates.ts      # Deterministic summary generation
        question-schema.ts        # Canonical question definitions
        types.ts                  # All profiling types

packages/core/
  src/
    profiling/
      normalisation.ts            # Pure normalisation functions
      scoring.ts                  # Pure scoring functions
      types.ts                    # Shared profiling types
      constants.ts                # Scoring weights, mappings

supabase/
  migrations/
    00018_profiling_onboarding.sql  # All new tables + RLS
    00019_profile_recompute_fn.sql  # plpgsql recomputation function
```

## 4. Data Model

### 4.1 New Tables

#### `onboarding_sessions`

```sql
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
```

#### `user_profiles`

```sql
CREATE TABLE user_profiles (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_version           INTEGER NOT NULL DEFAULT 1,

  -- Core profile fields (from onboarding)
  goal_domain               TEXT,
  goal_importance           REAL,            -- 0.0–1.0
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
  summary_template          JSONB,           -- {strength, friction, strategy, this_week}
  summary_llm               TEXT,            -- async LLM-enriched paragraph

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
```

#### `profile_snapshots`

```sql
CREATE TABLE profile_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_time   TIMESTAMPTZ NOT NULL DEFAULT now(),
  feature_vector  JSONB NOT NULL,
  source_weights  JSONB NOT NULL,
  risk_scores     JSONB NOT NULL
);
```

#### `behavior_events`

```sql
CREATE TABLE behavior_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata        JSONB DEFAULT '{}'
);
```

Event types: `task_completed`, `task_missed`, `goal_created`, `goal_abandoned`, `checkin_completed`, `checkin_skipped`, `session_started`, `session_ended`, `notification_opened`, `notification_ignored`, `onboarding_completed`, `onboarding_question_answered`.

#### `predictions`

```sql
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
```

### 4.2 Existing Table Changes

```sql
-- Add onboarding_status to profiles (replaces boolean onboarded flag)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_status TEXT
  NOT NULL DEFAULT 'not_started'
  CHECK (onboarding_status IN ('not_started', 'completed'));
```

Existing columns (profession, interests, hobbies, skills, postcode) are kept but deprecated. No data destruction.

### 4.3 RLS Policies

All new tables get RLS enabled with `auth.uid() = user_id` policies for SELECT/INSERT/UPDATE. Service role gets full access for recomputation functions.

## 5. Onboarding Questionnaire

### 5.1 Section Grouping

| Section | Label | Questions | Count |
|---------|-------|-----------|-------|
| `goal` | Your Goal | goal_domain, goal_importance, goal_urgency | 3 |
| `habits` | Your Habits | execution_consistency, structure_preference, routine_stability, chronotype, primary_failure_modes | 5 |
| `energy` | Your Energy | recovery_resilience, energy_level, stress_load, life_load | 4 |
| `style` | Your Style | motivation_type, action_orientation, delay_discounting_choice, self_efficacy, planning_style, social_recharge_style | 6 |

After all sections: **Meet Your Mentors** screen → **Profile Summary** screen.

### 5.2 Canonical Question Schema

```typescript
type QuestionType = 'single_select' | 'multi_select' | 'scale';

interface QuestionDefinition {
  id: string;
  section: 'goal' | 'habits' | 'energy' | 'style';
  type: QuestionType;
  question: string;
  options?: { value: string; label: string }[];
  scaleMin?: number;
  scaleMax?: number;
  maxSelections?: number;  // for multi_select
}
```

### 5.3 Full Question List

1. **goal_domain** — single_select — "What do you want to improve right now?"
   - Options: Health & fitness, Energy & sleep, Productivity, Learning & skills, Mental wellbeing, Financial discipline, Other

2. **goal_importance** — scale 1–10 — "How important is this goal to you right now?"

3. **goal_urgency** — single_select — "How urgent is this for you?"
   - Options: Not urgent, Somewhat urgent, Urgent, Critical

4. **execution_consistency** — single_select — "When you plan something for the day, how often do you follow through?"
   - Options: Almost always, Often, Sometimes, Rarely

5. **structure_preference** — single_select — "How do you usually organise your day?"
   - Options: Detailed schedule, Rough plan, No plan, decide as I go

6. **routine_stability** — single_select — "How consistent is your daily routine?"
   - Options: Very consistent, Mostly consistent, Irregular, Completely unpredictable

7. **chronotype** — single_select — "When are you naturally most productive?"
   - Options: Early morning, Late morning, Afternoon, Evening, Late night

8. **primary_failure_modes** — multi_select (max 2) — "What most often stops you from achieving goals?"
   - Options: Lack of time, Low energy, Losing motivation, Distractions, Not knowing what to do next, Overcommitting, Stress / overwhelm

9. **recovery_resilience** — single_select — "When you miss a day, what usually happens next?"
   - Options: I get back on track immediately, I struggle but recover, I often fall off completely

10. **energy_level** — scale 1–10 — "How would you rate your daily energy levels?"

11. **stress_load** — scale 1–10 — "How overwhelmed do you feel day-to-day?"

12. **life_load** — single_select — "How many major commitments are you currently balancing?"
    - Options: 1–2, 3–4, 5–6, 7+

13. **motivation_type** — single_select — "What motivates you the most?"
    - Options: Seeing progress, Rewards / incentives, Accountability to others, Avoiding failure, Curiosity / interest

14. **action_orientation** — single_select — "Which feels more like you?"
    - Options: I act quickly and adjust later, I think carefully before acting

15. **delay_discounting_choice** — single_select — "Which would you choose?"
    - Options: $100 today, $150 in 1 month

16. **self_efficacy** — scale 1–10 — "If you set a realistic goal today, how confident are you that you'll complete it?"

17. **planning_style** — single_select — "Do you prefer:"
    - Options: Structure and clear plans, Flexibility and freedom

18. **social_recharge_style** — single_select — "Do you recharge more by:"
    - Options: Time alone, Time with others

## 6. Normalisation & Scoring

### 6.1 Normalisation Functions

All normalisation produces values in 0.0–1.0.

```typescript
// Likert 1–10
function normaliseLikert(value: number): number {
  return (Math.min(Math.max(value, 1), 10) - 1) / 9;
}

// Ordered categorical maps
const NORMALISATION_MAPS = {
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
```

### 6.2 Derived Scores

```typescript
// All inputs are normalised 0.0–1.0 values

function frictionIndex(stressLoad: number, lifeLoad: number, energyLevel: number): number {
  return clamp01(mean(stressLoad, lifeLoad, 1 - energyLevel));
}

function disciplineIndex(executionConsistency: number, routineStability: number, selfEfficacy: number): number {
  return clamp01(mean(executionConsistency, routineStability, selfEfficacy));
}

function structureNeed(stressLoad: number, routineStability: number, structurePreference: number): number {
  return clamp01(weighted([
    [stressLoad, 0.3],
    [1 - routineStability, 0.4],
    [structurePreference, 0.3],
  ]));
}

function dropoutRiskInitial(profile: NormalisedProfile): number {
  return clamp01(
    0.24 * (1 - profile.execution_consistency) +
    0.18 * profile.stress_load +
    0.14 * profile.life_load +
    0.12 * (1 - profile.recovery_resilience) +
    0.12 * (1 - profile.self_efficacy) +
    0.10 * (1 - profile.energy_level) +
    0.10 * (1 - profile.routine_stability)
  );
}

function goalSuccessPrior(profile: NormalisedProfile): number {
  return clamp01(
    0.25 * profile.execution_consistency +
    0.20 * profile.self_efficacy +
    0.15 * profile.energy_level +
    0.15 * profile.routine_stability +
    0.10 * profile.recovery_resilience +
    0.10 * profile.goal_importance +
    0.05 * profile.delay_discounting_score
  );
}
```

### 6.3 Weight Constants

All scoring weights are defined as named constants in `packages/core/src/profiling/constants.ts`. No magic numbers in scoring functions.

## 7. Profile Summary Generation

### 7.1 Template-Based (Instant)

Deterministic rules produce 4 fields: `strength`, `friction`, `strategy`, `this_week`.

```typescript
interface ProfileSummaryTemplate {
  strength: string;
  friction: string;
  strategy: string;
  this_week: string;
}
```

Example rule logic:

```
if discipline_index > 0.7:
  strength = "Strong follow-through when you commit"
elif goal_importance > 0.8:
  strength = "You care deeply about meaningful goals"
elif motivation_type == 'progress':
  strength = "You're driven by visible progress"

if friction_index > 0.65:
  friction = "Stress and high load erode your consistency"
elif recovery_resilience < 0.4:
  friction = "Missing a day tends to spiral"
elif execution_consistency < 0.4:
  friction = "Following through on plans is a challenge"
```

Strategy and this_week follow similar rule cascades based on profile scores, chronotype, and motivation type.

### 7.2 LLM Enrichment (Async)

After the template summary is displayed, an async call generates a 2–3 sentence personalised paragraph:

- Input: the normalised profile + template summary fields
- System prompt: "Write a warm, concise 2-3 sentence insight about this person's profile. No clinical language. No certainty claims. Focus on what will help them succeed."
- Streamed into the `summary_llm` field and displayed below the template cards
- Uses existing `@life-design/ai` package patterns

## 8. Onboarding Frontend

### 8.1 Flow Architecture

```
[Auth Gate] → [Onboarding Page]
  → Section: Your Goal (3 questions)
  → Section: Your Habits (5 questions)
  → Section: Your Energy (4 questions)
  → Section: Your Style (6 questions)
  → Meet Your Mentors (all 3 introduced)
  → Profile Summary (template instant + LLM streaming)
  → [Redirect to Dashboard]
```

### 8.2 UX Requirements

- One question visible per screen within each section
- Section header screen between groups ("Let's talk about your habits" with question count)
- Progress bar shows 4 sections + mentors + summary (6 segments)
- Within each section, a subtle sub-progress indicator
- Autosave after every answer (PATCH to API)
- Back/next navigation within and across sections
- Resume from last answered question on page reload
- Validation per question (required before advancing)
- Mobile-first design, max-width container

### 8.3 Question Renderers

Three component types:

- **ScaleQuestion** — 1–10 with tappable numbered circles, selected state highlighted
- **SingleSelect** — Vertical stack of option cards, selected state with border + check
- **MultiSelect** — Same as SingleSelect but with "select up to 2" constraint and toggle behaviour

### 8.4 Mentor Introduction Screen

Shows all 3 mentors in a vertical stack:
- Eleanor (Compassionate Therapist) — purple accent
- Theo (Focused Coach) — amber accent
- Maya (Reflective Sage) — green accent

Each mentor card shows: avatar, name, archetype label, 1-line description, and their greeting. No selection needed — this is informational. "Hear Voice" button optional (uses existing SpeechSynthesis pattern).

### 8.5 Profile Summary Screen

Single-column narrative layout:
1. Welcome header with user's name and check icon
2. White card with 4 labelled sections: strength (green), friction (amber), strategy (blue), this week (purple)
3. Second card below: LLM-enriched paragraph (streams in with loading state)
4. "Go to Dashboard" CTA button

## 9. API Endpoints

### 9.1 Onboarding APIs

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/onboarding/start` | Create onboarding_session, return session ID |
| PATCH | `/api/onboarding/answer` | Save individual answer, update raw_answers + position |
| GET | `/api/onboarding/status` | Return current session state for resume |
| POST | `/api/onboarding/complete` | Finalise: normalise, score, create user_profile, generate summary |

### 9.2 Profile APIs

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/profile` | Return current user_profile |
| POST | `/api/profile/recompute` | Trigger Supabase recomputation function |

### 9.3 Event APIs (Phase 2)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/events/ingest` | Validate and append to behavior_events |

### 9.4 Prediction APIs (Phase 3)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/predictions/dropout-risk` | Current dropout risk score |
| GET | `/api/predictions/interventions` | Recommended interventions |

## 10. Behavioural Learning Loop (Phase 2)

### 10.1 Event Ingestion

```
Client emits event → POST /api/events/ingest
  → Validate event schema (type, timestamp, metadata)
  → Append to behavior_events table
  → If milestone event → trigger async profile recomputation
```

### 10.2 Profile Recomputation Strategy

**Supabase function:** `recompute_user_profile(p_user_id UUID)`

Triggers:
- After onboarding completion
- After meaningful behavioural milestones (configurable threshold)
- Nightly batch via pg_cron
- Weekly deeper recalibration via pg_cron

### 10.3 Source Weight Shifting

```jsonc
// Week 0 (onboarding only)
{ "onboarding": 1.0, "behaviour": 0.0 }

// Week 2
{ "onboarding": 0.5, "behaviour": 0.5 }

// Week 6-8+
{ "onboarding": 0.2, "behaviour": 0.8 }
```

The shift is explicit in `source_mix` JSONB. The recomputation function reads behavioural event aggregates and blends with onboarding priors using these weights.

### 10.4 Behavioural Features (computed from events)

- task_completion_rate (7d, 14d, 30d windows)
- streak_strength (current, max)
- schedule_adherence
- response_latency (time from reminder to action)
- checkin_compliance
- session_frequency
- goal_edits_count / goal_abandonment_count
- time_of_day_performance (bucketed by chronotype)

## 11. Prediction & Intervention Engine (Phase 3)

### 11.1 Phase 3a: Rules + Weighted Scoring

Deterministic scoring for:
- **Dropout risk** — weighted combination of friction_index, discipline_index, recent behavioural signals
- **Recommended task size** — based on energy, life load, recent completion rate
- **Intervention type** — mapped from motivation_type + current risk level
- **Reminder intensity** — based on response_latency + chronotype
- **Scheduling windows** — chronotype + time_of_day_performance

### 11.2 Phase 3b: Supervised Models

After sufficient data volume, train:
- 7-day dropout risk (logistic regression)
- 14-day goal success probability (gradient boosting)
- Intervention response probability (calibrated model)
- Reminder open likelihood

### 11.3 Phase 3c: Contextual Personalisation

Contextual bandits or RL for:
- Intervention type selection
- Reminder timing optimisation
- Challenge difficulty calibration

Only after substantial event volume.

### 11.4 Intervention Rules

```
High stress + low consistency:
  → micro tasks, reduced reminder volume, self-compassion framing

High accountability motivation:
  → check-ins, commitment prompts, streak framing

High progress motivation:
  → charts, visible progress bars, milestone framing, weekly deltas

High delay discounting:
  → immediate rewards, shortened feedback loops
```

### 11.5 LLM Role

LLM verbalises decisions made by the structured engine. It does NOT make scoring or recommendation decisions.

```
Engine decides:    risk=0.72, intervention=accountability_checkin,
                   task_size=micro, reminder_time=7:30pm

LLM verbalises:    "You're more likely to stay consistent with a small,
                    specific action tonight than a full session."
```

## 12. Old Onboarding Removal

### 12.1 Files to Remove

```
apps/web/src/components/onboarding/
  onboarding-wizard.tsx           # Replace with profiling-wizard.tsx
  flow-state.tsx                  # Replace with new state management
  progress-dots.tsx               # Replace with section-based progress
  steps/
    welcome-step.tsx              # Remove
    name-step.tsx                 # Remove (name comes from auth)
    about-step.tsx                # Remove
    mentor-step.tsx               # Replace with mentor-intro.tsx
    complete-step.tsx             # Replace with profile-summary.tsx
  voice/                          # Evaluate — keep if voice onboarding is separate feature
  hooks/
    use-onboarding-conversation.ts  # Remove (conversational onboarding replaced)
    use-speech-recognition.ts       # Keep if used elsewhere
    use-speech-synthesis.ts         # Keep if used elsewhere
  glass-container.tsx             # Remove
  __tests__/
    onboarding-wizard.test.tsx    # Replace with new tests
```

### 12.2 Files to Update

```
apps/web/src/app/(protected)/onboarding/page.tsx
  → Rewrite to use new ProfilingWizard

apps/web/src/app/(protected)/onboarding/actions.ts
  → Rewrite server actions for new flow

apps/web/src/lib/guest-context.tsx
  → Remove onboarding-specific localStorage keys
  → Update onboarded check to use profiles.onboarding_status

apps/web/src/lib/route-guard.ts
  → No changes needed (onboarding already in PUBLIC_GUEST_PREFIXES)

apps/web/src/middleware.ts
  → Update onboarding check from cookie to Supabase profile status

apps/web/src/lib/onboarding-session.ts
  → Remove entirely (localStorage session management no longer needed)

apps/web/src/lib/onboarding-checkpoint.ts
  → Remove entirely
```

### 12.3 Legacy Data Handling

- Existing `profiles` columns (profession, interests, etc.) are kept but deprecated
- Add migration comment: `-- DEPRECATED: legacy onboarding fields, preserved for data continuity`
- Existing users with `onboarded = true` get `onboarding_status = 'completed'` via migration
- Optionally prompt existing users to "refresh your profile" with the new onboarding

## 13. Security, Privacy & Safety

### 13.1 Required Safeguards

- No medical diagnosis language in summaries or interventions
- No certainty claims ("you will fail" → "you may find it harder")
- No manipulative pressure tactics in nudges
- Allow opt-out of profiling-derived nudges (future settings toggle)
- Explain profile usage transparently (profile summary explains what's being measured)

### 13.2 Audit Logging

Store in every profile computation:
- Model/rule version used
- Input feature vector hash
- Scoring function version
- Intervention type chosen + rationale tags

### 13.3 Data Protection

- All profile data behind RLS
- Service role only for recomputation functions
- No profile data in client-side localStorage
- Event metadata validated against schema before storage

## 14. Testing Strategy

### 14.1 Unit Tests

- All normalisation functions (pure, deterministic)
- All scoring functions (derived scores)
- Summary template generation
- Question validation logic

### 14.2 Integration Tests

- Onboarding flow state transitions (start → answer → complete)
- API endpoint request/response contracts
- Profile creation from complete answer set
- Event ingestion validation

### 14.3 E2E Tests (future)

- Full onboarding flow with Playwright
- Resume from partial completion
- Profile summary rendering

## 15. Build Sequence

### Phase 1 (This Implementation)

1. New Supabase migration: tables + RLS + onboarding_status column
2. Profiling types and constants in `packages/core`
3. Normalisation and scoring functions in `packages/core` with tests
4. Summary template logic with tests
5. Backend API routes (start, answer, status, complete, profile)
6. Frontend: question schema, renderers, wizard shell, section headers
7. Frontend: mentor intro screen, profile summary screen
8. Update middleware and auth flow for new onboarding status
9. Remove old onboarding components and files
10. Update guest-context to remove onboarding localStorage
11. Integration tests for flow state transitions

### Phase 2 (Event Pipeline)

12. Event ingestion API route with validation
13. Supabase recomputation function (plpgsql)
14. Profile recompute API route
15. pg_cron setup for nightly/weekly recomputation
16. Source weight shifting logic

### Phase 3 (Predictions & Interventions)

17. Deterministic prediction rules
18. Intervention mapping engine
19. Prediction API routes
20. LLM verbalisation layer
21. Supervised model training pipeline (when data volume sufficient)
