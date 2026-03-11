'use server';

import { createClient } from '@/lib/supabase/server';
import {
  getChatHistory,
  saveChatMessage,
  activateMentor,
} from '@/lib/services/mentor-service';
import { getProfile } from '@/lib/services/profile-service';
import { getGoals } from '@/lib/services/goal-service';
import { sendMentorMessage, buildSystemPrompt } from '@life-design/ai';
import type { UserContext } from '@life-design/ai';
import { MentorType, computeDimensionAverage } from '@life-design/core';

export async function sendMessage(
  userMentorId: string,
  mentorType: string,
  content: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { text: null, error: 'Not authenticated' };
  }

  // Save user message
  await saveChatMessage(userMentorId, 'user', content);

  // Get chat history for context
  const { data: history } = await getChatHistory(userMentorId);
  const messages = (history ?? []).map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content as string,
  }));

  // Load user context: profile, goals, recent scores
  const [profileResult, goalsResult] = await Promise.all([
    getProfile(user.id),
    getGoals(user.id, { status: 'active' as import('@life-design/core').GoalStatus }),
  ]);

  const profile = profileResult.data;
  const goals = goalsResult.data ?? [];

  // Build enriched user context
  const userContext: UserContext = {};

  // Get latest check-in data
  const { data: latestCheckin } = await supabase
    .from('checkins')
    .select('mood, dimension_scores(dimension, score)')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  if (latestCheckin) {
    userContext.recentMood = latestCheckin.mood;
    const scores = latestCheckin.dimension_scores as Array<{ dimension: string; score: number }>;
    if (scores.length > 0) {
      const sorted = [...scores].sort((a, b) => b.score - a.score);
      userContext.topDimension = sorted[0]?.dimension;
      userContext.lowDimension = sorted[sorted.length - 1]?.dimension;
    }
  }

  // Add profession-aware context
  if (profile) {
    if (profile.profession) userContext.profession = profile.profession;
    if (profile.postcode) userContext.postcode = profile.postcode;
    if (profile.interests.length > 0) userContext.interests = profile.interests;
    if (profile.hobbies.length > 0) userContext.hobbies = profile.hobbies;
  }

  // Add goal context
  if (goals.length > 0) {
    userContext.activeGoals = goals.map((g: Record<string, unknown>) => {
      const milestones = (g.goal_milestones ?? []) as Array<{ id: string; completed: boolean }>;
      const total = milestones.length;
      const done = milestones.filter((m) => m.completed).length;
      const progressPercent = total > 0 ? Math.round((done / total) * 100) :
        (g.tracking_type === 'metric' && g.metric_target)
          ? Math.round(((g.metric_current as number ?? 0) / (g.metric_target as number)) * 100)
          : 0;

      const daysRemaining = Math.ceil(
        (new Date(g.target_date as string).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      return {
        title: g.title as string,
        horizon: g.horizon as string,
        status: g.status as string,
        trackingType: g.tracking_type as string,
        progressPercent,
        daysRemaining,
        dimensions: ((g.goal_dimensions ?? []) as Array<{ dimension: string }>).map((d) => d.dimension),
      };
    });
  }

  // Build system prompt and send to AI
  const systemPrompt = buildSystemPrompt(mentorType as MentorType, userContext);
  const result = await sendMentorMessage(messages, systemPrompt);

  // Save assistant response if successful
  if (result.text) {
    await saveChatMessage(userMentorId, 'assistant', result.text);
  }

  return { text: result.text, error: result.error };
}

export async function activateUserMentor(mentorId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  return activateMentor(user.id, mentorId);
}
