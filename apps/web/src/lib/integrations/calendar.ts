/**
 * Google Calendar integration.
 * Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env variables.
 *
 * TODO: SECURITY — Migrate to user_connections table with AES-256-GCM encryption
 * via oauth-manager.ts. Currently stores tokens as plaintext in the legacy
 * integrations table. See: packages/core/src/connectors/oauth-manager.ts
 *
 * Used to:
 * - Track social density for isolation detection
 * - Feed calendar density into JITAI context
 * - Build context for AI mentor
 */

import { createClient } from '@/lib/supabase/server';
import {
  type CalendarEvent,
  type SocialDensityMetrics,
  computeSocialDensity,
} from '@life-design/core';

async function getAccessToken(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('integrations')
    .select('access_token_encrypted, refresh_token_encrypted, token_expires_at')
    .eq('user_id', userId)
    .eq('provider', 'google_calendar')
    .eq('status', 'connected')
    .single();

  if (!data) return null;

  // Refresh if expired
  if (data.token_expires_at && new Date(data.token_expires_at) < new Date()) {
    const refreshed = await refreshGoogleToken(data.refresh_token_encrypted);
    if (!refreshed) return null;

    await supabase
      .from('integrations')
      .update({
        access_token_encrypted: refreshed.access_token,
        token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      })
      .eq('user_id', userId)
      .eq('provider', 'google_calendar');

    return refreshed.access_token;
  }

  return data.access_token_encrypted;
}

async function refreshGoogleToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getCalendarEvents(userId: string, days: number = 7): Promise<CalendarEvent[] | null> {
  const token = await getAccessToken(userId);
  if (!token) return null;

  try {
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + days * 86400000).toISOString();

    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    });

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) return null;
    const data = await res.json();

    const events: CalendarEvent[] = (data.items ?? [])
      .filter((item: Record<string, unknown>) => item.status !== 'cancelled')
      .map((item: Record<string, unknown>) => {
        const start = item.start as Record<string, string> | undefined;
        const end = item.end as Record<string, string> | undefined;
        const attendees = item.attendees as Array<Record<string, unknown>> | undefined;

        return {
          id: item.id as string,
          title: (item.summary as string) ?? 'Untitled',
          startTime: start?.dateTime ?? start?.date ?? '',
          endTime: end?.dateTime ?? end?.date ?? '',
          attendeeCount: attendees?.length ?? 0,
          isRecurring: !!item.recurringEventId,
        };
      });

    return events;
  } catch {
    return null;
  }
}

export async function getCalendarDensity(userId: string): Promise<'empty' | 'light' | 'moderate' | 'packed'> {
  const events = await getCalendarEvents(userId, 1);
  if (!events) return 'empty';

  const count = events.length;
  if (count === 0) return 'empty';
  if (count <= 3) return 'light';
  if (count <= 6) return 'moderate';
  return 'packed';
}

export async function getSocialMetrics(userId: string, windowDays: number = 7): Promise<SocialDensityMetrics | null> {
  const events = await getCalendarEvents(userId, windowDays);
  if (!events) return null;

  // Fetch baseline density if available
  let baselineDensity: number | undefined;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('social_density_baselines')
      .select('baseline_density')
      .eq('user_id', userId)
      .single();

    if (data) {
      baselineDensity = Number(data.baseline_density);
    }
  } catch {
    // No baseline available — that's fine
  }

  return computeSocialDensity(events, windowDays, baselineDensity);
}

/**
 * Build calendar context string for AI mentor system prompt.
 */
export async function buildCalendarContext(userId: string): Promise<string | null> {
  const [todayEvents, metrics] = await Promise.all([
    getCalendarEvents(userId, 1),
    getSocialMetrics(userId),
  ]);

  if (!todayEvents && !metrics) return null;

  const lines: string[] = ['\nCalendar:'];

  if (todayEvents) {
    lines.push(`- Events today: ${todayEvents.length}`);

    if (todayEvents.length > 0) {
      const upcoming = todayEvents.slice(0, 3);
      const eventSummary = upcoming.map((e) => {
        const time = new Date(e.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        return `${time} ${e.title}`;
      });
      lines.push(`- Upcoming: ${eventSummary.join(', ')}`);
    }

    const density = todayEvents.length === 0 ? 'empty'
      : todayEvents.length <= 3 ? 'light'
      : todayEvents.length <= 6 ? 'moderate'
      : 'packed';
    lines.push(`- Schedule density: ${density}`);
  }

  if (metrics) {
    lines.push(`- Social density (7d): ${Math.round(metrics.socialDensity * 100)}% of events involve others`);
    lines.push(`- Avg daily contact hours: ${metrics.avgDailyContactHours}h`);

    if (metrics.isolationRisk) {
      lines.push('- WARNING: Social isolation risk detected — social activity significantly below baseline');
    }

    if (metrics.longestGapDays >= 3) {
      lines.push(`- NOTE: ${metrics.longestGapDays} day gap without social events`);
    }
  }

  return lines.join('\n');
}
