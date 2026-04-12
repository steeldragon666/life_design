import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type UserIdRow = { user_id: string };
type CheckinRow = { date: string; mood: number };
type CorrelationRow = {
  dimension_a: string;
  dimension_b: string;
  correlation_coefficient: number;
  lag_days: number;
  confidence: number;
  insight_text: string | null;
};

// ---------------------------------------------------------------------------
// Inlined JITAI types & rules (Deno edge functions can't import from packages)
// ---------------------------------------------------------------------------

interface JITAIContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  recentMood: number | null;
  sleepQuality: number | null;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | null;
  calendarDensity: 'empty' | 'light' | 'moderate' | 'packed' | null;
  lastCheckinHoursAgo: number | null;
  streakDays: number;
  hrvStressLevel: 'low' | 'moderate' | 'high' | null;
}

interface JITAIDecision {
  shouldIntervene: boolean;
  interventionType: 'nudge' | 'checkin_prompt' | 'breathing_exercise' | 'activity_suggestion' | 'none';
  urgency: 'low' | 'medium' | 'high';
  content: { title: string; message: string; actionUrl?: string } | null;
  reasoning: string;
}

function evaluateJITAIRules(ctx: JITAIContext): JITAIDecision {
  if (ctx.hrvStressLevel === 'high' && ctx.timeOfDay === 'evening') {
    return {
      shouldIntervene: true,
      interventionType: 'breathing_exercise',
      urgency: 'high',
      content: {
        title: 'Take a moment',
        message: 'Your stress levels are elevated. A 2-minute breathing exercise can help.',
        actionUrl: '/meditations',
      },
      reasoning: 'High HRV stress detected in evening',
    };
  }
  if (ctx.lastCheckinHoursAgo !== null && ctx.lastCheckinHoursAgo > 24 && ctx.timeOfDay === 'evening') {
    return {
      shouldIntervene: true,
      interventionType: 'checkin_prompt',
      urgency: 'medium',
      content: {
        title: 'Daily reflection',
        message: 'A quick check-in helps track your progress. Just takes a minute.',
        actionUrl: '/checkin',
      },
      reasoning: 'No check-in for 24h+ and it is evening',
    };
  }
  if (ctx.recentMood !== null && ctx.recentMood <= 2 && ctx.activityLevel === 'sedentary') {
    return {
      shouldIntervene: true,
      interventionType: 'activity_suggestion',
      urgency: 'medium',
      content: {
        title: 'Movement helps',
        message: 'Even a short walk can shift your mood. Research shows 10 minutes makes a difference.',
      },
      reasoning: 'Low mood combined with sedentary activity level',
    };
  }
  if (ctx.calendarDensity === 'packed' && ctx.lastCheckinHoursAgo !== null && ctx.lastCheckinHoursAgo > 12) {
    return {
      shouldIntervene: true,
      interventionType: 'nudge',
      urgency: 'low',
      content: {
        title: 'Busy day?',
        message: 'Even on packed days, a 30-second check-in helps you stay connected to how you feel.',
        actionUrl: '/checkin',
      },
      reasoning: 'Packed calendar with no recent check-in',
    };
  }
  return { shouldIntervene: false, interventionType: 'none', urgency: 'low', content: null, reasoning: 'No intervention rules matched' };
}

const JITAI_URGENCY_TO_CATEGORY: Record<JITAIDecision['urgency'], 'reminder' | 'insight' | 'milestone'> = {
  low: 'reminder',
  medium: 'insight',
  high: 'insight',
};

