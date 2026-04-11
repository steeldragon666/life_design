# Life Design App — Full Redesign & Redevelopment Design

> **Supersedes:** `2026-04-11-research-backed-redesign-design.md` and the PDF Codebase Assessment (April 2026). This is the single authoritative design document for the Life Design redesign.

**Goal:** Transform the Life Design app from a feature-bloated wellness tracker into a lean, clinically-informed, ML-powered personal development platform. 30 work items across Sprint 0 + 4 phases over 32 weeks.

**Architecture:** Preserves existing monorepo (`apps/web`, `packages/ui`, `packages/core`, `packages/ai-local`, `packages/ai`) and Supabase backend. Adds clinical instruments, intelligent sensing, personalised ML, and federated analytics. On-device inference via `ai-local` for latency-sensitive workloads (JITAI, mood prediction); server-side for compute-heavy workloads (N-of-1 training, federated aggregation, SHAP).

**Tech Stack:** Next.js 15 / React 19, Supabase (Postgres + Edge Functions + pgvector), ONNX Runtime (ai-local), Tailwind CSS v4, CVA, Vitest, pnpm workspaces + Turborepo.

---

## Constraints & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Full 4-phase + Sprint 0 | Complete spec alignment across all 28 changes + 15 PDF deletions |
| Release strategy | Phase-gated | Each phase ships as one release after all items complete |
| Team | Solo (developer + Claude) | Sequential tasks, no parallel workstreams |
| Time pressure | Extend timeline | Quality over speed — no scope cuts |
| Deletions | Sprint 0 (clean slate first) | Remove all dead code before building new features |
| Integration status | Unknown — audit in Phase 1 | Discovery task with repair buffer |
| Feature removals | Hard delete | Git history preserves if needed |
| ML workload split | Hybrid | JITAI/inference on-device, training/aggregation server-side |
| Compliance posture | Hybrid | Research-grade instruments + clinical-grade crisis pathways |

---

## Sprint 0: Cleanup (Weeks 1-2)

**Goal:** Remove all 15 non-spec features, trim navigation from 11 to 7 items, remove Notion/Slack from onboarding cards and API routes, verify clean build and deploy.

### 0.1 Delete 8 Protected Routes

Delete the entire directory for each:

| Route | Directory | Reason |
|-------|-----------|--------|
| `/simulator` | `apps/web/src/app/(protected)/simulator/` | No clinical basis, speculative what-if modelling |
| `/orb` | `apps/web/src/app/(protected)/orb/` | Decorative 3D visualisation, spec prefers clinical charts |
| `/rituals` | `apps/web/src/app/(protected)/rituals/` | Replaced by JITAI engine in Phase 2 |
| `/meditations` | `apps/web/src/app/(protected)/meditations/` | AI-generated TTS meditations, not in spec |
| `/challenges` | `apps/web/src/app/(protected)/challenges/` | Gamification the spec warns against |
| `/journey` | `apps/web/src/app/(protected)/journey/` | AI-generated narrative, no clinical basis |
| `/schedule` | `apps/web/src/app/(protected)/schedule/` | Local Dexie planner, replaced by Calendar integration |
| `/achievements` | `apps/web/src/app/(protected)/achievements/` | Streak/volume badges, spec says remove |

### 0.2 Delete Associated Components, Libraries, and API Routes

**Components to delete:**
- `apps/web/src/components/achievements/`
- `apps/web/src/components/challenges/`
- `apps/web/src/components/meditation/`
- `apps/web/src/components/audio/`
- `apps/web/src/components/voice/`
- `apps/web/src/components/video/`
- `apps/web/src/components/schedule/`
- `apps/web/src/components/dashboard/life-orb*` (orb-specific files)
- `apps/web/src/components/dashboard/orb-widget.tsx`

**Libraries to delete:**
- `apps/web/src/lib/achievements/`
- `apps/web/src/lib/challenges/`
- `apps/web/src/lib/services/journey-service.ts`
- `apps/web/src/lib/services/pathway-service.ts`

**API routes to delete:**
- `apps/web/src/app/api/auth/notion/`
- `apps/web/src/app/api/auth/slack/`
- `apps/web/src/app/api/integrations/notion/`
- `apps/web/src/app/api/integrations/slack/`
- `apps/web/src/app/api/tts/`
- `apps/web/src/app/api/journey/`
- `apps/web/src/app/api/weekly-digest/` (review for clinical export repurposing)

### 0.3 Trim Navigation

Update `apps/web/src/app/(protected)/protected-layout-client.tsx`:

