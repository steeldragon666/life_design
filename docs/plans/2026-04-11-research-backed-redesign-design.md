# Life Design App — Research-Backed Redesign Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create the implementation plan from this design.

**Goal:** Transform the Life Design app from a wellness tracker into a clinically-informed, ML-powered personal development platform across 28 research-backed changes over 30 weeks.

**Architecture:** Preserves existing monorepo (apps/web, packages/ui, packages/core, packages/ai-local, packages/ai) and Supabase backend. Adds clinical instruments, intelligent sensing, personalised ML, and federated analytics. On-device inference via ai-local for latency-sensitive workloads (JITAI, mood prediction); server-side for compute-heavy workloads (N-of-1 training, federated aggregation, SHAP).

**Tech Stack:** Next.js 15 / React 19, Supabase (Postgres + Edge Functions + pgvector), ONNX Runtime (ai-local), Tailwind CSS v4, CVA, Vitest, pnpm workspaces + Turborepo.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Feature removals | Hard delete | Clean codebase, no dead code. Git history preserves if needed. |
| Compliance posture | Hybrid | Research-grade instruments + clinical-grade crisis pathways only |
| ML workload split | Hybrid | JITAI/inference on-device, training/aggregation server-side |
| Federated learning | Full implementation | Phase 4, complete federated infrastructure |
| Existing integrations | Audit first | Smoke test in Phase 1 before building analysis layers |

---

## Phase 1: Clinical Foundation (Weeks 1–6)

### Removals (Hard Delete)

**1. Performance-Based Fitness Leaderboards** (CRITICAL)
- Delete leaderboard UI components and routes
- Migration to drop leaderboard tables/columns from gamification schema (migration 00012)
- Remove references from dashboard and dimension views

**2. Instagram Integration** (HIGH)
- Delete `apps/web/src/app/api/auth/instagram/route.ts`
- Delete `apps/web/src/app/api/integrations/instagram/callback/route.ts`
- Remove Instagram from onboarding connect-apps-card, data-import-card, settings
- Remove from `packages/core/src/enums.ts` provider list
- Migration to drop Instagram-related rows from integration tables

**3. Gamification Volume Badges** (HIGH)
- Audit badge definitions in gamification migration 00012
- Remove quantity-based badges (e.g., "100 check-ins", "50 journal entries")
- Keep milestone/quality badges (e.g., "first check-in", "7-day streak")
- Update achievement components to reflect reduced badge set

### Additions

**4. PHQ-9 & GAD-7 Clinical Screening** (CRITICAL)
- Add validated question banks to `packages/core/src/profiling/instruments.ts`
- PHQ-9: 9 items, 0-3 Likert scale, scoring: 0-4 minimal, 5-9 mild, 10-14 moderate, 15-19 moderately severe, 20-27 severe
- GAD-7: 7 items, 0-3 Likert scale, scoring: 0-4 minimal, 5-9 mild, 10-14 moderate, 15-21 severe
- New migration for clinical_screenings table (user_id, instrument, scores, severity, timestamp)
- Screening results UI in profile/settings area
- Disclaimers: "This is a screening tool, not a clinical diagnosis"

**5. Sleep Architecture Analysis Engine** (CRITICAL)
- New Supabase edge function `supabase/functions/sleep-analysis/`
- Consumes Apple Health sleep data via existing connector
- Computes: sleep stages distribution, sleep latency, efficiency, wake-after-sleep-onset
- Stores computed metrics in new sleep_analysis table
- Surfaces sleep quality trends in health dimension view

**6. Tiered Opt-In Value Exchange System** (HIGH)
- Three tiers: Basic (mood + journal), Enhanced (health sensors + integrations), Full (behavioural + financial)
- Each tier shows clear benefit: what you share → what you get
- Stored in user profile, enforced at data collection points
- UI component for tier selection in onboarding and settings
- Migration for opt_in_tier column on profiles

**7. Integration Audit** (Phase 1 prerequisite)
- Smoke test each connector: Spotify, Strava, Apple Health, Google Calendar, weather, banking
- Verify OAuth flows complete, data returns, error handling works
- Document status and file issues for any broken connectors
- Budget 1 week for repairs if needed

### Restructurings

