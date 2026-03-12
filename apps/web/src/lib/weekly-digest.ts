import { computeStreak, computeTrend, DIMENSION_LABELS, type Dimension } from '@life-design/core';

type GoalStatus = 'active' | 'completed' | 'paused' | 'abandoned';
type GoalHorizon = 'short' | 'medium' | 'long';
type DurationType = 'quick' | 'deep';
type StreakTrend = 'up' | 'down' | 'stable';

export interface WeeklyDigestProfile {
  id: string;
  name?: string;
  profession?: string;
  interests?: string[];
}

export interface WeeklyDigestGoal {
  id: string;
  title: string;
  horizon: GoalHorizon;
  description?: string;
  status: GoalStatus;
  target_date: string;
  goal_dimensions?: Array<{ dimension: string }>;
}

export interface WeeklyDigestCheckin {
  id: string;
  date: string;
  mood: number;
  duration_type: DurationType;
  journal_entry?: string;
  dimension_scores: Array<{ dimension: string; score: number }>;
}

export interface WeeklyDigestSeedInput {
  profile?: WeeklyDigestProfile | null;
  goals?: WeeklyDigestGoal[] | null;
  checkins?: WeeklyDigestCheckin[] | null;
}

export interface WeeklyDigestStats {
  referenceDate: string;
  totalCheckins: number;
  checkinsLast7Days: number;
  currentStreak: number;
  previousStreak: number;
  streakTrend: StreakTrend;
  avgMoodLast7Days: number | null;
  avgMoodPrevious7Days: number | null;
  moodTrendSlope: number;
  activeGoals: number;
  completedGoals: number;
}

export interface WeeklyDigestInsights {
  dominantDimensions: string[];
  risingDimensions: string[];
  progressHighlights: string[];
}

export interface WeeklyDigestSeed {
  stats: WeeklyDigestStats;
  insights: WeeklyDigestInsights;
}

export interface WeeklyDigestSections {
  wins: string[];
  patterns: string[];
  focusNextWeek: string[];
  mentorNote: string;
}

const DIGEST_WINDOW_DAYS = 7;
const MILLISECONDS_IN_DAY = 86_400_000;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toDateKey(value: string): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const parsed = new Date(`${normalized}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return normalized;
}

function addDays(dateKey: string, offset: number): string {
  const parsed = new Date(`${dateKey}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + offset);
  return parsed.toISOString().slice(0, 10);
}

function clampScore(value: number): number {
  return Math.min(10, Math.max(1, value));
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  const total = values.reduce((sum, current) => sum + current, 0);
  return total / values.length;
}

function averageByDimension(checkins: WeeklyDigestCheckin[]): Array<{ dimension: string; average: number }> {
  const sums = new Map<string, { total: number; count: number }>();
  for (const checkin of checkins) {
    for (const score of checkin.dimension_scores) {
      if (!score?.dimension) continue;
      const key = String(score.dimension).trim().toLowerCase();
      if (!key) continue;
      const current = sums.get(key) ?? { total: 0, count: 0 };
      current.total += clampScore(Number(score.score));
      current.count += 1;
      sums.set(key, current);
    }
  }

  return Array.from(sums.entries())
    .map(([dimension, value]) => ({ dimension, average: value.total / value.count }))
    .sort((a, b) => b.average - a.average);
}

function prettifyDimensionLabel(dimension: string): string {
  return DIMENSION_LABELS[dimension as Dimension] ?? `${dimension.slice(0, 1).toUpperCase()}${dimension.slice(1)}`;
}

function getWeekBuckets(checkins: WeeklyDigestCheckin[], referenceDate: string) {
  const currentWeekStart = addDays(referenceDate, -(DIGEST_WINDOW_DAYS - 1));
  const previousWeekEnd = addDays(currentWeekStart, -1);
  const previousWeekStart = addDays(previousWeekEnd, -(DIGEST_WINDOW_DAYS - 1));

  const currentWeek = checkins.filter((checkin) => checkin.date >= currentWeekStart && checkin.date <= referenceDate);
  const previousWeek = checkins.filter((checkin) => checkin.date >= previousWeekStart && checkin.date <= previousWeekEnd);

  return {
    currentWeek,
    previousWeek,
    currentWeekStart,
    previousWeekStart,
  };
}

