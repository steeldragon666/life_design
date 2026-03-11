import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.39.0';

const ANALYSIS_PROMPT = `You are a wellness data analyst. Analyze the user's check-in data and goals to generate actionable insights.

Return a JSON array of insights. Each insight has:
- type: "trend" | "correlation" | "suggestion" | "goal_progress" | "goal_risk"
- title: short headline (under 60 chars)
- body: 1-2 sentence explanation
- dimension: the relevant dimension name or null

Focus on:
- Trends: improving or declining dimensions
- Correlations: dimensions that move together
- Suggestions: actionable advice based on patterns
- Goal progress: how the user's active goals are tracking (are they on pace?)
- Goal risks: if dimension scores are declining in areas that affect active goals

Return ONLY valid JSON array, no other text.`;

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
    });

    // Get users who checked in within the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString().slice(0, 10);

    const { data: recentCheckins } = await supabase
      .from('checkins')
      .select('user_id')
      .gte('date', cutoff);

    if (!recentCheckins || recentCheckins.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const uniqueUserIds = [...new Set(recentCheckins.map((c: { user_id: string }) => c.user_id))];
    let processed = 0;

    for (const userId of uniqueUserIds) {
      // Get last 14 days of check-ins with scores
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data: checkIns } = await supabase
        .from('checkins')
        .select('date, mood, dimension_scores(dimension, score)')
        .eq('user_id', userId)
        .gte('date', fourteenDaysAgo.toISOString().slice(0, 10))
        .order('date', { ascending: true });

      if (!checkIns || checkIns.length < 3) continue;

      const dataStr = JSON.stringify(
        checkIns.map((c: { date: string; mood: number; dimension_scores: { dimension: string; score: number }[] }) => ({
          date: c.date,
          mood: c.mood,
          dimensions: Object.fromEntries(
            (c.dimension_scores ?? []).map((s) => [s.dimension, s.score]),
          ),
        })),
      );

      // Fetch active goals for this user
      const { data: activeGoals } = await supabase
        .from('goals')
        .select('title, horizon, status, tracking_type, target_date, metric_target, metric_current, goal_dimensions(dimension), goal_milestones(id, completed)')
        .eq('user_id', userId)
        .eq('status', 'active');

      let goalsContext = '';
      if (activeGoals && activeGoals.length > 0) {
        goalsContext = '\n\nActive goals:\n' + activeGoals.map((g: Record<string, unknown>) => {
          const milestones = (g.goal_milestones ?? []) as Array<{ id: string; completed: boolean }>;
          const total = milestones.length;
          const done = milestones.filter((m) => m.completed).length;
          const progress = total > 0 ? Math.round((done / total) * 100) :
            (g.tracking_type === 'metric' && g.metric_target)
              ? Math.round(((g.metric_current as number ?? 0) / (g.metric_target as number)) * 100) : 0;
          const dims = ((g.goal_dimensions ?? []) as Array<{ dimension: string }>).map((d) => d.dimension).join(', ');
          const daysLeft = Math.ceil((new Date(g.target_date as string).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return `- "${g.title}" (${g.horizon}-term, ${progress}% complete, ${daysLeft} days remaining, dimensions: ${dims})`;
        }).join('\n');
      }

      try {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: ANALYSIS_PROMPT,
          messages: [
            {
              role: 'user',
              content: `Here is my check-in data from the past ${checkIns.length} days:\n${dataStr}${goalsContext}`,
            },
          ],
        });

        const textBlock = response.content.find((b: { type: string }) => b.type === 'text');
        if (!textBlock || textBlock.type !== 'text') continue;

        const insights = JSON.parse(textBlock.text);
        if (!Array.isArray(insights)) continue;

        for (const insight of insights) {
          await supabase.from('insights').insert({
            user_id: userId,
            type: insight.type,
            title: insight.title,
            body: insight.body,
            dimension: insight.dimension ?? null,
          });
        }

        processed++;
      } catch {
        // Skip user on AI error, continue with others
        continue;
      }
    }

    return new Response(JSON.stringify({ processed, total: uniqueUserIds.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
