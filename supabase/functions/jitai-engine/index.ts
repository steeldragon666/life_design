import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Inline JITAI types and rules (cannot import from @life-design/core in Deno)

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
  content: {
    title: string;
    message: string;
    actionUrl?: string;
  } | null;
  reasoning: string;
}

function evaluateJITAIRules(ctx: JITAIContext): JITAIDecision {
  // Rule 1: High stress + evening = breathing exercise
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
      reasoning: 'High HRV stress detected in evening — breathing exercise recommended',
    };
  }

  // Rule 2: No check-in for 24h+ and it's evening
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

  // Rule 3: Low mood + sedentary = activity suggestion
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

  // Rule 4: Packed calendar + no check-in = gentle nudge
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

  return {
    shouldIntervene: false,
    interventionType: 'none',
    urgency: 'low',
    content: null,
    reasoning: 'No intervention rules matched',
  };
}

function getTimeOfDay(date: Date): JITAIContext['timeOfDay'] {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Auth client — validates JWT properly
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    // Service client — for privileged DB writes
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'Missing user_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (user.id !== user_id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Gather context from Supabase tables
    const now = new Date();

    // Get most recent check-in
    const { data: lastCheckin } = await serviceClient
      .from('checkins')
      .select('created_at, mood_score')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get most recent sleep analysis
    const { data: lastSleep } = await serviceClient
      .from('sleep_analysis')
      .select('sleep_quality_score')
      .eq('user_id', user_id)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    // Get streak days (count consecutive days with check-ins)
    const { count: streakCount } = await serviceClient
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString());

    // Build context
    let lastCheckinHoursAgo: number | null = null;
    let recentMood: number | null = null;
    if (lastCheckin?.created_at) {
      lastCheckinHoursAgo = (now.getTime() - new Date(lastCheckin.created_at).getTime()) / (1000 * 60 * 60);
      recentMood = lastCheckin.mood_score ?? null;
    }

    const sleepQuality = lastSleep?.sleep_quality_score
      ? Math.round(lastSleep.sleep_quality_score)
      : null;

    const context: JITAIContext = {
      timeOfDay: getTimeOfDay(now),
      recentMood,
      sleepQuality,
      activityLevel: null, // Would come from health connector data
      calendarDensity: null, // Would come from calendar connector data
      lastCheckinHoursAgo,
      streakDays: streakCount ?? 0,
      hrvStressLevel: null, // Would come from health connector data
    };

    // Evaluate rules
    const decision = evaluateJITAIRules(context);

    // Log decision to jitai_decisions table
    const { error: insertError } = await serviceClient.from('jitai_decisions').insert({
      user_id,
      context,
      should_intervene: decision.shouldIntervene,
      intervention_type: decision.interventionType,
      urgency: decision.urgency,
      content: decision.content,
      reasoning: decision.reasoning,
    });

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ success: true, decision }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
