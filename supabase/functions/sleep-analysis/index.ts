import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SleepSample {
  startDate: string;
  endDate: string;
  value: string; // 'InBed', 'Asleep', 'Deep', 'REM', 'Core', 'Awake'
}

interface SleepMetrics {
  totalSleepMinutes: number;
  deepSleepMinutes: number;
  remSleepMinutes: number;
  lightSleepMinutes: number;
  awakeMinutes: number;
  sleepLatencyMinutes: number;
  sleepEfficiency: number;
  wakeAfterSleepOnset: number;
  sleepQualityScore: number;
}

function computeSleepMetrics(samples: SleepSample[]): SleepMetrics {
  let deep = 0, rem = 0, light = 0, awake = 0, inBed = 0;

  for (const s of samples) {
    const start = new Date(s.startDate).getTime();
    const end = new Date(s.endDate).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    const dur = (end - start) / 60000;
    if (dur <= 0) continue;
    switch (s.value) {
      case 'Deep': deep += dur; break;
      case 'REM': rem += dur; break;
      case 'Core':
      case 'Asleep': light += dur; break;
      case 'Awake': awake += dur; break;
      case 'InBed': inBed += dur; break;
    }
  }

  const totalSleep = deep + rem + light;
  const totalInBed = inBed > 0 ? inBed : totalSleep + awake;
  const efficiency = totalInBed > 0 ? (totalSleep / totalInBed) * 100 : 0;

  // Sleep latency = time in bed before first sleep (simplified)
  const latency = Math.max(0, totalInBed - totalSleep - awake);

  // Quality score (1-5): weighted combination
  // Duration: 8h (480min) = perfect score
  // Efficiency: 85%+ = perfect score
  // Deep sleep: 20% of total = good
  // REM sleep: 25% of total = good
  const durationScore = Math.min(totalSleep / 480, 1);
  const efficiencyScore = Math.min(efficiency / 85, 1);
  const deepScore = totalSleep > 0 ? Math.min(deep / (totalSleep * 0.2), 1) : 0;
  const remScore = totalSleep > 0 ? Math.min(rem / (totalSleep * 0.25), 1) : 0;

  const quality = 1 + 4 * (
    durationScore * 0.3 +
    efficiencyScore * 0.3 +
    deepScore * 0.2 +
    remScore * 0.2
  );

  return {
    totalSleepMinutes: Math.round(totalSleep),
    deepSleepMinutes: Math.round(deep),
    remSleepMinutes: Math.round(rem),
    lightSleepMinutes: Math.round(light),
    awakeMinutes: Math.round(awake),
    sleepLatencyMinutes: Math.round(latency),
    sleepEfficiency: Math.round(efficiency * 100) / 100,
    wakeAfterSleepOnset: Math.round(awake),
    sleepQualityScore: Math.round(quality * 10) / 10,
  };
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
    // Auth check BEFORE body parse
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const { user_id, date, samples } = await req.json();

    if (!user_id || !date || !Array.isArray(samples) || samples.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (user.id !== user_id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Response(JSON.stringify({ error: 'Invalid date format. Expected YYYY-MM-DD' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Validate sample elements
    if (!samples.every((s: unknown) => s && typeof s === 'object' && 'startDate' in s && 'endDate' in s && 'value' in s)) {
      return new Response(JSON.stringify({ error: 'Invalid sample format' }), { status: 400, headers: corsHeaders });
    }

    const metrics = computeSleepMetrics(samples);

    const { error } = await serviceClient.from('sleep_analysis').upsert({
      user_id,
      date,
      total_sleep_minutes: metrics.totalSleepMinutes,
      deep_sleep_minutes: metrics.deepSleepMinutes,
      rem_sleep_minutes: metrics.remSleepMinutes,
      light_sleep_minutes: metrics.lightSleepMinutes,
      awake_minutes: metrics.awakeMinutes,
      sleep_latency_minutes: metrics.sleepLatencyMinutes,
      sleep_efficiency: metrics.sleepEfficiency,
      wake_after_sleep_onset: metrics.wakeAfterSleepOnset,
      sleep_quality_score: metrics.sleepQualityScore,
      raw_data: { samples },
    }, { onConflict: 'user_id,date' });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ success: true, metrics }), {
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