function normalizeCheckins(checkins: WeeklyDigestCheckin[] | null | undefined): WeeklyDigestCheckin[] {
  if (!Array.isArray(checkins)) return [];

  const valid: WeeklyDigestCheckin[] = [];
  for (const checkin of checkins) {
    const date = toDateKey(checkin?.date ?? '');
    if (!date) continue;

    valid.push({
      id: String(checkin.id ?? `checkin-${date}`),
      date,
      mood: clampScore(Number(checkin.mood)),
      duration_type: checkin.duration_type === 'deep' ? 'deep' : 'quick',
      journal_entry: typeof checkin.journal_entry === 'string' ? checkin.journal_entry : undefined,
      dimension_scores: Array.isArray(checkin.dimension_scores)
        ? checkin.dimension_scores
            .filter((score) => isObject(score) && typeof score.dimension === 'string')
            .map((score) => ({
              dimension: String(score.dimension).trim().toLowerCase(),
              score: clampScore(Number(score.score)),
            }))
        : [],
    });
  }

  valid.sort((a, b) => a.date.localeCompare(b.date));

  const byDate = new Map<string, WeeklyDigestCheckin>();
  for (const checkin of valid) {
    byDate.set(checkin.date, checkin);
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function normalizeGoals(goals: WeeklyDigestGoal[] | null | undefined): WeeklyDigestGoal[] {
  if (!Array.isArray(goals)) return [];
  return goals
    .filter((goal) => isObject(goal) && typeof goal.title === 'string')
    .map((goal) => {
      const targetDate = toDateKey(String(goal.target_date ?? '')) ?? new Date().toISOString().slice(0, 10);
      return {
        id: String(goal.id ?? `goal-${targetDate}`),
        title: goal.title.trim(),
        horizon: goal.horizon === 'long' ? 'long' : goal.horizon === 'medium' ? 'medium' : 'short',
        description: typeof goal.description === 'string' ? goal.description : undefined,
        status:
          goal.status === 'completed' || goal.status === 'paused' || goal.status === 'abandoned'
            ? goal.status
            : 'active',
        target_date: targetDate,
        goal_dimensions: Array.isArray(goal.goal_dimensions)
          ? goal.goal_dimensions
              .filter((item) => isObject(item) && typeof item.dimension === 'string')
              .map((item) => ({ dimension: String(item.dimension).trim().toLowerCase() }))
          : [],
      } satisfies WeeklyDigestGoal;
    });
}

function toTrendLabel(current: number, previous: number): StreakTrend {
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'stable';
}

function formatMoodDelta(current: number | null, previous: number | null): string {
  if (current == null || previous == null) return 'Mood baseline established this week.';
  const delta = current - previous;
  if (Math.abs(delta) < 0.25) return 'Mood held steady compared with last week.';
  if (delta > 0) return `Mood rose by ${delta.toFixed(1)} points week-over-week.`;
  return `Mood softened by ${Math.abs(delta).toFixed(1)} points week-over-week.`;
}

export function buildWeeklyDigestSeed(input: WeeklyDigestSeedInput): WeeklyDigestSeed {
  const normalizedCheckins = normalizeCheckins(input.checkins);
  const normalizedGoals = normalizeGoals(input.goals);

  const referenceDate =
    normalizedCheckins[normalizedCheckins.length - 1]?.date ??
    new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  const { currentWeek, previousWeek } = getWeekBuckets(normalizedCheckins, referenceDate);

  const checkinDates = normalizedCheckins.map((checkin) => checkin.date);
  const currentStreak = computeStreak(checkinDates, referenceDate);
  const previousReferenceDate = addDays(referenceDate, -DIGEST_WINDOW_DAYS);
  const previousStreak = computeStreak(checkinDates, previousReferenceDate);
  const streakTrend = toTrendLabel(currentStreak, previousStreak);

  const avgMoodLast7Days = average(currentWeek.map((checkin) => checkin.mood));
  const avgMoodPrevious7Days = average(previousWeek.map((checkin) => checkin.mood));
  const moodTrendSlope = computeTrend(currentWeek.map((checkin) => checkin.mood));

  const activeGoals = normalizedGoals.filter((goal) => goal.status === 'active').length;
  const completedGoals = normalizedGoals.filter((goal) => goal.status === 'completed').length;

  const dominant = averageByDimension(currentWeek).slice(0, 3);
  const previousByDimension = averageByDimension(previousWeek);
  const previousMap = new Map(previousByDimension.map((entry) => [entry.dimension, entry.average]));
  const risingDimensions = dominant
    .map((entry) => ({
      ...entry,
      previous: previousMap.get(entry.dimension),
      delta: entry.average - (previousMap.get(entry.dimension) ?? entry.average),
    }))
    .filter((entry) => entry.delta >= 0.5)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 2);

  const progressHighlights: string[] = [];
  if (currentStreak > 0) {
    progressHighlights.push(`You sustained a ${currentStreak}-day check-in streak.`);
  }
  if (completedGoals > 0) {
    progressHighlights.push(`You completed ${completedGoals} goal${completedGoals === 1 ? '' : 's'} this cycle.`);
  }
  if (activeGoals > 0) {
    progressHighlights.push(`${activeGoals} active goal${activeGoals === 1 ? '' : 's'} are currently in motion.`);
  }
  if (progressHighlights.length === 0) {
    progressHighlights.push('You captured fresh signal this week. Keep logging small wins.');
  }
  progressHighlights.push(formatMoodDelta(avgMoodLast7Days, avgMoodPrevious7Days));

  const stats: WeeklyDigestStats = {
    referenceDate,
    totalCheckins: normalizedCheckins.length,
    checkinsLast7Days: currentWeek.length,
    currentStreak,
    previousStreak,
    streakTrend,
    avgMoodLast7Days,
    avgMoodPrevious7Days,
    moodTrendSlope,
    activeGoals,
    completedGoals,
  };

  const insights: WeeklyDigestInsights = {
    dominantDimensions: dominant.map(
      (entry) => `${prettifyDimensionLabel(entry.dimension)} (${entry.average.toFixed(1)}/10)`
    ),
    risingDimensions: risingDimensions.map(
      (entry) =>
        `${prettifyDimensionLabel(entry.dimension)} improved by ${entry.delta.toFixed(1)} points (${entry.average.toFixed(
          1
        )}/10)`
    ),
    progressHighlights,
  };

  return { stats, insights };
}

export function buildFallbackWeeklyDigest(seed: WeeklyDigestSeed): WeeklyDigestSections {
  const wins = [
    ...seed.insights.progressHighlights.slice(0, 2),
    seed.stats.checkinsLast7Days > 0
      ? `You logged ${seed.stats.checkinsLast7Days} check-in${seed.stats.checkinsLast7Days === 1 ? '' : 's'} in the last 7 days.`
      : 'You now have a clean slate to restart your weekly rhythm.',
  ];

  const patterns = [
    seed.insights.dominantDimensions.length
      ? `Dominant dimensions this week: ${seed.insights.dominantDimensions.join(', ')}.`
      : 'Not enough dimension data yet to identify dominant patterns.',
    seed.stats.streakTrend === 'up'
      ? 'Your consistency trend is improving versus the prior week.'
      : seed.stats.streakTrend === 'down'
        ? 'Consistency slipped versus last week, so anchor one daily check-in cue.'
        : 'Consistency is stable week-over-week.',
    ...seed.insights.risingDimensions.slice(0, 1),
  ].filter(Boolean);

  const focusNextWeek = [
    seed.stats.activeGoals > 0
      ? 'Advance one active goal with a single, calendar-blocked next action.'
      : 'Create one short-horizon goal to channel this week into clear action.',
    seed.stats.checkinsLast7Days >= 4
      ? 'Protect momentum by keeping your check-in cadence at 4+ entries.'
      : 'Set a minimum of 3 check-ins to rebuild a dependable rhythm.',
    'End each check-in with one sentence naming your top priority for tomorrow.',
  ];

  const mentorNote = `You are building signal, not chasing perfection. Keep your next week simple: protect consistency, choose one meaningful action, and let momentum compound.`;

  return { wins, patterns, focusNextWeek, mentorNote };
}

export function buildWeeklyDigestPrompt(seed: WeeklyDigestSeed, profileName?: string): string {
  const moodNow = seed.stats.avgMoodLast7Days == null ? 'n/a' : seed.stats.avgMoodLast7Days.toFixed(1);
  const moodPrev = seed.stats.avgMoodPrevious7Days == null ? 'n/a' : seed.stats.avgMoodPrevious7Days.toFixed(1);

  return `Generate a weekly life-design digest. Keep language practical, warm, and concise.

User: ${profileName || 'Guest user'}
Stats:
- Reference date: ${seed.stats.referenceDate}
- Total check-ins: ${seed.stats.totalCheckins}
- Check-ins (last 7 days): ${seed.stats.checkinsLast7Days}
- Current streak: ${seed.stats.currentStreak}
- Previous streak: ${seed.stats.previousStreak}
- Streak trend: ${seed.stats.streakTrend}
- Avg mood (last 7): ${moodNow}
- Avg mood (previous 7): ${moodPrev}
- Mood trend slope: ${seed.stats.moodTrendSlope.toFixed(2)}
- Active goals: ${seed.stats.activeGoals}
- Completed goals: ${seed.stats.completedGoals}

Computed insights:
- Dominant dimensions: ${seed.insights.dominantDimensions.join(', ') || 'n/a'}
- Rising dimensions: ${seed.insights.risingDimensions.join(', ') || 'n/a'}
- Progress highlights: ${seed.insights.progressHighlights.join(' | ')}

Return STRICT JSON only with this schema:
{
  "wins": ["string", "string", "string"],
  "patterns": ["string", "string", "string"],
  "focusNextWeek": ["string", "string", "string"],
  "mentorNote": "string"
}

Rules:
- Each bullet <= 140 characters.
- No markdown, no code fences, no extra keys.
- Mention at least one specific metric from the stats.
- Keep tone non-judgmental and actionable.`;
}

export function parseDigestSectionsFromText(rawText: string): WeeklyDigestSections | null {
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    if (!isObject(parsed)) return null;

    const wins = Array.isArray(parsed.wins)
      ? parsed.wins.filter((item): item is string => typeof item === 'string').slice(0, 5)
      : [];
    const patterns = Array.isArray(parsed.patterns)
      ? parsed.patterns.filter((item): item is string => typeof item === 'string').slice(0, 5)
      : [];
    const focusNextWeek = Array.isArray(parsed.focusNextWeek)
      ? parsed.focusNextWeek.filter((item): item is string => typeof item === 'string').slice(0, 5)
      : [];
    const mentorNote = typeof parsed.mentorNote === 'string' ? parsed.mentorNote : '';

    if (!wins.length || !patterns.length || !focusNextWeek.length || !mentorNote.trim()) {
      return null;
    }

    return {
      wins: wins.map((item) => item.trim()).filter(Boolean),
      patterns: patterns.map((item) => item.trim()).filter(Boolean),
      focusNextWeek: focusNextWeek.map((item) => item.trim()).filter(Boolean),
      mentorNote: mentorNote.trim(),
    };
  } catch {
    return null;
  }
}

export function estimateDaysSinceReference(referenceDate: string): number {
  const now = new Date();
  const ref = new Date(`${referenceDate}T12:00:00Z`);
  const diff = now.getTime() - ref.getTime();
  return Math.max(0, Math.floor(diff / MILLISECONDS_IN_DAY));
}
