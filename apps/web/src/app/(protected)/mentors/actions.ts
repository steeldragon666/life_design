'use server';

import { createClient } from '@/lib/supabase/server';
import {
  getChatHistory,
  saveChatMessage,
  activateMentor,
} from '@/lib/services/mentor-service';
import { getProfile } from '@/lib/services/profile-service';
import { getUserProfile } from '@/lib/services/user-profile-service';
import { getGoals } from '@/lib/services/goal-service';
import { sendMentorMessage, buildSystemPrompt } from '@life-design/ai';
import type { UserContext } from '@life-design/ai';
import { MentorType, computeDimensionAverage, getGranularContext } from '@life-design/core';
import { buildWeatherContext } from '@/lib/integrations/weather';
import { buildSpotifyContext } from '@/lib/integrations/spotify';
import { buildHealthContext } from '@/lib/integrations/apple-health';
import { buildNotionContext } from '@/lib/integrations/notion';
import { buildBankingContext } from '@/lib/integrations/banking';

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
    role: (msg.role === 'assistant' ? 'model' : msg.role) as 'user' | 'model',
    content: msg.content as string,
  }));

  // Load user context: profile, goals, recent scores
  const [profileResult, goalsResult, userProfileResult] = await Promise.all([
    getProfile(user.id),
    getGoals(user.id, { status: 'active' as import('@life-design/core').GoalStatus }),
    getUserProfile(user.id),
  ]);

  const profile = profileResult.data;
  const goals = goalsResult.data ?? [];
  const userProfile = userProfileResult.data;

  // Add personality profile to context for personalized mentor behavior
  if (userProfile) {
    userContext.personalityProfile = {
      motivationType: userProfile.motivation_type,
      chronotype: userProfile.chronotype,
      actionOrientation: userProfile.action_orientation,
      frictionIndex: userProfile.friction_index,
      structureNeed: userProfile.structure_need,
      dropoutRisk: userProfile.dropout_risk_initial,
      selfEfficacy: userProfile.self_efficacy,
    };
  }

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

  // Gather all integration contexts in parallel
  const integrationPromises: Promise<string | null>[] = [
    buildSpotifyContext(user.id),
    buildHealthContext(user.id),
    buildNotionContext(user.id),
    buildBankingContext(user.id),
  ];

  // Weather uses postcode, not userId
  if (profile?.postcode) {
    integrationPromises.push(buildWeatherContext(profile.postcode));
  }

  const integrationResults = await Promise.all(integrationPromises);
  userContext.integrationContexts = integrationResults.filter((ctx): ctx is string => ctx !== null);

  const [{ data: persistedSummaries }, { data: persistedCorrelations }] = await Promise.all([
    supabase
      .from('mentor_conversation_summaries')
      .select('summary')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('correlation_results')
      .select('dimension_a, dimension_b, correlation_coefficient, lag_days, confidence, insight_text')
      .eq('user_id', user.id)
      .order('computed_at', { ascending: false })
      .limit(5),
  ]);

  userContext.recentConversationSummaries = (persistedSummaries ?? [])
    .map((item: { summary?: string }) => item.summary)
    .filter((summary): summary is string => typeof summary === 'string' && summary.length > 0);

  userContext.correlationInsights = (persistedCorrelations ?? []).map(
    (item: {
      dimension_a: string;
      dimension_b: string;
      correlation_coefficient: number;
      lag_days: number;
      confidence: number;
      insight_text: string | null;
    }) => ({
      dimensionA: item.dimension_a,
      dimensionB: item.dimension_b,
      coefficient: item.correlation_coefficient,
      lagDays: item.lag_days,
      confidence: item.confidence,
      narrative: item.insight_text ?? undefined,
    }),
  );

  // Get granular real-world context (Search, Maps, etc.)
  const worldContext = profile?.postcode 
    ? await getGranularContext(profile.postcode, profile.profession, profile.interests ?? [])
    : null;

  // Build system prompt with all context
  const systemPrompt = buildSystemPrompt(mentorType as MentorType, userContext);

  const result = await sendMentorMessage(messages, systemPrompt, worldContext ?? undefined);

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
