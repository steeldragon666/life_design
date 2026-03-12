export type MoodLevel = 'low' | 'neutral' | 'high';

export interface MoodSample {
  mood: number;
}

export interface MoodAdaptationResult {
  level: MoodLevel;
  latestMood: number | null;
  rollingMood: number | null;
  modifier: string;
}

const DEFAULT_MOOD_MODIFIER =
  'Use a calm, grounded, supportive tone. Keep pacing steady and gently invitational.';

const LOW_MOOD_MODIFIER =
  'Use extra warmth and emotional safety. Slow pacing, validate feelings, reduce pressure, and suggest one small next step.';

const HIGH_MOOD_MODIFIER =
  'Reflect positive momentum while staying grounded. Keep guidance focused, clear, and channel energy into concrete actions.';

function clampMood(value: number): number {
  return Math.min(10, Math.max(1, value));
}

function averageMood(samples: MoodSample[]): number | null {
  if (!samples.length) return null;
  const total = samples.reduce((sum, sample) => sum + clampMood(sample.mood), 0);
  return total / samples.length;
}

export function inferMoodAdaptation(checkins: MoodSample[] | undefined): MoodAdaptationResult {
  if (!checkins?.length) {
    return {
      level: 'neutral',
      latestMood: null,
      rollingMood: null,
      modifier: DEFAULT_MOOD_MODIFIER,
    };
  }

  const latestMood = clampMood(checkins[checkins.length - 1]?.mood ?? 5);
  const rollingWindow = checkins.slice(-5);
  const rollingMood = averageMood(rollingWindow);
  const weightedMood = rollingMood == null ? latestMood : latestMood * 0.7 + rollingMood * 0.3;

  if (weightedMood <= 4.5) {
    return {
      level: 'low',
      latestMood,
      rollingMood,
      modifier: LOW_MOOD_MODIFIER,
    };
  }

  if (weightedMood >= 7.5) {
    return {
      level: 'high',
      latestMood,
      rollingMood,
      modifier: HIGH_MOOD_MODIFIER,
    };
  }

  return {
    level: 'neutral',
    latestMood,
    rollingMood,
    modifier: DEFAULT_MOOD_MODIFIER,
  };
}

export function buildMoodModifierSummary(mood: MoodAdaptationResult | undefined): string {
  if (!mood) {
    return `Mood level: neutral\nTone modifier: ${DEFAULT_MOOD_MODIFIER}`;
  }

  const latest = mood.latestMood == null ? 'n/a' : mood.latestMood.toFixed(1);
  const rolling = mood.rollingMood == null ? 'n/a' : mood.rollingMood.toFixed(1);

  return `Mood level: ${mood.level}\nLatest mood: ${latest}\nRolling mood: ${rolling}\nTone modifier: ${mood.modifier}`;
}
