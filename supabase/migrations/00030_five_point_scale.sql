-- Migrate ALL mood values from 1-10 scale to 1-5 scale
-- Formula: ROUND(old_score / 2.0), clamped to [1,5]
-- 1-2 -> 1, 3-4 -> 2, 5-6 -> 3, 7-8 -> 4, 9-10 -> 5

UPDATE check_ins
SET mood = LEAST(5, GREATEST(1, ROUND(mood::numeric / 2.0)))
WHERE mood IS NOT NULL;