function getTimeOfDay(): JITAIContext['timeOfDay'] {
  const hour = new Date().getUTCHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// ---------------------------------------------------------------------------

function isoDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function computeStreak(dates: string[], today: string): number {
  const dateSet = new Set(dates);
  if (!dateSet.has(today)) return 0;
  let streak = 0;
  let cursor = today;
  while (dateSet.has(cursor)) {
    streak += 1;
    const dt = new Date(`${cursor}T12:00:00Z`);
    dt.setUTCDate(dt.getUTCDate() - 1);
    cursor = isoDateOnly(dt);
  }
  return streak;
}

async function insertNudge(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  category: 'reminder' | 'insight' | 'milestone',
  title: string,
  body: string,
  payload: Record<string, unknown> = {},
) {
  await supabase.from('user_nudges').insert({
    user_id: userId,
    category,
    title,
    body,
    payload,
    scheduled_for: new Date().toISOString(),
  });
}

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - 30);
    const cutoff = isoDateOnly(lookbackDate);

    const { data: activeUsers, error: activeUsersError } = await supabase
      .from('checkins')
      .select('user_id')
      .gte('date', cutoff);
    if (activeUsersError) throw activeUsersError;

    const uniqueUserIds = [...new Set((activeUsers ?? []).map((row: UserIdRow) => row.user_id))];
    let processed = 0;

    for (const userId of uniqueUserIds) {
      const { data: checkins } = await supabase
        .from('checkins')
        .select('date, mood')
        .eq('user_id', userId)
        .gte('date', cutoff)
        .order('date', { ascending: true });

      const rows = (checkins ?? []) as CheckinRow[];
      if (rows.length === 0) continue;

      const today = isoDateOnly(new Date());
      const streak = computeStreak(rows.map((row) => row.date), today);
      const lastCheckinDate = rows[rows.length - 1]?.date;
      const daysSinceLastCheckin = lastCheckinDate
        ? Math.max(
            0,
            Math.floor(
              (new Date(`${today}T00:00:00Z`).getTime() -
                new Date(`${lastCheckinDate}T00:00:00Z`).getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          )
        : 99;

      // -----------------------------------------------------------------------
      // JITAI evaluation — run before rule-based nudges
      // -----------------------------------------------------------------------
      const recentMood = rows.length > 0 ? rows[rows.length - 1].mood : null;
      // Mood is already on 1-5 scale
      const normalisedMood = recentMood;

      const jitaiCtx: JITAIContext = {
        timeOfDay: getTimeOfDay(),
        recentMood: normalisedMood,
        sleepQuality: null,         // not yet tracked server-side
        activityLevel: null,        // not yet tracked server-side
        calendarDensity: null,      // not yet tracked server-side
        lastCheckinHoursAgo: daysSinceLastCheckin * 24,
        streakDays: streak,
        hrvStressLevel: null,       // not yet tracked server-side
      };

      const jitaiDecision = evaluateJITAIRules(jitaiCtx);

      if (jitaiDecision.shouldIntervene && jitaiDecision.content) {
        await insertNudge(
          supabase,
          userId,
          JITAI_URGENCY_TO_CATEGORY[jitaiDecision.urgency],
          jitaiDecision.content.title,
          jitaiDecision.content.message,
          {
            source: 'jitai',
            interventionType: jitaiDecision.interventionType,
            urgency: jitaiDecision.urgency,
            reasoning: jitaiDecision.reasoning,
            actionUrl: jitaiDecision.content.actionUrl ?? null,
          },
        );
        // JITAI already handled this user — skip the overlapping rule-based
        // check-in reminder to avoid duplicate nudges.
        // Milestone and insight nudges still run below.
      } else {
        // -----------------------------------------------------------------------
        // Fallback: rule-based check-in reminder
        // -----------------------------------------------------------------------
        if (daysSinceLastCheckin >= 1) {
          await insertNudge(
            supabase,
            userId,
            'reminder',
            'Your check-in rhythm is waiting',
            streak > 0
              ? `You are on a ${streak}-day streak. One check-in today keeps momentum alive.`
              : 'A 60-second check-in today is enough to restart your momentum.',
            { streak, daysSinceLastCheckin },
          );
        }
      }

      // Milestone nudges (always evaluated)
      if ([7, 14, 30, 90].includes(streak)) {
        await insertNudge(
          supabase,
          userId,
          'milestone',
          `${streak}-day milestone reached`,
          `You have completed ${streak} consecutive check-ins. Keep the rhythm and unlock deeper pattern confidence.`,
          { streak },
        );
      }

      // Insight nudges from correlation data (always evaluated)
      const { data: correlations } = await supabase
        .from('correlation_results')
        .select(
          'dimension_a, dimension_b, correlation_coefficient, lag_days, confidence, insight_text',
        )
        .eq('user_id', userId)
        .order('computed_at', { ascending: false })
        .limit(1);

      const topCorrelation = (correlations ?? [])[0] as CorrelationRow | undefined;
      if (topCorrelation && Math.abs(topCorrelation.correlation_coefficient) >= 0.4) {
        const title = `New ${topCorrelation.dimension_a} ↔ ${topCorrelation.dimension_b} pattern`;
        const body =
          topCorrelation.insight_text ??
          `${topCorrelation.dimension_a} and ${topCorrelation.dimension_b} are showing a meaningful relationship in your recent data.`;
        await insertNudge(supabase, userId, 'insight', title, body, {
          dimensionA: topCorrelation.dimension_a,
          dimensionB: topCorrelation.dimension_b,
          coefficient: topCorrelation.correlation_coefficient,
          lagDays: topCorrelation.lag_days,
          confidence: topCorrelation.confidence,
        });
      }

      processed += 1;
    }

    return new Response(
      JSON.stringify({
        processedUsers: processed,
        candidateUsers: uniqueUserIds.length,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
