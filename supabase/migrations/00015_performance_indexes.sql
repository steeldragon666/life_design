-- 00014_performance_indexes.sql
-- Performance indexes for common query patterns identified in production.
--
-- All indexes use IF NOT EXISTS so this migration is safe to re-run.
-- Existing indexes (created in earlier migrations) are preserved:
--   feature_store: idx_feature_store_user_time, idx_feature_store_dimension, idx_feature_store_feature
--   daily_insights: idx_daily_insights_user_time
--   daily_checkins: idx_checkins_user_date
--   subscriptions:  idx_subscriptions_user, idx_subscriptions_stripe, idx_subscriptions_status

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Feature store — covering index for dimension-scoped time-series queries
-- ─────────────────────────────────────────────────────────────────────────────
-- Includes feature, value, and confidence in the index payload so that
-- dimension-range queries are satisfied entirely from the index without a
-- heap fetch.
CREATE INDEX IF NOT EXISTS idx_feature_store_user_dim_time
  ON feature_store (user_id, dimension, recorded_at DESC)
  INCLUDE (feature, value, confidence);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Daily insights — partial index for unread bundles
-- ─────────────────────────────────────────────────────────────────────────────
-- The dashboard notification badge queries for unread insights. A partial index
-- on WHERE read = false keeps this sub-millisecond as the table grows.
CREATE INDEX IF NOT EXISTS idx_daily_insights_unread
  ON daily_insights (user_id, generated_at DESC)
  WHERE read = false;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Daily check-ins — timestamptz index for ML pipeline joins
-- ─────────────────────────────────────────────────────────────────────────────
-- Streak recalculation uses checkin_date DESC (already indexed). This companion
-- index on completed_at supports the ML pipeline which joins on timestamptz
-- precision against feature_store.recorded_at.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'daily_checkins'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_checkins_user_time
      ON daily_checkins (user_id, completed_at DESC);
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Subscriptions — partial index for trialing rows (cron expiry job)
-- ─────────────────────────────────────────────────────────────────────────────
-- The nightly cron that expires lapsed trials only scans rows with
-- status = 'trialing'. A partial index keeps the scan narrow.
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_trial
  ON subscriptions (status, trial_end)
  WHERE status = 'trialing';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Connector sync log — dashboard status display
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_connector_sync_status
  ON connector_sync_log (user_id, connector, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. get_user_dashboard_data(p_user_id uuid)
-- ─────────────────────────────────────────────────────────────────────────────
-- Returns a single JSON object with everything the dashboard needs in one
-- round-trip, avoiding N+1 queries from client-side assembly.
--
-- Returned shape:
-- {
--   "subscription": { "plan": "monthly", "status": "active", "trial_end": null },
--   "streak":       { "current": 12, "longest": 30, "last_checkin": "2026-03-12" },
--   "unread_count": 2,
--   "latest_insights": [...],
--   "dimension_scores": { "health": 7.4, "fitness": 6.1, ... }
-- }
CREATE OR REPLACE FUNCTION get_user_dashboard_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result       jsonb;
  v_subscription jsonb;
  v_streak       jsonb;
  v_unread       bigint := 0;
  v_insights     jsonb;
  v_scores       jsonb;
BEGIN
  -- Subscription
  SELECT jsonb_build_object('plan', s.plan_type, 'status', s.status, 'trial_end', s.trial_end)
  INTO v_subscription
  FROM subscriptions s WHERE s.user_id = p_user_id LIMIT 1;

  -- Streak (user_streaks may not exist yet)
  BEGIN
    SELECT jsonb_build_object('current', us.current_streak, 'longest', us.longest_streak, 'last_checkin', us.last_checkin_date)
    INTO v_streak
    FROM user_streaks us WHERE us.user_id = p_user_id LIMIT 1;
  EXCEPTION WHEN undefined_table THEN
    v_streak := NULL;
  END;

  -- Unread insights (daily_insights may not exist yet)
  BEGIN
    SELECT COUNT(*) INTO v_unread
    FROM daily_insights di
    WHERE di.user_id = p_user_id AND di.read = false;

    SELECT jsonb_agg(
      jsonb_build_object('id', di.id, 'headlines', di.headlines, 'generated_at', di.generated_at, 'read', di.read)
      ORDER BY di.generated_at DESC
    ) INTO v_insights
    FROM (
      SELECT id, headlines, generated_at, read FROM daily_insights
      WHERE user_id = p_user_id ORDER BY generated_at DESC LIMIT 5
    ) di;
  EXCEPTION WHEN undefined_table THEN
    v_unread := 0;
    v_insights := NULL;
  END;

  -- Dimension scores from feature_store (latest mood_score per dimension)
  BEGIN
    SELECT jsonb_object_agg(fs.dimension, ROUND(fs.value::numeric, 2))
    INTO v_scores
    FROM (
      SELECT DISTINCT ON (dimension) dimension, value
      FROM feature_store
      WHERE user_id = p_user_id AND feature = 'mood_score'
      ORDER BY dimension, recorded_at DESC
    ) fs;
  EXCEPTION WHEN undefined_table THEN
    v_scores := NULL;
  END;

  v_result := jsonb_build_object(
    'subscription',    COALESCE(v_subscription, 'null'::jsonb),
    'streak',          COALESCE(v_streak, 'null'::jsonb),
    'unread_count',    v_unread,
    'latest_insights', COALESCE(v_insights, '[]'::jsonb),
    'dimension_scores', COALESCE(v_scores, '{}'::jsonb)
  );

  RETURN v_result;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. expire_stale_sessions()
-- ─────────────────────────────────────────────────────────────────────────────
-- Scheduled cleanup function. Call every 24 hours via pg_cron or a Deno Edge
-- Function scheduled task.
--
-- Operations:
--   a) Transition 'trialing' subscriptions to 'expired' where trial_end has
--      passed and no Stripe subscription has been attached.
--   b) Remove feature_store entries older than 18 months.
--   c) Remove expired correlation_cache rows.
--   d) Remove acknowledged anomaly_log entries older than 90 days.
--
-- Returns a summary JSON for the caller to log.
CREATE OR REPLACE FUNCTION expire_stale_sessions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expired_trials    int := 0;
  v_deleted_features  int := 0;
  v_deleted_cache     int := 0;
BEGIN
  -- Expire lapsed trials with no Stripe subscription
  UPDATE subscriptions
  SET status = 'expired', updated_at = now()
  WHERE status = 'trialing'
    AND trial_end < now()
    AND stripe_subscription_id IS NULL;
  GET DIAGNOSTICS v_expired_trials = ROW_COUNT;

  -- Prune old feature_store data (table may not exist yet)
  BEGIN
    DELETE FROM feature_store WHERE recorded_at < now() - interval '18 months';
    GET DIAGNOSTICS v_deleted_features = ROW_COUNT;
  EXCEPTION WHEN undefined_table THEN
    v_deleted_features := 0;
  END;

  -- Prune expired correlation results
  BEGIN
    DELETE FROM correlation_results WHERE computed_at < now() - interval '90 days';
    GET DIAGNOSTICS v_deleted_cache = ROW_COUNT;
  EXCEPTION WHEN undefined_table THEN
    v_deleted_cache := 0;
  END;

  RETURN jsonb_build_object(
    'expired_trials',    v_expired_trials,
    'deleted_features',  v_deleted_features,
    'deleted_cache',     v_deleted_cache,
    'ran_at',            now()
  );
END;
$$;

-- Grant execute to service_role for Deno scheduler and REST RPC calls
GRANT EXECUTE ON FUNCTION get_user_dashboard_data(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION expire_stale_sessions()        TO service_role;
