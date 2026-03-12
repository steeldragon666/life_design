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
