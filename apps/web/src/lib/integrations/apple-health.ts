/**
 * Apple Health integration via webhook/mobile bridge.
 * Data is pushed from the iOS app to our API endpoint.
 *
 * Used by the AI mentor system to:
 * - Track sleep quality and duration
 * - Monitor step counts and activity levels
 * - Detect heart rate variability patterns indicating stress
 * - Correlate health metrics with mood and dimension scores
 */

import { createClient } from '@/lib/supabase/server';

export interface HealthMetrics {
  sleepHours: number | null;
  sleepQuality: 'poor' | 'fair' | 'good' | 'excellent' | null;
  steps: number | null;
  activeMinutes: number | null;
  heartRateAvg: number | null;
  heartRateVariability: number | null;
  date: string;
}

export async function getLatestHealthMetrics(userId: string): Promise<HealthMetrics | null> {
  const supabase = await createClient();

  // Health data is stored in a dedicated table, synced from the mobile app
  const { data } = await supabase
    .from('health_metrics')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;

  const sleepHours = data.sleep_hours as number | null;
  let sleepQuality: HealthMetrics['sleepQuality'] = null;
  if (sleepHours !== null) {
    if (sleepHours < 5) sleepQuality = 'poor';
    else if (sleepHours < 6.5) sleepQuality = 'fair';
    else if (sleepHours < 8) sleepQuality = 'good';
    else sleepQuality = 'excellent';
  }

  return {
    sleepHours,
    sleepQuality,
    steps: data.steps as number | null,
    activeMinutes: data.active_minutes as number | null,
    heartRateAvg: data.heart_rate_avg as number | null,
    heartRateVariability: data.heart_rate_variability as number | null,
    date: data.date as string,
  };
}

export async function getHealthTrend(userId: string, days: number = 7): Promise<HealthMetrics[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('health_metrics')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(days);

  if (!data) return [];

  return data.map((d) => {
    const sleepHours = d.sleep_hours as number | null;
    let sleepQuality: HealthMetrics['sleepQuality'] = null;
    if (sleepHours !== null) {
      if (sleepHours < 5) sleepQuality = 'poor';
      else if (sleepHours < 6.5) sleepQuality = 'fair';
      else if (sleepHours < 8) sleepQuality = 'good';
      else sleepQuality = 'excellent';
    }

    return {
      sleepHours,
      sleepQuality,
      steps: d.steps as number | null,
      activeMinutes: d.active_minutes as number | null,
      heartRateAvg: d.heart_rate_avg as number | null,
      heartRateVariability: d.heart_rate_variability as number | null,
      date: d.date as string,
    };
  });
}

/**
 * Build Apple Health context string for AI mentor system prompt.
 */
export async function buildHealthContext(userId: string): Promise<string | null> {
  const latest = await getLatestHealthMetrics(userId);
  if (!latest) return null;

  const lines: string[] = ['\nHealth Metrics:'];

  if (latest.sleepHours !== null) {
    lines.push(`- Sleep last night: ${latest.sleepHours} hours (${latest.sleepQuality})`);
    if (latest.sleepHours < 6) {
      lines.push('- ALERT: Poor sleep — be mindful of energy levels and suggest rest');
    }
  }

  if (latest.steps !== null) {
    lines.push(`- Steps today: ${latest.steps.toLocaleString()}`);
    if (latest.steps < 3000) {
      lines.push('- NOTE: Low activity today — consider suggesting a walk or movement break');
    }
  }

  if (latest.activeMinutes !== null) {
    lines.push(`- Active minutes: ${latest.activeMinutes}`);
  }

  if (latest.heartRateVariability !== null) {
    lines.push(`- Heart rate variability: ${latest.heartRateVariability}ms`);
    if (latest.heartRateVariability < 20) {
      lines.push('- ALERT: Low HRV indicates high stress — prioritize recovery');
    }
  }

  return lines.join('\n');
}
