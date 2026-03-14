-- supabase/seed.sql
-- Development seed data for the Life Design app.
--
-- Creates 3 test users and populates synthetic data for local development and
-- staging environments. Do NOT run against production.
--
-- Test users:
--   trial@lifedesign.dev    — active 7-day trial (3 days used)
--   active@lifedesign.dev   — paying monthly subscriber with 90 days of data
--   expired@lifedesign.dev  — trial expired, no payment method
--
-- Run with:
--   supabase db reset                                   (wipe + re-seed)
--   psql $DATABASE_URL -f supabase/seed.sql             (manual apply)

-- ─────────────────────────────────────────────────────────────────────────────
-- Preset AI Mentors (retained from original seed)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO mentors (name, type, description, system_prompt) VALUES
(
  'The Stoic',
  'stoic',
  'Ancient wisdom for modern challenges. Draws from Marcus Aurelius, Seneca, and Epictetus to help you find clarity and resilience.',
  'You are The Stoic, an AI mentor inspired by Stoic philosophy. Draw from Marcus Aurelius, Seneca, and Epictetus. Help users find clarity through rational analysis, acceptance of what they cannot control, and focus on virtue and character development. Be thoughtful and measured, using relevant Stoic quotes when appropriate. Keep responses concise and actionable.'
),
(
  'The Coach',
  'coach',
  'Your energetic accountability partner. Focuses on goal-setting, habit formation, and celebrating progress.',
  'You are The Coach, an energetic and supportive AI mentor. Focus on practical goal-setting, habit formation, and accountability. Celebrate wins, help break down big goals into actionable steps, and provide motivational support. Use a warm, encouraging tone. Ask powerful questions that help users discover their own solutions. Keep responses action-oriented.'
),
(
  'The Scientist',
  'scientist',
  'Evidence-based guidance grounded in psychology research. Leverages CBT, positive psychology, and behavioral science.',
  'You are The Scientist, an AI mentor grounded in evidence-based psychology. Draw from cognitive behavioral therapy (CBT), positive psychology, and behavioral science research. Help users understand the science behind their habits, emotions, and decisions. Cite relevant research when helpful. Suggest evidence-based techniques and experiments. Be precise and analytical while remaining warm and approachable.'
)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- Development test users and synthetic data
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

DO $$
DECLARE
  -- Deterministic UUIDs — stable across resets so foreign-key references
  -- in other seed tables remain consistent.
  v_trial_id   uuid := 'aaaaaaaa-0001-0001-0001-000000000001';
  v_active_id  uuid := 'bbbbbbbb-0002-0002-0002-000000000002';
  v_expired_id uuid := 'cccccccc-0003-0003-0003-000000000003';

  v_day       int;
  v_date      date;
  v_dims      text[] := ARRAY['career','finance','health','fitness','family','social','romance','growth'];
  v_dim       text;
  v_mood      float8;
  v_steps     float8;
  v_hrv       float8;
  v_sentiment float8;
