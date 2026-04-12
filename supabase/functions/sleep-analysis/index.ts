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

// ---------------------------------------------------------------------------
// Sleep architecture types (mirrors packages/core/src/health/sleep-architecture.ts)
// ---------------------------------------------------------------------------

interface SleepArchitectureMetrics {
  sleepEfficiency: number;
  sleepLatency: number;
  waso: number;
  remPercent: number | null;
  deepPercent: number | null;
  lightPercent: number | null;
  awakePercent: number | null;
  qualityScore: number;
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

// ---------------------------------------------------------------------------
// Sleep architecture analysis (inline port of packages/core logic for Deno)
// ---------------------------------------------------------------------------

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Compute a composite 0-100 quality score from sleep architecture metrics.
 * Mirrors computeSleepQualityScore in packages/core/src/health/sleep-architecture.ts.
 */
function computeArchitectureQualityScore(
  metrics: SleepArchitectureMetrics,
  totalMinutes?: number,
): number {
  const effScore = clamp((metrics.sleepEfficiency - 50) / (85 - 50), 0, 1);
  const wasoScore = clamp(1 - metrics.waso / 60, 0, 1);
  const latencyScore = clamp(1 - (metrics.sleepLatency - 10) / 30, 0, 1);

  let durationScore = 1;
  if (totalMinutes !== undefined) {
    if (totalMinutes >= 420 && totalMinutes <= 540) {
      durationScore = 1;
    } else if (totalMinutes < 420) {
      durationScore = clamp((totalMinutes - 180) / (420 - 180), 0, 1);
    } else {
      durationScore = clamp(1 - (totalMinutes - 540) / (660 - 540), 0, 1);
    }
  }

  let deepScore = 0.5;
  let remScore = 0.5;

  if (metrics.deepPercent !== null) {
    if (metrics.deepPercent >= 15 && metrics.deepPercent <= 25) deepScore = 1;
    else if (metrics.deepPercent < 15) deepScore = clamp(metrics.deepPercent / 15, 0, 1);
    else deepScore = clamp(1 - (metrics.deepPercent - 25) / 15, 0, 1);
  }

  if (metrics.remPercent !== null) {
    if (metrics.remPercent >= 20 && metrics.remPercent <= 30) remScore = 1;
    else if (metrics.remPercent < 20) remScore = clamp(metrics.remPercent / 20, 0, 1);
    else remScore = clamp(1 - (metrics.remPercent - 30) / 15, 0, 1);
  }

  const hasStages = metrics.deepPercent !== null;
  let score: number;
  if (hasStages) {
    score = effScore * 25 + deepScore * 20 + remScore * 20 + wasoScore * 15 + latencyScore * 10 + durationScore * 10;
  } else {
    score = effScore * 35 + wasoScore * 25 + latencyScore * 20 + durationScore * 20;
  }
  return round2(clamp(score, 0, 100));
}

/**
 * Build SleepArchitectureMetrics from raw SleepSample data.
 */
function computeArchitectureMetrics(samples: SleepSample[]): SleepArchitectureMetrics {
  let deep = 0, rem = 0, light = 0, awake = 0, inBed = 0;
  let earliestInBed = Infinity, latestWake = -Infinity;

  for (const s of samples) {
    const start = new Date(s.startDate).getTime();
    const end = new Date(s.endDate).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    const dur = (end - start) / 60000;
    if (dur <= 0) continue;

    if (start < earliestInBed) earliestInBed = start;
    if (end > latestWake) latestWake = end;

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
  const totalStageTime = totalSleep + awake;
  const totalInBed = inBed > 0 ? inBed : totalStageTime;
  const efficiency = totalInBed > 0 ? (totalSleep / totalInBed) * 100 : 0;
  const latency = Math.max(0, totalInBed - totalStageTime);

  const hasStages = deep > 0 || rem > 0;
  let remPercent: number | null = null;
  let deepPercent: number | null = null;
  let lightPercent: number | null = null;
  let awakePercent: number | null = null;

  if (hasStages && totalStageTime > 0) {
    remPercent = round2((rem / totalStageTime) * 100);
    deepPercent = round2((deep / totalStageTime) * 100);
    lightPercent = round2((light / totalStageTime) * 100);
    awakePercent = round2((awake / totalStageTime) * 100);
  }

  const arch: SleepArchitectureMetrics = {
    sleepEfficiency: round2(clamp(efficiency, 0, 100)),
    sleepLatency: round2(latency),
    waso: round2(awake),
    remPercent,
    deepPercent,
    lightPercent,
    awakePercent,
    qualityScore: 0,
  };
  arch.qualityScore = computeArchitectureQualityScore(arch, totalSleep);
  return arch;
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
    const architecture = computeArchitectureMetrics(samples);

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
      raw_data: {
        samples,
        architecture: {
          quality_score_0_100: architecture.qualityScore,
          rem_percent: architecture.remPercent,
          deep_percent: architecture.deepPercent,
          light_percent: architecture.lightPercent,
          awake_percent: architecture.awakePercent,
          sleep_efficiency: architecture.sleepEfficiency,
          sleep_latency: architecture.sleepLatency,
          waso: architecture.waso,
        },
      },
    }, { onConflict: 'user_id,date' });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ success: true, metrics, architecture }), {
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
