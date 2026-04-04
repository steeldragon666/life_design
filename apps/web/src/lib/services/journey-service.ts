import { createClient } from '@/lib/supabase/server';
import { getJournalEntries } from './journal-service';
import { getPsychometricProfile } from './psychometric-service';

export interface JourneyHighlight {
  type: 'improvement' | 'strength' | 'pattern' | 'milestone';
  title: string;
  description: string;
  dimension?: string;
  delta?: number;
}

export interface KeyQuote {
  text: string;
  date: string;
  context: string;
}

export interface TimelineEvent {
  date: string;
  type: 'first_checkin' | 'goal_created' | 'milestone_hit' | 'streak_record' | 'insight';
  label: string;
  dimension?: string;
}

export interface JourneyStats {
  totalCheckins: number;
  totalJournalEntries: number;
  currentStreak: number;
  longestStreak: number;
  daysSinceStart: number;
  averageMood: number;
  moodTrend: 'improving' | 'stable' | 'declining';
  strongestDimension: string;
  mostImprovedDimension: string;
}

export interface JourneyNarrative {
  narrative: string;
  highlights: JourneyHighlight[];
  keyQuotes: KeyQuote[];
  timelineEvents: TimelineEvent[];
  stats: JourneyStats;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
}

export async function getJourneyNarrative(userId: string): Promise<JourneyNarrative | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('journey_narratives')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return null;

  return {
    narrative: data.narrative,
    highlights: data.highlights as JourneyHighlight[],
    keyQuotes: data.key_quotes as KeyQuote[],
    timelineEvents: data.timeline_events as TimelineEvent[],
    stats: data.stats as JourneyStats,
    generatedAt: data.generated_at,
    periodStart: data.period_start,
    periodEnd: data.period_end,
  };
}