**8. 1-10 Scale → 5-Point Visual Scale** (HIGH)
- Modify `checkin-form.tsx`, `mood-slider.tsx`, `ghost-slider.tsx`
- New visual scale component (emoji or icon-based, 5 discrete points)
- Migration to normalise historical 1-10 data to 1-5 scale (round: 1-2→1, 3-4→2, 5-6→3, 7-8→4, 9-10→5)
- Update all correlation/analysis code to expect 5-point scale
- Update ML feature pipeline normalisation

**9. AI Mentors: Crisis De-escalation Intent** (CRITICAL, Clinical-Grade)
- Keyword/pattern detection for crisis indicators in mentor chat
- Safety response protocol: acknowledge → validate → provide resources → suggest professional help
- Hardcoded helpline numbers (Lifeline 13 11 14, Beyond Blue 1300 22 4636, 000 for emergencies)
- Never-fail design: if detection uncertain, err on side of showing resources
- Audit logging: all crisis detections logged to `crisis_events` table with timestamp, trigger, response
- Separate from main chat flow — crisis responses cannot be overridden by mentor personality
- E2E test coverage for all crisis pathways

**10. Onboarding: Validated Baseline Assessment** (CRITICAL)
- Extend `profiling-wizard.tsx` with PHQ-9 + GAD-7 as initial screening
- Informed consent step before clinical instruments
- Baseline scores stored and used as comparison point for future screenings
- Skip option with explanation of reduced personalisation

---

## Phase 2: Intelligent Sensing (Weeks 7–14)

### Additions

**11. JITAI Engine** (CRITICAL)
- On-device inference module in `packages/ai-local/` for real-time intervention decisions
- Server-side rule management in new `supabase/functions/jitai-engine/`
- Context features: time of day, recent mood, activity level, sleep quality, calendar density
- Intervention types: nudge timing, content selection, intensity adjustment
- Decision logging for model improvement

**12. HRV Stress & Regulation Tracking** (HIGH)
- Extend Apple Health connector (`packages/core/src/connectors/apple-health.ts`) for HRV data
- Stress index computation: RMSSD, SDNN, LF/HF ratio
- New migration for hrv_metrics table
- Stress trend visualisation in health dimension
- Feed HRV features into JITAI context

**13. Spotify Mood Inference Pipeline** (HIGH)
- Extend `apps/web/src/lib/integrations/spotify.ts` for recently played tracks
- Audio features API: valence, energy, danceability → mood classification
- Listening pattern analysis: genre shifts, tempo changes as mood indicators
- Feed into check-in pre-fill suggestions and JITAI context
- Extend `spotify-reflection.tsx` with mood inference display

**14. Strava Exercise-Mood Correlation Engine** (HIGH)
- Extend Strava connector for detailed activity data (type, duration, intensity, HR)
- Lag analysis: mood change 2h, 6h, 24h, 48h after exercise
- Correlation confidence intervals
- Surface in correlations view and insights

**15. Calendar & Social Isolation Detection** (HIGH)
- Extend Google Calendar connector for event metadata
- Social density metrics: events with others vs solo, gaps between social contact
- Isolation flags when social density drops below personal baseline
- Feed into JITAI for social nudges

**16. Weather & Environmental Context** (MEDIUM)
- Extend `apps/web/src/lib/integrations/weather.ts` for forecast + historical
- Features: temperature, sunlight hours, barometric pressure, precipitation
- Seasonal pattern detection (SAD indicators)
- Feed into JITAI and correlation engine as contextual features

**17. Adaptive EMA Question Engine** (CRITICAL)
- Replace static check-in questions with ML-driven selection
- Question pool with metadata (dimension, burden, information value)
- Selection algorithm: maximise information gain while minimising user burden
- Personalised question frequency based on volatility of each dimension
- On-device question selection via `ai-local`

### Restructurings

**18. Nudge Engine → JITAI-Integrated System** (CRITICAL)
- Upgrade `supabase/functions/nudge-engine/` to consume JITAI decisions
- Upgrade `apps/web/src/lib/nudge/nudge-scheduler.ts` for JITAI-driven timing
- Replace rule-based nudges with context-aware interventions
- Preserve existing nudge UI components

**19. Correlation Engine: Lag Analysis & Confidence** (HIGH)
- Upgrade `supabase/functions/correlation-worker/` with lag analysis (1h to 72h windows)
- Add confidence intervals to all correlations
- Upgrade `packages/core/src/correlation.ts` types
- Update correlations UI to show lag and confidence

### Removals (Hard Delete)

