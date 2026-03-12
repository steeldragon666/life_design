import type { MentorArchetype } from '@/lib/mentor-archetypes';
import type { MicroMomentsCadence, MicroMomentsPreferences } from '@/lib/guest-context';

type ProfileInput = {
  id?: string;
  name?: string;
  profession?: string;
  interests?: string[];
};

type GoalInput = {
  id: string;
  title: string;
  status: 'active' | 'completed' | 'paused';
  target_date: string;
};

type CheckinInput = {
  date: string;
  mood: number;
};

export type MicroMomentWindow = 'morning' | 'midday' | 'evening';

export interface MicroMomentNudge {
  id: string;
  window: MicroMomentWindow;
  title: string;
  body: string;
  actionLabel: string;
  scheduledForIso: string;
  cadence: MicroMomentsCadence;
}

export interface MicroMomentInput {
  now?: Date;
  profile: ProfileInput | null;
  goals: GoalInput[];
  checkins: CheckinInput[];
  mentorArchetype: MentorArchetype;
  preferences: MicroMomentsPreferences;
}

const WINDOW_HOURS: Record<MicroMomentWindow, number> = {
  morning: 8,
  midday: 13,
  evening: 19,
};

const CADENCE_WINDOWS: Record<MicroMomentsCadence, MicroMomentWindow[]> = {
  light: ['morning', 'evening'],
  balanced: ['morning', 'midday', 'evening'],
  focused: ['morning', 'midday', 'evening'],
};

function getWindowForTime(date: Date): MicroMomentWindow {
  const hour = date.getHours();
  if (hour < 11) return 'morning';
  if (hour < 17) return 'midday';
  return 'evening';
}

function getWindowTimestamp(baseDate: Date, window: MicroMomentWindow): Date {
  const at = new Date(baseDate);
  at.setHours(WINDOW_HOURS[window], 0, 0, 0);
  return at;
}

function normalizeDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function simpleHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getLatestMood(checkins: CheckinInput[]): number | null {
  if (checkins.length === 0) return null;
  return checkins[checkins.length - 1]?.mood ?? null;
}

function getNearestActiveGoal(goals: GoalInput[]): GoalInput | null {
  const activeGoals = goals.filter((goal) => goal.status === 'active');
  if (activeGoals.length === 0) return null;

  return activeGoals.reduce<GoalInput | null>((nearest, goal) => {
    if (!nearest) return goal;
    const nearestDate = new Date(nearest.target_date).getTime();
    const goalDate = new Date(goal.target_date).getTime();
    return goalDate < nearestDate ? goal : nearest;
  }, null);
}

function getToneTokens(mentorArchetype: MentorArchetype) {
  if (mentorArchetype === 'coach') {
    return {
      opening: 'Quick momentum reset',
      nudgeVerb: 'commit',
      close: 'Small wins stack quickly.',
    };
  }

  if (mentorArchetype === 'sage') {
    return {
      opening: 'A brief pause for perspective',
      nudgeVerb: 'honor',
      close: 'Let your next step reflect who you are becoming.',
    };
  }

  return {
    opening: 'Gentle check-in',
    nudgeVerb: 'offer',
    close: 'You are allowed to move at a humane pace.',
  };
}

function buildWindowPrompt(window: MicroMomentWindow): { title: string; actionLabel: string } {
  if (window === 'morning') {
    return { title: 'Morning alignment', actionLabel: 'Take 2-minute alignment' };
  }
  if (window === 'midday') {
    return { title: 'Midday recalibration', actionLabel: 'Do a quick reset' };
  }
  return { title: 'Evening integration', actionLabel: 'Close with reflection' };
}

function buildNudgeCopy({
  window,
  mentorArchetype,
  profile,
  nearestGoal,
  latestMood,
  cadence,
}: {
  window: MicroMomentWindow;
  mentorArchetype: MentorArchetype;
  profile: ProfileInput | null;
  nearestGoal: GoalInput | null;
  latestMood: number | null;
  cadence: MicroMomentsCadence;
}) {
  const firstName = profile?.name?.split(' ')[0];
  const tone = getToneTokens(mentorArchetype);
  const windowPrompt = buildWindowPrompt(window);
  const salutation = firstName ? `${firstName}, ` : '';
  const moodSentence =
    latestMood == null
      ? 'A single check-in now will help us calibrate your day.'
      : latestMood <= 4
        ? 'Keep it soft right now; one tiny action is enough.'
        : 'You have usable energy; channel it into one clear move.';

  const goalSentence = nearestGoal
    ? `Could we ${tone.nudgeVerb} 5 focused minutes toward "${nearestGoal.title}"?`
    : 'Name one intention you want this next block to serve.';

  const cadenceSentence =
    cadence === 'focused'
      ? 'This is one of your focused touchpoints for today.'
      : cadence === 'light'
        ? 'A low-pressure touchpoint to keep continuity.'
        : 'A steady touchpoint to keep your rhythm.';

  return {
    title: `${tone.opening}: ${windowPrompt.title}`,
    body: `${salutation}${moodSentence} ${goalSentence} ${cadenceSentence} ${tone.close}`,
    actionLabel: windowPrompt.actionLabel,
  };
}

function buildNudgeId(dayKey: string, window: MicroMomentWindow, seed: string) {
  return `micro-moment-${dayKey}-${window}-${simpleHash(seed).toString(36)}`;
}

export function generateMicroMomentNudges(input: MicroMomentInput): MicroMomentNudge[] {
  const now = input.now ?? new Date();
  const { profile, goals, checkins, mentorArchetype, preferences } = input;
  if (!preferences.enabled) return [];

  const dayKey = normalizeDayKey(now);
  const windows = CADENCE_WINDOWS[preferences.cadence];
  const nearestGoal = getNearestActiveGoal(goals);
  const latestMood = getLatestMood(checkins);

  return windows.map((window) => {
    const seed = `${dayKey}:${window}:${mentorArchetype}:${profile?.id ?? 'guest'}:${nearestGoal?.id ?? 'none'}:${latestMood ?? 0}`;
    const copy = buildNudgeCopy({
      window,
      mentorArchetype,
      profile,
      nearestGoal,
      latestMood,
      cadence: preferences.cadence,
    });

    return {
      id: buildNudgeId(dayKey, window, seed),
      window,
      title: copy.title,
      body: copy.body,
      actionLabel: copy.actionLabel,
      scheduledForIso: getWindowTimestamp(now, window).toISOString(),
      cadence: preferences.cadence,
    };
  });
}

export function getDeterministicNextNudgeSuggestion(input: MicroMomentInput): MicroMomentNudge | null {
  const now = input.now ?? new Date();
  const nudges = generateMicroMomentNudges({ ...input, now });
  if (nudges.length === 0) return null;

  const currentWindow = getWindowForTime(now);
  const sortedBySchedule = [...nudges].sort(
    (a, b) => new Date(a.scheduledForIso).getTime() - new Date(b.scheduledForIso).getTime()
  );
  const upcoming = sortedBySchedule.find((nudge) => new Date(nudge.scheduledForIso).getTime() >= now.getTime());
  if (upcoming) return upcoming;

  // If all windows have passed, deterministically pick the current window or the first available.
  return sortedBySchedule.find((nudge) => nudge.window === currentWindow) ?? sortedBySchedule[0];
}