**Before (11 items):** Home, Goals, Check-in, Journal, My Journey, Mentor, Schedule, Simulate, Challenges, Badges, Settings

**After (7 items):** Home (Dashboard), Check-in, Journal, Goals, Insights & Correlations, Mentor, Settings

Remove unused Lucide icon imports: `Route`, `Calendar`, `FlaskConical`, `Flame`, `Trophy`.

### 0.4 Clean Onboarding Cards

Remove Notion and Slack from both `data-import-card.tsx` and `connect-apps-card.tsx`. Reduce to 3 confirmed integrations (Strava, Spotify, Google Calendar) until Phase 2 connectors are verified and extended.

### 0.5 Clean Dashboard References

Remove any cards, links, or widgets on the dashboard that reference deleted features (orb widget, journey link, achievements link).

### 0.6 Build Verification & Deploy

Run `pnpm build`, fix any broken imports from deleted code, verify all remaining routes work. Deploy as Sprint 0 release.

**Estimated removal:** ~3,000-4,000 LOC across 40+ files.

---

## Phase 1: Clinical Foundation (Weeks 3-8)

**Goal:** Establish the clinical and safety baseline. After this phase the app has validated screening instruments, sleep analysis, opt-in data tiers, a 5-point check-in scale, crisis de-escalation in mentor chat, and validated baseline assessments in onboarding.

### 2.1 Integration Audit (Week 3 - discovery)

Smoke test each remaining connector's OAuth flow and data return:
- Strava, Spotify, Google Calendar, Apple Health, Banking, Weather
- Document status per connector: Working / Broken / Stub-only
- Budget 1 week for repairs on any broken connectors
- Gates Phase 2 work -- no point building Spotify mood inference on a broken OAuth flow

### 2.2 PHQ-9 & GAD-7 Clinical Screening (CRITICAL)

- Add validated question banks to `packages/core/src/profiling/instruments.ts`
- PHQ-9: 9 items, 0-3 Likert scale, severity bands (minimal 0-4, mild 5-9, moderate 10-14, moderately severe 15-19, severe 20-27)
- GAD-7: 7 items, 0-3 Likert scale, severity bands (minimal 0-4, mild 5-9, moderate 10-14, severe 15-21)
- Migration 00029 exists -- verify schema covers `clinical_screenings` table (user_id, instrument, scores, severity, timestamp)
- Screening results UI in settings/profile area
- Mandatory disclaimer: "This is a screening tool, not a clinical diagnosis"
- Periodic scheduling: PHQ-2/GAD-2 weekly short form, full PHQ-9/GAD-7 monthly

### 2.3 Sleep Architecture Analysis Engine (CRITICAL)

- `supabase/functions/sleep-analysis/` exists -- extend with:
  - REM/deep/light stage distribution analysis
  - Circadian rhythm regularity scoring
  - Sleep latency, efficiency, wake-after-sleep-onset metrics
- Migration 00031 exists -- verify schema for `sleep_analysis` table
- Surface sleep quality trends in health dimension view
- Consumes Apple Health sleep data via existing connector (depends on 2.1 audit)

### 2.4 Tiered Opt-In Value Exchange System (HIGH)

- Migration 00032 and `packages/core/src/privacy/opt-in-tiers` types already exist
- Build Settings UI for tier selection:
  - **Basic:** mood + journal only
  - **Enhanced:** + health sensors + integrations
  - **Full:** + behavioural + financial data
