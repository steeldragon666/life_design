/**
 * @module features/micro-moments
 *
 * Micro-moment interventions — proactive, clinically-informed outreach at
 * moments when a brief, warm check-in is likely to be meaningful rather than
 * intrusive. All functions are pure with no side effects.
 */

import type { MicroMoment } from '../types.js';

// ── Context Type ─────────────────────────────────────────────────────────────

export interface MicroMomentContext {
  userId: string;
  dayOfWeek: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  knownStressors: string[];
  interactionPatterns: {
    preferredTimes: string[];
  };
  dayPatterns: Record<string, string>;
  lastSessionDate: Date;
  emotionalTrend: 'positive' | 'neutral' | 'negative';
}

// ── Prompt ───────────────────────────────────────────────────────────────────

export const MICRO_MOMENT_PROMPT: string = `You are a warm, non-intrusive therapeutic companion composing a brief check-in message for a user.

You will be given:
- The type of micro-moment (morning check-in, pre-event support, evening reflection, post-crisis follow-up, or pattern-based)
- Contextual information about the user and their current situation
- The user's name

Your task is to write a single short message (1–3 sentences) that:
- Feels human, warm, and natural — not clinical or formulaic
- Is appropriate to the time of day and the micro-moment type
- Invites engagement without demanding it ("no pressure to respond" framing where helpful)
- Does NOT mention apps, AI, technology, or therapeutic frameworks by name
- Does NOT make assumptions about how the person is feeling — it opens a door rather than diagnosing

Tone guidance by type:
- morning_checkin: gentle, grounding, curious
- pre_event: calm, supportive, practical if helpful
- evening_reflection: reflective, soft, inviting
- post_crisis_followup: careful, steady, checking in without reopening rawness
- pattern_based: curious, non-judgemental, observational

Return only the message text — no JSON, no preamble, no quotes around the message.`;

// ── Prompt Builder ───────────────────────────────────────────────────────────

export function buildMicroMomentMessage(
  type: MicroMoment['type'],
  context: string,
): string {
  const typeDescriptions: Record<MicroMoment['type'], string> = {
    morning_checkin: 'Morning check-in — gentle start-of-day connection',
    pre_event: 'Pre-event support — the user has a known stressor coming up',
    evening_reflection: 'Evening reflection — gentle end-of-day check-in',
    post_crisis_followup:
      'Post-crisis follow-up — checking in after a difficult recent session',
    pattern_based: 'Pattern-based — a recurring theme has been noticed on this day',
  };

  return [
    MICRO_MOMENT_PROMPT,
    '',
    '---',
    '',
    `Micro-moment type: ${typeDescriptions[type]}`,
    '',
    'Context:',
    context,
  ].join('\n');
}

// ── Decision Logic ───────────────────────────────────────────────────────────

const MS_PER_HOUR = 60 * 60 * 1000;
const POST_CRISIS_WINDOW_HOURS = 24;

/**
 * Decides whether a micro-moment should be sent and which type.
 * Returns null when no intervention is warranted to avoid over-notifying.
 *
 * Priority order (highest first):
 * 1. Post-crisis follow-up (recency + negative trend)
 * 2. Pre-event (active stressors)
 * 3. Morning check-in (difficult day pattern)
 * 4. Pattern-based (day pattern match from timing intelligence)
 * 5. Evening reflection (preferred time + no session today)
 */
export function determineMicroMoment(context: MicroMomentContext): MicroMoment | null {
  const {
    userId,
    dayOfWeek,
    timeOfDay,
    knownStressors,
    interactionPatterns,
    dayPatterns,
    lastSessionDate,
    emotionalTrend,
  } = context;

  const now = new Date();
  const hoursSinceSession = (now.getTime() - lastSessionDate.getTime()) / MS_PER_HOUR;
  const sessionWasToday = hoursSinceSession < 24;

  // 1. Post-crisis follow-up: last session had negative trend and was within 24 h
  if (
    emotionalTrend === 'negative' &&
    hoursSinceSession <= POST_CRISIS_WINDOW_HOURS &&
    (timeOfDay === 'morning' || timeOfDay === 'afternoon' || timeOfDay === 'evening')
  ) {
    return buildMicroMomentRecord(userId, 'post_crisis_followup', now);
  }

  // 2. Pre-event: there are upcoming known stressors
  if (knownStressors.length > 0 && (timeOfDay === 'morning' || timeOfDay === 'afternoon')) {
    return buildMicroMomentRecord(userId, 'pre_event', now);
  }

  // 3. Morning check-in: morning and the day has a known difficult pattern
  const dayPattern = dayPatterns[dayOfWeek];
  const isDifficultDay =
    dayPattern !== undefined &&
    /distress|difficult|hard|struggle|challenging|low/i.test(dayPattern);

  if (timeOfDay === 'morning' && isDifficultDay) {
    return buildMicroMomentRecord(userId, 'morning_checkin', now);
  }

  // 4. Pattern-based: day matches a known pattern (any pattern noted)
  if (dayPattern !== undefined && dayPattern.trim() !== '') {
    return buildMicroMomentRecord(userId, 'pattern_based', now);
  }

  // 5. Evening reflection: evening, within preferred times, no session today
  if (timeOfDay === 'evening' && !sessionWasToday) {
    const isPreferredTime = interactionPatterns.preferredTimes.some((pt) =>
      pt.toLowerCase().includes('evening'),
    );
    if (isPreferredTime) {
      return buildMicroMomentRecord(userId, 'evening_reflection', now);
    }
  }

  return null;
}

// ── Internal Factory ─────────────────────────────────────────────────────────

function buildMicroMomentRecord(
  userId: string,
  type: MicroMoment['type'],
  now: Date,
): MicroMoment {
  return {
    id: `mm_${userId}_${type}_${now.getTime()}`,
    userId,
    type,
    message: '', // Populated after Claude generates the message
    context: '',  // Populated by the caller before invoking Claude
    scheduledFor: now,
    deliveredAt: null,
    respondedAt: null,
  };
}
