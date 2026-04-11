-- 00024: Add card-level tracking to onboarding_sessions for the 8-card flow

ALTER TABLE onboarding_sessions
  ADD COLUMN current_card INTEGER NOT NULL DEFAULT 1
    CHECK (current_card BETWEEN 1 AND 9);

ALTER TABLE onboarding_sessions
  ADD COLUMN first_checkin_completed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE onboarding_sessions
  ADD COLUMN first_streak_created BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE onboarding_sessions
  ADD COLUMN first_goal_created BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE onboarding_sessions
  ADD COLUMN apps_connected TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN onboarding_sessions.current_card IS 'Which of the 8 onboarding cards the user is currently on';