**20. Future Self Visualization Standalone** (MEDIUM)
- Delete `apps/web/src/app/(protected)/future-self/` route
- Delete `apps/web/src/components/future-self/` components
- Merge any useful visualisation elements into dashboard
- Remove navigation references

**21. LinkedIn Integration** (LOW)
- Delete `apps/web/src/app/api/auth/linkedin/route.ts`
- Delete `apps/web/src/app/api/integrations/linkedin/callback/route.ts`
- Remove from onboarding, settings, provider enums
- Migration to clean up LinkedIn data

---

## Phase 3: Personalisation Engine (Weeks 15–22)

### Additions

**22. N-of-1 Personalised Prediction Models** (CRITICAL)
- Server-side training pipeline: per-user model training on accumulated feature vectors
- Model architecture: lightweight gradient boosting or small neural net
- Trained model weights exported to ONNX, pushed to client for on-device inference
- Prediction targets: next-day mood, dimension trends, intervention responsiveness
- Retraining schedule: weekly with sufficient new data
- New migration for model_artifacts table

**23. Explainable AI (SHAP/LIME)** (HIGH)
- Server-side SHAP value computation for N-of-1 model predictions
- Cache explanations per prediction in Supabase
- Serve to existing `explainability-tooltip.tsx` component
- User-facing language: "Your sleep quality and exercise contributed most to today's prediction"

**24. Screen Time Digital Phenotyping** (MEDIUM)
- New connector for device screen time data (iOS Screen Time API / Android Digital Wellbeing)
- Behavioural features: total screen time, app category distribution, pickup frequency, session duration
- Pattern extraction: late-night usage, social media time, productivity app engagement
- Feed into N-of-1 model features and JITAI context

**25. Clinical Data Export for Therapist Integration** (HIGH)
- PDF export: PHQ-9/GAD-7 score trends, mood patterns, sleep quality, key correlations
- Structured data export: JSON/CSV with clinical metadata
- Clinical-grade audit trail: export events logged
- Shareable link with expiry for therapist access
- Privacy controls: user selects which data categories to include

**26. Music-Aware CBT Mood Regulation Module** (MEDIUM)
- Combine Spotify mood state with CBT technique library
- If low valence detected → suggest mood-lifting techniques with matching playlist
- Technique categories: cognitive restructuring, behavioural activation, mindfulness
- Effectiveness tracking: did mood improve after technique + music?

### Restructurings

**27. Journal: Linguistic Biomarker Detection** (MEDIUM)
- Extend journal analysis with NLP processing
- Detect: cognitive distortions (all-or-nothing, catastrophising, personalisation)
- Track: emotional word frequency, first-person pronoun ratio, syntactic complexity
- Trend analysis: linguistic markers over time as mental health indicators
- Surface gently in journal insights (not alarming, educational framing)

**28. Open Banking: Financial Stress Detection** (MEDIUM)
- Extend `apps/web/src/lib/integrations/banking.ts`
- Transaction pattern analysis: spending velocity, category shifts, unusual transactions
- Financial stress index: computed from spending patterns relative to personal baseline
- Feed into N-of-1 features and correlation engine
- Privacy: all computation on aggregated patterns, not individual transactions

---

## Phase 4: Scale & Privacy (Weeks 23–30)

### Addition

**29. Federated Privacy-Preserving Analytics** (MEDIUM)
- Local model training on device using `ai-local`
- Encrypted gradient upload to coordination server
- Differential privacy: calibrated noise injection (ε-differential privacy, target ε=1.0)
- Secure aggregation protocol: gradients combined without server seeing individual contributions
- New coordination service (Supabase edge function or standalone)
- Population-level insights dashboard consuming federated aggregates
- Opt-in: only users at "Full" opt-in tier contribute to federated pool

---

## Cross-Cutting Concerns

### Testing
- TDD throughout (Vitest unit/integration)
- Playwright E2E for critical paths: crisis de-escalation, clinical screening, data export
- ML model validation: train/test splits, accuracy thresholds, fairness checks

### Database
- Sequential migrations from 00027+
- Each feature gets its own migration
- Backward-compatible where possible

### Privacy & Compliance
- All new data collection behind opt-in tiers
- GDPR-compliant export/deletion
- Clinical data retention policies
- Audit logging for crisis and clinical pathways

### Documentation
- Update `ARCHITECTURE.md`, `DATA_MODEL.md`, `ML_AND_ANALYSIS_EXPLAINER.md` per phase
- New `CLINICAL_SAFETY.md` for crisis de-escalation protocols