- Each tier shows clear value exchange: "share X -> get Y insight"
- Enforce tier at data collection points (connectors respect user's tier)
- Add tier selection step to onboarding flow

### 2.5 Five-Point Visual Check-in Scale (HIGH)

- Replace 1-10 slider with 5-point discrete visual scale (emoji or icon-based)
- Modify `checkin-form.tsx`, `mood-slider.tsx`, `ghost-slider.tsx`
- Migration 00030 exists for historical data normalisation (1-2->1, 3-4->2, 5-6->3, 7-8->4, 9-10->5)
- Update all correlation/analysis code to expect 5-point scale
- Update ML feature pipeline normalisation in `packages/core`

### 2.6 AI Mentor Crisis De-escalation (CRITICAL - Clinical-Grade)

- Keyword/pattern detection for crisis indicators in mentor chat
- Safety response protocol: acknowledge -> validate -> resources -> suggest professional help
- Hardcoded helpline numbers (Lifeline 13 11 14, Beyond Blue 1300 22 4636, 000 for emergencies)
- Never-fail design: if detection uncertain, err on side of showing resources
- Audit logging to `crisis_events` table (timestamp, trigger, response)
- Crisis responses cannot be overridden by mentor personality
- Playwright E2E tests for all crisis pathways

### 2.7 Onboarding Baseline Assessment (CRITICAL)

- Extend `profiling-wizard.tsx` to include PHQ-9 + GAD-7 as initial clinical screening
- Informed consent step before clinical instruments
- Baseline scores stored for future comparison
- Skip option with explanation of reduced personalisation
- Depends on 2.2 being complete

### 2.8 Streak Badge Restructuring (HIGH)

- Remove streak celebration badges (3-day, 7-day, 14-day, 30-day)
- Keep quality-recognition badges only (first-checkin, all-dimensions)
- Streak counters remain as passive indicators, no celebratory mechanics
- Remove achievements page as standalone route (already deleted in Sprint 0)
- Update any dashboard references to badge counts

**Phase 1 exit criteria:** Build passes, all CRITICAL items complete, phase-gate deployment.

---

## Phase 2: Intelligent Sensing (Weeks 9-16)

**Goal:** Build the real-time intelligence layer. After this phase the app has JITAI adaptive interventions, HRV stress tracking, Spotify mood inference, exercise-mood correlations, social isolation detection, weather context, and an adaptive check-in engine.

### 3.1 JITAI Adaptive Interventions Engine (CRITICAL)

- `supabase/functions/jitai-engine/` and `packages/core/src/jitai/` exist as stubs
- Migration 00033 exists -- verify schema
- On-device inference module in `packages/ai-local/` for real-time intervention decisions
- Context features: time of day, recent mood, activity level, sleep quality (from 2.3), calendar density, HRV stress (from 3.2)
- Intervention types: nudge timing, content selection, intensity adjustment
- Decision logging for model improvement
- Backbone for Phase 2 -- items 3.2-3.6 all feed context into JITAI

### 3.2 HRV Stress & Regulation Tracking (HIGH)

- Migration 00034 and `packages/core/src/health/hrv-analysis.ts` exist
- Extend Apple Health connector for HRV data ingestion
- Stress index computation: RMSSD, SDNN, LF/HF ratio
- Stress trend visualisation in health dimension view
- Feed HRV features into JITAI context (depends on 3.1)

### 3.3 Spotify Mood Inference Pipeline (HIGH)

- Extend Spotify connector for recently played tracks
- Audio features API: valence, energy, danceability -> mood classification
- Listening pattern analysis: genre shifts, tempo changes as mood indicators
- Feed into check-in pre-fill suggestions and JITAI context
- New service -- no existing foundation beyond OAuth connector
- Depends on integration audit (2.1) confirming Spotify works

### 3.4 Strava Exercise-Mood Correlation Engine (HIGH)

- Extend Strava connector for detailed activity data (type, duration, intensity, HR zones)
- Lag analysis: mood change at 2h, 6h, 24h, 48h after exercise
- Correlation with confidence intervals
- Reframe away from performance comparison -- focus on exercise consistency and mood impact
- Surface in correlations view and insights
- Depends on integration audit (2.1) confirming Strava works

### 3.5 Calendar Social Isolation Detection (HIGH)

- Extend Google Calendar connector for event metadata
- Social density metrics: events with others vs solo, gaps between social contact
- Isolation flags when social density drops below personal baseline (rolling 14-day window)
- Feed into JITAI for social nudges (depends on 3.1)
- Depends on integration audit (2.1) confirming Google Calendar works

### 3.6 Weather & Environmental Context (MEDIUM)

- New weather service -- no existing foundation
- Features: temperature, sunlight hours, barometric pressure, precipitation
- Seasonal pattern detection (SAD indicators via sunlight trend)
- Feed into JITAI and correlation engine as contextual features
- Lowest dependency -- can be built independently

### 3.7 Adaptive EMA Question Engine (CRITICAL)

- `packages/core/src/ema/` exists as foundation
- Replace static check-in questions with ML-driven question selection
- Question pool with metadata: dimension, response burden, information value
- Selection algorithm: maximise information gain while minimising user burden
- Personalised question frequency based on dimension volatility
- On-device question selection via `ai-local`
- Replaces the fixed check-in form from Phase 1 (2.5) with an intelligent version

### 3.8 Nudge Engine to JITAI Integration (CRITICAL)

- Upgrade `supabase/functions/nudge-engine/` to consume JITAI decisions from 3.1
- Upgrade `apps/web/src/lib/nudge/nudge-scheduler.ts` for JITAI-driven timing
- Replace rule-based nudges with context-aware interventions
- Preserve existing nudge UI components

### 3.9 Correlation Engine: Lag Analysis & Confidence (HIGH)

- Upgrade `supabase/functions/correlation-worker/` with lag analysis (1h to 72h windows)
- Add confidence intervals to all correlations
- Minimum sample size enforcement (no correlations shown with <14 data points)
- Granger causality testing for stronger causal claims
- Upgrade `packages/core/src/correlation.ts` types
- Update correlations UI to show lag windows and confidence bands

**Recommended build order (solo dev):**
3.6 (Weather) -> 3.1 (JITAI backbone) -> 3.2 (HRV) -> 3.3 (Spotify mood) -> 3.4 (Strava correlations) -> 3.5 (Calendar isolation) -> 3.9 (Correlation upgrades) -> 3.8 (Nudge-JITAI wiring) -> 3.7 (Adaptive EMA)

**Phase 2 exit criteria:** JITAI engine making real-time intervention decisions using >= 3 context sources, adaptive EMA live, correlation engine showing lag analysis with confidence intervals.

---

## Phase 3: Personalisation Engine (Weeks 17-24)

**Goal:** Build per-user ML models that predict mood and dimension trends, make predictions explainable, add screen time phenotyping, enable clinical data export, add music-aware CBT, enhance journal NLP, and reframe banking toward financial stress.

### 4.1 N-of-1 Personalised Prediction Models (CRITICAL)

- `supabase/functions/model-trainer/` exists as stub, migration 00036 covers `model_artifacts`
- Server-side training pipeline: per-user model on accumulated feature vectors from Phases 1-2
- Model architecture: lightweight gradient boosting (XGBoost/LightGBM)
- Feature vectors: mood history, sleep metrics, HRV, exercise, social density, weather, screen time, financial stress, Spotify mood, EMA responses
- Prediction targets: next-day mood, dimension trend direction, intervention responsiveness
- Trained model exported to ONNX, pushed to client for on-device inference via `ai-local`
- Retraining schedule: weekly when >= 7 new data points accumulated
- Minimum data threshold: no model trained until user has >= 30 days of check-in data

### 4.2 Explainable AI - SHAP/LIME Layer (HIGH)

- `supabase/functions/shap-explainer/` exists as stub, migration 00037 covers `shap_explanations`
- Server-side SHAP value computation for each N-of-1 prediction
- Cache explanations per prediction in Supabase
- Serve to existing `explainability-tooltip.tsx` component
- User-facing language: "Your sleep quality and exercise contributed most to today's prediction"
- Top-3 feature attribution per prediction
- Depends on 4.1

### 4.3 Screen Time Digital Phenotyping (MEDIUM)

- `packages/core/src/connectors/screen-time/` exists, migration 00038 covers schema
- Behavioural features: total screen time, app category distribution, pickup frequency, session duration
- Pattern extraction: late-night usage spikes, social media time trends, productivity app engagement shifts
- Feed into N-of-1 model features (4.1) and JITAI context
- Platform-specific: iOS Screen Time API / Android Digital Wellbeing

### 4.4 Clinical Data Export for Therapists (HIGH)

- `apps/web/src/app/api/export/clinical/` exists, migration 00039 covers `export_audit`
- PDF export: PHQ-9/GAD-7 score trends, mood patterns, sleep quality, key correlations
- Structured data export: JSON/CSV with clinical metadata
- Privacy controls: user selects which data categories to include
- Shareable link with configurable expiry (24h/7d/30d) for therapist access
- Clinical-grade audit trail: all export events logged
- GDPR-compliant: user can revoke shared links

### 4.5 Music-Aware CBT Mood Regulation Module (MEDIUM)

- No existing foundation -- new service
- Combines Spotify mood state (from 3.3) with CBT technique library
- Low valence/energy detected -> suggest matched techniques (cognitive restructuring, behavioural activation, mindfulness)
- Matching playlist suggestions alongside technique
- Effectiveness tracking: did mood improve in next check-in?
- Feed effectiveness data back into N-of-1 model (4.1)

### 4.6 Journal Linguistic Biomarker Detection (MEDIUM)

- Extend `journal-analysis-service.ts`, migration 00040 covers schema
- NLP detection: cognitive distortions (all-or-nothing, catastrophising, personalisation, overgeneralisation)
- Track: emotional word frequency, first-person pronoun ratio, syntactic complexity
- Trend analysis: linguistic markers over time as mental health indicators
- Educational framing -- never alarming
- Feed linguistic features into N-of-1 model

### 4.7 Open Banking: Financial Stress Reframe (MEDIUM)

- Extend `apps/web/src/lib/integrations/banking.ts`
- Shift from spending tracking to financial stress detection
- Transaction pattern analysis: spending velocity changes, category shifts, balance trajectory
- Financial stress index computed from patterns relative to personal baseline
- Privacy: computation on aggregated patterns only, no individual transactions stored
- Only available to "Full" opt-in tier users

**Recommended build order:**
4.1 (N-of-1) -> 4.2 (SHAP) -> 4.3 (Screen time) -> 4.6 (Journal biomarkers) -> 4.7 (Financial stress) -> 4.4 (Clinical export) -> 4.5 (Music CBT)

**Phase 3 exit criteria:** N-of-1 models training for users with >= 30 days data, SHAP explanations in insights, clinical export generating valid PDFs, all new data sources feeding prediction pipeline.

---

## Phase 4: Scale & Privacy (Weeks 25-32)

**Goal:** Enable privacy-preserving population-level insights through federated learning.

### 5.1 Federated Privacy-Preserving Analytics (MEDIUM)

- `supabase/functions/federated-coordinator/`, `packages/core/src/federated/`, migration 00041 exist

**Local training module:**
- On-device model training using `ai-local` on user's personal feature vectors
- Produces model gradient updates (not raw data) for aggregation
- Triggered after N-of-1 model retraining (from 4.1)

**Encrypted gradient upload:**
- Client-side encryption before transmission
- Secure aggregation: server combines gradients without seeing individual contributions

**Differential privacy:**
- Calibrated noise injection on gradients (target epsilon = 1.0)
- Privacy budget tracking per user

**Coordination server:**
- Supabase edge function orchestrating aggregation rounds
- Minimum participation threshold per round (>= 50 users)
- Weekly aggregation cycles
- Model versioning

**Population insights dashboard:**
- Consumes federated aggregates only
- Anonymised trend patterns: seasonal effects, common correlations
- Clear labelling: "Based on aggregate patterns from N participants"

**Opt-in controls:**
- Only "Full" opt-in tier users can contribute
- Explicit consent flow
- Withdrawal at any time

**Phase 4 exit criteria:** Federated coordination running aggregation rounds, population insights dashboard live, differential privacy verified (epsilon <= 1.0), end-to-end gradient encryption confirmed.

---

## Cross-Cutting Concerns

### Testing

- **Unit/Integration:** Vitest with TDD for all new services and core logic
- **E2E:** Playwright for critical paths (crisis de-escalation, clinical screening, data export, onboarding, check-in)
- **ML validation:** Train/test splits, accuracy thresholds, fairness checks on N-of-1 models
- **Each phase must pass full build + test suite before phase-gate deployment**

### Database Migration Discipline

- Sequential migrations from 00027+ (currently at 00042)
- Each feature gets its own migration file
- Backward-compatible where possible
- All migrations tested against local Supabase before deployment

### Privacy & Compliance

- All new data collection gated behind opt-in tiers
- GDPR-compliant export and deletion at every tier
- Clinical data retention policies: screening results retained for clinical value, deletable on request
- Audit logging for all crisis events and clinical data exports

### Documentation

- `ARCHITECTURE.md`, `DATA_MODEL.md`, `ML_AND_ANALYSIS_EXPLAINER.md` updated per phase
- `CLINICAL_SAFETY.md` updated when crisis pathways change
- Each phase-gate deployment includes documentation review pass

---

## Timeline Summary

| Phase | Weeks | Key Deliverables | Items |
|-------|-------|-----------------|-------|
| Sprint 0 | 1-2 | Clean codebase: 15 deletions, nav trim, onboarding cleanup | 6 tasks |
| Phase 1 | 3-8 | Clinical screening, sleep analysis, opt-in tiers, 5-point scale, crisis de-escalation, onboarding baseline, badge restructuring | 8 items |
| Phase 2 | 9-16 | JITAI engine, HRV, Spotify mood, Strava correlations, social isolation, weather, adaptive EMA, nudge upgrade, correlation upgrade | 9 items |
| Phase 3 | 17-24 | N-of-1 models, SHAP explainability, screen time, clinical export, music CBT, journal biomarkers, financial stress | 7 items |
| Phase 4 | 25-32 | Federated learning, population insights, differential privacy | 1 large item |
| **Total** | **32 weeks** | | **31 items** |

**Timeline policy:** If any phase takes longer than estimated, extend the timeline. Quality over speed. No scope cuts.
