-- Remove volume-based gamification badges
-- Research shows quantity-based gamification undermines intrinsic motivation.
-- Removes: ten-checkins, fifty-checkins, hundred-checkins, journal-twenty
-- Keeps: quality/milestone badges (first-checkin, streaks, all-dimensions, journal-five, high-mood)

DELETE FROM badges
WHERE badge_id IN ('ten-checkins', 'fifty-checkins', 'hundred-checkins', 'journal-twenty');