export async function generateJourneyNarrative(userId: string): Promise<JourneyNarrative> {
  const supabase = await createClient();

  // Gather all data in parallel
  const [checkinsResult, journalResult, goalsResult, psychResult] = await Promise.all([
    supabase
      .from('checkins')
      .select('id, mood, dimension_scores, journal_entry, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
    getJournalEntries(userId, { limit: 100 }),
    supabase
      .from('goals')
      .select('id, title, status, created_at, goal_milestones(completed)')
      .eq('user_id', userId),
    getPsychometricProfile(userId),
  ]);

  const checkins = checkinsResult.data ?? [];
  const journals = journalResult.data ?? [];
  const goals = goalsResult.data ?? [];
  const psychProfile = psychResult.data;

  const now = new Date();
  const firstCheckin = checkins[0];
  const lastCheckin = checkins[checkins.length - 1];

  // Compute stats
  const daysSinceStart = firstCheckin
    ? Math.floor((now.getTime() - new Date(firstCheckin.created_at).getTime()) / 86400000)
    : 0;

  const moods = checkins.map((c) => c.mood).filter(Boolean) as number[];
  const averageMood = moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : 0;

  // Mood trend: compare first half to second half
  let moodTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (moods.length >= 4) {
    const mid = Math.floor(moods.length / 2);
    const firstHalf = moods.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const secondHalf = moods.slice(mid).reduce((a, b) => a + b, 0) / (moods.length - mid);
    if (secondHalf - firstHalf > 0.5) moodTrend = 'improving';
    else if (firstHalf - secondHalf > 0.5) moodTrend = 'declining';
  }

  // Dimension analysis
  type DimScores = Record<string, number[]>;
  const firstScores: DimScores = {};
  const lastScores: DimScores = {};

  for (const c of checkins.slice(0, 3)) {
    for (const ds of (c.dimension_scores ?? [])) {
      if (!firstScores[ds.dimension]) firstScores[ds.dimension] = [];
      firstScores[ds.dimension].push(ds.score);
    }
  }
  for (const c of checkins.slice(-3)) {
    for (const ds of (c.dimension_scores ?? [])) {
      if (!lastScores[ds.dimension]) lastScores[ds.dimension] = [];
      lastScores[ds.dimension].push(ds.score);
    }
  }

  const dimAvg = (scores: DimScores) =>
    Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length]));

  const firstAvg = dimAvg(firstScores);
  const lastAvg = dimAvg(lastScores);

  let strongestDimension = '';
  let strongestScore = 0;
  let mostImprovedDimension = '';
  let bestImprovement = -Infinity;

  for (const [dim, score] of Object.entries(lastAvg)) {
    if (score > strongestScore) {
      strongestScore = score;
      strongestDimension = dim;
    }
    const improvement = score - (firstAvg[dim] ?? score);
    if (improvement > bestImprovement) {
      bestImprovement = improvement;
      mostImprovedDimension = dim;
    }
  }

  // Streak calculation
  const checkinDates = [...new Set(checkins.map((c) => c.created_at.split('T')[0]))].sort().reverse();
  let currentStreak = 0;
  let longestStreak = 0;
  let streak = 1;

  const today = now.toISOString().split('T')[0];
  const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];

  if (checkinDates.length > 0 && (checkinDates[0] === today || checkinDates[0] === yesterday)) {
    currentStreak = 1;
    for (let i = 1; i < checkinDates.length; i++) {
      const diff = (new Date(checkinDates[i - 1]).getTime() - new Date(checkinDates[i]).getTime()) / 86400000;
      if (Math.round(diff) === 1) currentStreak++;
      else break;
    }
  }

  for (let i = 1; i < checkinDates.length; i++) {
    const diff = (new Date(checkinDates[i - 1]).getTime() - new Date(checkinDates[i]).getTime()) / 86400000;
    if (Math.round(diff) === 1) streak++;
    else { longestStreak = Math.max(longestStreak, streak); streak = 1; }
  }
  longestStreak = Math.max(longestStreak, streak, currentStreak);

  const stats: JourneyStats = {
    totalCheckins: checkins.length,
    totalJournalEntries: journals.length,
    currentStreak,
    longestStreak,
    daysSinceStart,
    averageMood: Math.round(averageMood * 10) / 10,
    moodTrend,
    strongestDimension,
    mostImprovedDimension,
  };

  // Key quotes from journal entries (pick entries with strongest sentiment)
  const quotable = journals
    .filter((j) => j.content && j.content.length > 20 && j.content.length < 300)
    .sort((a, b) => Math.abs(b.sentiment ?? 0) - Math.abs(a.sentiment ?? 0))
    .slice(0, 3);

  const keyQuotes: KeyQuote[] = quotable.map((j) => ({
    text: j.content.length > 200 ? j.content.slice(0, 200) + '...' : j.content,
    date: j.created_at,
    context: (j.sentiment ?? 0) > 0 ? 'A positive moment' : 'A reflective moment',
  }));

  // Timeline events
  const timelineEvents: TimelineEvent[] = [];
  if (firstCheckin) {
    timelineEvents.push({
      date: firstCheckin.created_at,
      type: 'first_checkin',
      label: 'First check-in',
    });
  }
  for (const goal of goals) {
    timelineEvents.push({
      date: goal.created_at,
      type: 'goal_created',
      label: `Set goal: ${goal.title}`,
    });
  }

  // Highlights
  const highlights: JourneyHighlight[] = [];
  if (mostImprovedDimension && bestImprovement > 0) {
    highlights.push({
      type: 'improvement',
      title: `${mostImprovedDimension} is improving`,
      description: `Up ${bestImprovement.toFixed(1)} points since you started.`,
      dimension: mostImprovedDimension,
      delta: bestImprovement,
    });
  }
  if (strongestDimension) {
    highlights.push({
      type: 'strength',
      title: `${strongestDimension} is your strongest area`,
      description: `Averaging ${strongestScore.toFixed(1)}/10 in recent check-ins.`,
      dimension: strongestDimension,
    });
  }
  if (currentStreak >= 3) {
    highlights.push({
      type: 'pattern',
      title: `${currentStreak}-day streak`,
      description: 'Consistency is building momentum.',
    });
  }

  // Generate narrative via Gemini
  let narrative = '';
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (apiKey && checkins.length >= 2) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const quotesText = keyQuotes.map((q) => `"${q.text}"`).join('\n');
      const goalsText = goals.map((g) => `${g.title} (${g.status})`).join(', ') || 'None yet';

      const prompt = `Write a warm, encouraging 3-4 paragraph progress story in second person ("You...").

Data:
- Started: ${firstCheckin?.created_at?.split('T')[0] ?? 'recently'}
- Total check-ins: ${stats.totalCheckins}, journal entries: ${stats.totalJournalEntries}
- Average mood: ${stats.averageMood}/10, trend: ${stats.moodTrend}
- Strongest dimension: ${stats.strongestDimension} (${strongestScore.toFixed(1)}/10)
- Most improved: ${stats.mostImprovedDimension} (+${bestImprovement.toFixed(1)})
- Current streak: ${stats.currentStreak} days
- Active goals: ${goalsText}
${psychProfile ? `- Grit: ${psychProfile.grit_overall?.toFixed(1)}/5` : ''}
${psychProfile ? `- Life satisfaction: ${psychProfile.swls_band?.replace(/_/g, ' ')}` : ''}
- Key journal quotes:
${quotesText || 'No journal entries yet'}

Cover: (1) where they started and how far they've come, (2) strengths and improvements, (3) goal progress, (4) forward encouragement. Keep under 250 words.`;

      const result = await model.generateContent(prompt);
      narrative = result.response.text();
    } catch (error) {
      console.error('Failed to generate journey narrative:', error);
    }
  }

  if (!narrative) {
    narrative = `You've completed ${stats.totalCheckins} check-in${stats.totalCheckins !== 1 ? 's' : ''} and written ${stats.totalJournalEntries} journal entr${stats.totalJournalEntries !== 1 ? 'ies' : 'y'} over ${stats.daysSinceStart} days. ${stats.moodTrend === 'improving' ? 'Your mood has been trending upward — great work!' : 'Keep checking in to see your patterns emerge.'} ${stats.strongestDimension ? `Your strongest area is ${stats.strongestDimension}.` : ''} Every reflection brings you closer to the life you're designing.`;
  }

  const journeyNarrative: JourneyNarrative = {
    narrative,
    highlights,
    keyQuotes,
    timelineEvents,
    stats,
    generatedAt: now.toISOString(),
    periodStart: firstCheckin?.created_at ?? now.toISOString(),
    periodEnd: now.toISOString(),
  };

  // Upsert to database
  await supabase
    .from('journey_narratives')
    .upsert({
      user_id: userId,
      narrative: journeyNarrative.narrative,
      highlights: journeyNarrative.highlights,
      key_quotes: journeyNarrative.keyQuotes,
      timeline_events: journeyNarrative.timelineEvents,
      stats: journeyNarrative.stats,
      generated_at: journeyNarrative.generatedAt,
      period_start: journeyNarrative.periodStart.split('T')[0],
      period_end: journeyNarrative.periodEnd.split('T')[0],
    }, { onConflict: 'user_id' });

  return journeyNarrative;
}
