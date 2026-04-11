-- 00042: Security and data integrity fixes
-- Addresses overly permissive RLS INSERT policies, missing CHECK constraints,
-- and missing UNIQUE constraints across multiple tables.

-- ============================================================================
-- Fix 1: Drop overly permissive INSERT policies (HIGH priority)
-- These policies use WITH CHECK (true), which allows ANY authenticated user
-- to insert records for ANY user. The service role bypasses RLS entirely,
-- so these policies only serve to open a security hole.
-- ============================================================================

-- crisis_events: service-role-only inserts (no re-create needed)
DROP POLICY IF EXISTS "Service role inserts crisis events" ON crisis_events;

-- sleep_analysis: drop open policy, re-create with ownership check
DROP POLICY IF EXISTS "Service role inserts sleep analysis" ON sleep_analysis;
CREATE POLICY "Users can insert own sleep analysis"
  ON sleep_analysis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- jitai_decisions: service-role-only inserts (no re-create needed)
DROP POLICY IF EXISTS "Service role manages JITAI decisions" ON jitai_decisions;

-- hrv_metrics: drop open policy, re-create with ownership check
DROP POLICY IF EXISTS "Service role inserts HRV metrics" ON hrv_metrics;
CREATE POLICY "Users can insert own HRV metrics"
  ON hrv_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- screen_time_daily: drop open policy, re-create with ownership check
DROP POLICY IF EXISTS "Service role inserts screen time" ON screen_time_daily;
CREATE POLICY "Users can insert own screen time"
  ON screen_time_daily FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- journal_analysis: service-role-only inserts (no re-create needed)
DROP POLICY IF EXISTS "Service role inserts journal analysis" ON journal_analysis;

-- model_artifacts: service-role-only inserts (no re-create needed)
DROP POLICY IF EXISTS "Service role manages models" ON model_artifacts;

-- shap_explanations: service-role-only inserts (no re-create needed)
DROP POLICY IF EXISTS "Service role inserts SHAP explanations" ON shap_explanations;


-- ============================================================================
-- Fix 2: Fix federated_rounds overly permissive FOR ALL policy (HIGH priority)
-- The "Service role manages rounds" policy grants ALL operations (SELECT,
-- INSERT, UPDATE, DELETE) to any authenticated user. The service role bypasses
-- RLS, so this policy is unnecessary and dangerous. The existing SELECT-only
-- policy "Anyone can read round status" already covers read access.
-- ============================================================================

DROP POLICY IF EXISTS "Service role manages rounds" ON federated_rounds;
-- The existing "Anyone can read round status" SELECT policy remains.
-- INSERT/UPDATE/DELETE are now restricted to service role only (which bypasses RLS).


-- ============================================================================
-- Fix 3: Add CHECK constraints for data integrity (MEDIUM priority)
-- ============================================================================

-- clinical_screenings: constrain severity to valid values
ALTER TABLE clinical_screenings
  ADD CONSTRAINT clinical_screenings_severity_check
  CHECK (severity IN ('minimal', 'mild', 'moderate', 'moderately_severe', 'severe'));

-- jitai_decisions: constrain intervention_type to valid values
ALTER TABLE jitai_decisions
  ADD CONSTRAINT jitai_decisions_intervention_type_check
  CHECK (intervention_type IN ('nudge', 'checkin_prompt', 'breathing_exercise', 'activity_suggestion', 'none'));

-- jitai_decisions: constrain urgency to valid values
ALTER TABLE jitai_decisions
  ADD CONSTRAINT jitai_decisions_urgency_check
  CHECK (urgency IN ('low', 'medium', 'high'));


-- ============================================================================
-- Fix 4: Add UNIQUE constraints to prevent duplicate entries (LOW priority)
-- ============================================================================

-- shap_explanations: one explanation per user per day per dimension
ALTER TABLE shap_explanations
  ADD CONSTRAINT shap_explanations_unique_per_day
  UNIQUE (user_id, prediction_date, target_dimension);

-- federated_rounds: prevent duplicate round numbers
ALTER TABLE federated_rounds
  ADD CONSTRAINT federated_rounds_unique_number
  UNIQUE (round_number);