BEGIN

  -- ─────────────────────────────────────────────────────────────────────────
  -- 1. auth.users
  -- ─────────────────────────────────────────────────────────────────────────

  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data
  )
  VALUES
    (
      v_trial_id,
      'trial@lifedesign.dev',
      crypt('Password123!', gen_salt('bf')),
      now(),
      now() - interval '3 days',
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Trial User","onboarded":true}'::jsonb
    ),
    (
      v_active_id,
      'active@lifedesign.dev',
      crypt('Password123!', gen_salt('bf')),
      now(),
      now() - interval '95 days',
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Active Subscriber","onboarded":true}'::jsonb
    ),
    (
      v_expired_id,
      'expired@lifedesign.dev',
      crypt('Password123!', gen_salt('bf')),
      now(),
      now() - interval '14 days',
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Expired User","onboarded":false}'::jsonb
    )
  ON CONFLICT (id) DO NOTHING;

  -- ─────────────────────────────────────────────────────────────────────────
  -- 2. Profiles
  -- ─────────────────────────────────────────────────────────────────────────

  -- profiles PK is 'id' (references auth.users), with 'onboarded' from 00002
  INSERT INTO profiles (id, email, onboarded, created_at, updated_at)
  VALUES
    (v_trial_id,   'trial@lifedesign.dev',   true,  now() - interval '3 days',  now()),
    (v_active_id,  'active@lifedesign.dev',  true,  now() - interval '95 days', now()),
    (v_expired_id, 'expired@lifedesign.dev', false, now() - interval '14 days', now())
  ON CONFLICT (id) DO NOTHING;

  -- ─────────────────────────────────────────────────────────────────────────
  -- 3. Subscriptions
  -- ─────────────────────────────────────────────────────────────────────────
  -- Remove rows auto-inserted by the handle_new_user trigger so we can set
  -- each test scenario to an exact known state.

  DELETE FROM subscriptions WHERE user_id IN (v_trial_id, v_active_id, v_expired_id);

  INSERT INTO subscriptions (
    id, user_id, plan_type, status,
    trial_start, trial_end,
    current_period_start, current_period_end,
    created_at, updated_at
  )
  VALUES
    (
      gen_random_uuid(), v_trial_id, 'trial', 'trialing',
      now() - interval '3 days', now() + interval '4 days',
      NULL, NULL,
      now() - interval '3 days', now()
    ),
    (
      gen_random_uuid(), v_active_id, 'monthly', 'active',
      now() - interval '95 days', now() - interval '88 days',
      now() - interval '30 days', now() + interval '1 day',
      now() - interval '95 days', now()
    ),
    (
      gen_random_uuid(), v_expired_id, 'trial', 'expired',
      now() - interval '14 days', now() - interval '7 days',
      NULL, NULL,
      now() - interval '14 days', now()
    );

  -- ─────────────────────────────────────────────────────────────────────────
  -- 4. Entitlements
  -- ─────────────────────────────────────────────────────────────────────────
  -- The canonical entitlement set lives in 00009_subscriptions.sql.
  -- This is a no-op if that migration has already been applied, but ensures
  -- the seed is self-contained for a clean local environment.

  INSERT INTO entitlements (plan, feature, enabled) VALUES
    ('trial',    'basic_checkin',  true),
    ('trial',    'insights',       true),
    ('trial',    'correlations',   true),
    ('trial',    'forecasts',      true),
    ('trial',    'mentor_chat',    true),
    ('monthly',  'basic_checkin',  true),
    ('monthly',  'insights',       true),
    ('monthly',  'correlations',   true),
    ('monthly',  'forecasts',      true),
    ('monthly',  'mentor_chat',    true),
    ('annual',   'basic_checkin',  true),
    ('annual',   'insights',       true),
    ('annual',   'correlations',   true),
    ('annual',   'forecasts',      true),
    ('annual',   'mentor_chat',    true),
    ('lifetime', 'basic_checkin',  true),
    ('lifetime', 'insights',       true),
    ('lifetime', 'correlations',   true),
    ('lifetime', 'forecasts',      true),
    ('lifetime', 'mentor_chat',    true),
    ('churned',  'basic_checkin',  true),
    ('churned',  'insights',       false),
    ('churned',  'correlations',   false),
    ('churned',  'forecasts',      false),
    ('churned',  'mentor_chat',    false)
  ON CONFLICT (plan, feature) DO NOTHING;

  -- ─────────────────────────────────────────────────────────────────────────
  -- 5. User streaks (table created by a later migration; skip if absent)
  -- ─────────────────────────────────────────────────────────────────────────

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_streaks') THEN
    INSERT INTO user_streaks (
      user_id, current_streak, longest_streak,
      last_checkin_date, total_checkins,
      streak_freeze_available, streak_freeze_used_week,
      week_start_date, updated_at
    )
    VALUES
      (v_trial_id,   3,  3,  current_date - 1, 3,  true, false, date_trunc('week', current_date)::date, now()),
      (v_active_id,  62, 62, current_date - 1, 88, true, false, date_trunc('week', current_date)::date, now()),
      (v_expired_id, 0,  4,  current_date - 9, 5,  true, false, date_trunc('week', current_date)::date, now())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- 6. 90 days of synthetic feature_store data (active subscriber only)
  --    Table created by a later migration; skip if absent.
  -- ─────────────────────────────────────────────────────────────────────────

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'feature_store') THEN
    RAISE NOTICE 'Skipping feature_store seed — table does not exist yet.';
  ELSE
  FOR v_day IN 1..90 LOOP
    v_date      := current_date - (90 - v_day);
    v_mood      := GREATEST(1.0, LEAST(10.0, 4.5 + (v_day::float8 / 90.0) * 3.0 + (random() * 2.0 - 1.0)));
    v_steps     := GREATEST(0.0, 6000 + (v_day::float8 / 90.0) * 4000 + (random() * 2000 - 1000));
    v_hrv       := GREATEST(10.0, LEAST(100.0, 35 + (v_day::float8 / 90.0) * 20 + (random() * 10 - 5)));
    v_sentiment := GREATEST(-1.0, LEAST(1.0, 0.2 + (v_day::float8 / 90.0) * 0.5 + (random() * 0.2 - 0.1)));

    FOREACH v_dim IN ARRAY v_dims LOOP
      INSERT INTO feature_store (user_id, dimension, feature, value, recorded_at, source, confidence)
      VALUES (v_active_id, v_dim, 'mood_score', v_mood + (random() * 0.5 - 0.25),
              v_date::timestamptz + interval '8 hours', 'mood_slider', 0.95)
      ON CONFLICT (user_id, feature, recorded_at) DO NOTHING;

      INSERT INTO feature_store (user_id, dimension, feature, value, recorded_at, source, confidence)
      VALUES (v_active_id, v_dim, 'sentiment_score', v_sentiment + (random() * 0.1 - 0.05),
              v_date::timestamptz + interval '8 hours 1 minute', 'checkin_text', 0.85)
      ON CONFLICT (user_id, feature, recorded_at) DO NOTHING;
    END LOOP;

    -- Apple Health features
    INSERT INTO feature_store (user_id, dimension, feature, value, recorded_at, source, confidence)
    VALUES (v_active_id, 'health', 'steps', v_steps,
            v_date::timestamptz + interval '23 hours', 'apple_health', 1.0)
    ON CONFLICT (user_id, feature, recorded_at) DO NOTHING;

    INSERT INTO feature_store (user_id, dimension, feature, value, recorded_at, source, confidence)
    VALUES (v_active_id, 'health', 'hrv_ms', v_hrv,
            v_date::timestamptz + interval '6 hours', 'apple_health', 0.9)
    ON CONFLICT (user_id, feature, recorded_at) DO NOTHING;

    INSERT INTO feature_store (user_id, dimension, feature, value, recorded_at, source, confidence)
    VALUES (v_active_id, 'health', 'sleep_hours',
            GREATEST(4.0, LEAST(10.0, 6.5 + (v_day::float8 / 90.0) * 1.0 + (random() * 1.0 - 0.5))),
            v_date::timestamptz + interval '7 hours', 'apple_health', 0.95)
    ON CONFLICT (user_id, feature, recorded_at) DO NOTHING;

    -- Fitness
    INSERT INTO feature_store (user_id, dimension, feature, value, recorded_at, source, confidence)
    VALUES (v_active_id, 'fitness', 'resting_hr',
            GREATEST(45.0, LEAST(90.0, 65.0 - (v_day::float8 / 90.0) * 5.0 + (random() * 4.0 - 2.0))),
            v_date::timestamptz + interval '7 hours 30 minutes', 'apple_health', 1.0)
    ON CONFLICT (user_id, feature, recorded_at) DO NOTHING;

    -- Finance
    INSERT INTO feature_store (user_id, dimension, feature, value, recorded_at, source, confidence)
    VALUES (v_active_id, 'finance', 'savings_rate',
            GREATEST(0.0, LEAST(1.0, 0.10 + (v_day::float8 / 90.0) * 0.10 + (random() * 0.04 - 0.02))),
            v_date::timestamptz + interval '12 hours', 'finance_entry', 0.8)
    ON CONFLICT (user_id, feature, recorded_at) DO NOTHING;
  END LOOP;
  END IF; -- feature_store exists

  -- ─────────────────────────────────────────────────────────────────────────
  -- 7. Sample daily check-ins (table created by a later migration; skip if absent)
  -- ─────────────────────────────────────────────────────────────────────────

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_checkins') THEN
    RAISE NOTICE 'Skipping daily_checkins seed — table does not exist yet.';
  ELSE
  FOR v_day IN 1..5 LOOP
    v_date := current_date - (5 - v_day);

    INSERT INTO daily_checkins (
      id, user_id, checkin_date, completed_at, mode,
      mood_score, energy_level, dimension_scores,
      journal_entry, streak_count, processing_status
    )
    VALUES (
      gen_random_uuid(), v_active_id, v_date,
      v_date::timestamptz + interval '8 hours',
      CASE WHEN v_day = 5 THEN 'deep' ELSE 'standard' END,
      (6 + v_day)::smallint,
      (5 + v_day)::smallint,
      jsonb_build_object(
        'health',  7.0 + v_day * 0.2, 'fitness', 6.0 + v_day * 0.3,
        'career',  7.0,               'finance', 6.0,
        'family',  8.0,               'social',  7.0,
        'romance', 6.0,               'growth',  7.0 + v_day * 0.1
      ),
      CASE WHEN v_day = 5
        THEN 'Feeling strong momentum across all dimensions today. The sleep improvements are really showing up in my workouts.'
        ELSE NULL
      END,
      60 + v_day, 'complete'
    )
    ON CONFLICT (user_id, checkin_date) DO NOTHING;
  END LOOP;
  END IF; -- daily_checkins exists

  -- ─────────────────────────────────────────────────────────────────────────
  -- 8. Sample daily insights (table created by a later migration; skip if absent)
  -- ─────────────────────────────────────────────────────────────────────────

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_insights') THEN
    RAISE NOTICE 'Skipping daily_insights seed — table does not exist yet.';
  ELSE
  FOR v_day IN 1..5 LOOP
    v_date := current_date - (5 - v_day);

    INSERT INTO daily_insights (id, user_id, generated_at, bundle, headlines, read)
    VALUES (
      gen_random_uuid(), v_active_id,
      v_date::timestamptz + interval '9 hours',
      jsonb_build_object(
        'correlations', jsonb_build_array(
          jsonb_build_object('feature_a', 'hrv_ms', 'feature_b', 'mood_score',
            'coefficient', 0.70 + v_day * 0.01, 'p_value', 0.003, 'effect_size', 'large'),
          jsonb_build_object('feature_a', 'steps', 'feature_b', 'sentiment_score',
            'coefficient', 0.58, 'p_value', 0.01, 'effect_size', 'medium')
        ),
        'recommendations', jsonb_build_array(
          'Your HRV is trending up — consider adding a recovery session today.',
          'Morning walks are associated with improved sentiment scores in your data.'
        )
      ),
      ARRAY[
        'Your HRV is up 12% this week — your nervous system is recovering well.',
        'Days with 8000+ steps are associated with a +1.4pt mood boost in your data.',
        'Sleep quality is your strongest predictor of next-day energy.'
      ],
      v_day < 4   -- older insights are read; latest two remain unread
    )
    ON CONFLICT (user_id, (generated_at::date)) DO NOTHING;
  END LOOP;
  END IF; -- daily_insights exists

  -- ─────────────────────────────────────────────────────────────────────────
  -- 9. User progress (table created by a later migration; skip if absent)
  -- ─────────────────────────────────────────────────────────────────────────

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_progress') THEN
    INSERT INTO user_progress (
      user_id, level, total_xp, current_streak, longest_streak,
      total_checkins, deep_checkins, voice_entries,
      sources_connected, goals_completed, updated_at
    )
    VALUES
      (v_trial_id,   1,    150,  3,  3,  3,  0, 0, 1, 0, now()),
      (v_active_id,  12,  9450, 62, 62, 88, 12, 8, 4, 5, now()),
      (v_expired_id, 1,    200,  0,  4,  5,  0, 0, 0, 0, now())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

END $$;

COMMIT;
