import { describe, expect, it, vi } from 'vitest';
import {
  buildFallbackWeeklyDigest,
  buildFallbackWeeklyDigestWithAI,
  buildWeeklyDigestSeed,
  type WeeklyDigestCheckin,
  type WeeklyDigestGoal,
} from '@/lib/weekly-digest';

const baseGoals: WeeklyDigestGoal[] = [
  {
    id: 'goal-1',
    title: 'Ship weekly planning habit',
    horizon: 'short',
    status: 'active',
    target_date: '2026-03-20',
    goal_dimensions: [{ dimension: 'career' }],
  },
  {
    id: 'goal-2',
    title: 'Finish half marathon training block',
    horizon: 'medium',
    status: 'completed',
    target_date: '2026-03-10',
    goal_dimensions: [{ dimension: 'fitness' }],
  },
];

const baseCheckins: WeeklyDigestCheckin[] = [
  {
    id: 'c-1',
    date: '2026-03-06',
    mood: 5,
    duration_type: 'quick',
    dimension_scores: [
      { dimension: 'career', score: 5 },
      { dimension: 'fitness', score: 4 },
    ],
  },
  {
    id: 'c-2',
    date: '2026-03-07',
    mood: 6,
    duration_type: 'deep',
    dimension_scores: [
      { dimension: 'career', score: 6 },
      { dimension: 'fitness', score: 5 },
    ],
  },
  {
    id: 'c-3',
    date: '2026-03-08',
    mood: 7,
    duration_type: 'deep',
    dimension_scores: [
      { dimension: 'career', score: 7 },
      { dimension: 'fitness', score: 6 },
    ],
  },
  {
    id: 'c-4',
    date: '2026-03-09',
    mood: 8,
    duration_type: 'deep',
    dimension_scores: [
      { dimension: 'career', score: 8 },
      { dimension: 'fitness', score: 7 },
    ],
  },
  {
    id: 'c-5',
    date: '2026-03-10',
    mood: 8,
    duration_type: 'deep',
    dimension_scores: [
      { dimension: 'career', score: 8 },
      { dimension: 'fitness', score: 8 },
    ],
  },
  {
    id: 'c-6',
    date: '2026-03-11',
    mood: 9,
    duration_type: 'quick',
    dimension_scores: [
      { dimension: 'career', score: 9 },
      { dimension: 'fitness', score: 8 },
    ],
  },
  {
    id: 'c-7',
    date: '2026-03-12',
    mood: 9,
    duration_type: 'quick',
    dimension_scores: [
      { dimension: 'career', score: 9 },
      { dimension: 'fitness', score: 9 },
    ],
  },
];

describe('weekly digest utility', () => {
  it('aggregates streak trend, dominant dimensions, and progress highlights', () => {
    const seed = buildWeeklyDigestSeed({
      goals: baseGoals,
      checkins: baseCheckins,
      profile: { id: 'guest-user', name: 'Aaron' },
    });

    expect(seed.stats.totalCheckins).toBe(7);
    expect(seed.stats.currentStreak).toBeGreaterThanOrEqual(1);
    expect(seed.stats.streakTrend).toBe('up');
    expect(seed.insights.dominantDimensions.length).toBeGreaterThan(0);
    expect(seed.insights.dominantDimensions[0]).toContain('Career');
    expect(seed.insights.progressHighlights.some((item) => item.includes('completed'))).toBe(true);
  });

  it('builds deterministic fallback digest sections', () => {
    const seed = buildWeeklyDigestSeed({
      goals: baseGoals,
      checkins: baseCheckins,
      profile: { id: 'guest-user', name: 'Aaron' },
    });
    const digest = buildFallbackWeeklyDigest(seed);

    expect(digest.wins.length).toBeGreaterThan(0);
    expect(digest.patterns.length).toBeGreaterThan(0);
    expect(digest.focusNextWeek.length).toBeGreaterThan(0);
    expect(digest.mentorNote.length).toBeGreaterThan(0);
  });

  it('handles sparse history safely', () => {
    const seed = buildWeeklyDigestSeed({
      goals: [],
      checkins: [],
      profile: { id: 'guest-user' },
    });

    expect(seed.stats.totalCheckins).toBe(0);
    expect(seed.stats.currentStreak).toBe(0);
    expect(seed.insights.progressHighlights.length).toBeGreaterThan(0);
  });
});

describe('buildFallbackWeeklyDigestWithAI', () => {
  const seed = buildWeeklyDigestSeed({
    goals: baseGoals,
    checkins: baseCheckins,
    profile: { id: 'guest-user', name: 'Aaron' },
  });

  it('enriches mentorNote when summarization succeeds', async () => {
    const summarize = vi.fn(async () => 'focused on career growth');
    const result = await buildFallbackWeeklyDigestWithAI(
      seed,
      ['Worked on promotions', 'Led a team meeting'],
      summarize,
    );
    expect(result.mentorNote).toContain('focused on career growth');
    expect(summarize).toHaveBeenCalledTimes(1);
  });

  it('falls back to base mentorNote when summarization fails', async () => {
    const summarize = vi.fn(async () => { throw new Error('model error'); });
    const base = buildFallbackWeeklyDigest(seed);
    const result = await buildFallbackWeeklyDigestWithAI(
      seed,
      ['Some journal entry'],
      summarize,
    );
    expect(result.mentorNote).toBe(base.mentorNote);
  });

  it('returns base digest unchanged when journal entries are empty', async () => {
    const summarize = vi.fn(async () => 'should not be called');
    const base = buildFallbackWeeklyDigest(seed);
    const result = await buildFallbackWeeklyDigestWithAI(seed, [], summarize);
    expect(result.mentorNote).toBe(base.mentorNote);
    expect(summarize).not.toHaveBeenCalled();
  });
});
