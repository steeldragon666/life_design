import { createClient } from '@/lib/supabase/server';
import TimelineClient from './timeline-client';

export default async function TimelinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="px-5 py-8 text-center">
        <p className="text-stone-500">Sign in to see your timeline.</p>
      </div>
    );
  }

  // Fetch last 30 days of check-ins with scores
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [checkinsResult, journalsResult, insightsResult, goalsResult] = await Promise.all([
    supabase
      .from('check_ins')
      .select('id, date, mood, journal_entry, dimension_scores, created_at')
      .eq('user_id', user.id)
      .gte('date', thirtyDaysAgo.toISOString().slice(0, 10))
      .order('date', { ascending: false }),
    supabase
      .from('journal_entries')
      .select('id, content, created_at')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('insights')
      .select('id, type, title, body, dimension, created_at')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('goals')
      .select('id, title, status, created_at, goal_milestones(id, completed)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  // Build unified timeline events
  type TimelineEvent = {
    id: string;
    type: 'checkin' | 'journal' | 'insight' | 'goal';
    date: string;
    data: Record<string, unknown>;
  };

  const events: TimelineEvent[] = [];

  for (const ci of checkinsResult.data ?? []) {
    events.push({
      id: `checkin-${ci.id}`,
      type: 'checkin',
      date: ci.created_at ?? ci.date,
      data: {
        mood: ci.mood,
        journalEntry: ci.journal_entry,
        dimensionScores: ci.dimension_scores,
        displayDate: ci.date,
      },
    });
  }

  for (const j of journalsResult.data ?? []) {
    events.push({
      id: `journal-${j.id}`,
      type: 'journal',
      date: j.created_at,
      data: { content: j.content },
    });
  }

  for (const ins of insightsResult.data ?? []) {
    events.push({
      id: `insight-${ins.id}`,
      type: 'insight',
      date: ins.created_at,
      data: { title: ins.title, body: ins.body, insightType: ins.type },
    });
  }

  for (const g of goalsResult.data ?? []) {
    events.push({
      id: `goal-${g.id}`,
      type: 'goal',
      date: g.created_at,
      data: {
        title: g.title,
        status: g.status,
        milestones: g.goal_milestones,
      },
    });
  }

  // Sort by date descending
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return <TimelineClient events={events} />;
}
