/**
 * google-calendar.ts
 *
 * Google Calendar OAuth2 flow, event fetching with pagination, event
 * classification heuristics, and the full sync pipeline.
 *
 * Design notes:
 *  - Fetches from the primary calendar and all other visible calendars via
 *    the calendarList endpoint.
 *  - Event classification priority: meeting (2+ attendees) > focus (title
 *    keywords) > social (title keywords) > personal (no attendees, no work
 *    keywords) > unknown.
 *  - Token refresh is proactive: triggered within 5 minutes of expiry.
 *  - Google does not always return a new refresh_token on refresh; the
 *    existing one is preserved in that case.
 *  - Pagination follows nextPageToken until exhausted.
 *
 * Required environment variables:
 *   GOOGLE_CLIENT_ID      — OAuth application client ID
 *   GOOGLE_CLIENT_SECRET  — OAuth application client secret
 *   GOOGLE_REDIRECT_URI   — Absolute callback URL
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CalendarEvent, NormalisedFeature } from '../feature-extraction';
import { extractCalendarFeatures } from '../feature-extraction';
import { storeFeatures } from './apple-health';

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

/** OAuth token bundle returned by the Google token endpoint. */
export interface GoogleCalendarTokens {
  accessToken: string;
  refreshToken: string;
  /** Unix epoch seconds at which the access token expires. */
  expiresAt: number;
}

/**
 * Raw event shape from GET /calendar/v3/calendars/{id}/events.
 * Only consumed fields are declared.
 */
export interface GoogleCalendarEventRaw {
  id: string;
  summary?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: Array<{ email: string; responseStatus?: string }>;
  recurrence?: string[];
  organizer?: { email?: string };
}

/** Minimal calendar entry from GET /calendar/v3/users/me/calendarList. */
interface CalendarListEntry {
  id: string;
  summary: string;
  primary?: boolean;
  accessRole: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const GOOGLE_AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const REFRESH_BUFFER_SECONDS = 300;
const MAX_RESULTS_PER_PAGE = 2500;

const FOCUS_KEYWORDS = ['focus', 'deep work', 'blocked', 'no meetings', 'heads down', 'dnd'];
const SOCIAL_KEYWORDS = ['lunch', 'coffee', 'dinner', 'happy hour', 'drinks', 'brunch'];

// ─────────────────────────────────────────────────────────────────────────────
// OAuth URL construction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the Google OAuth2 authorisation URL requesting calendar.readonly
 * scope with offline access so a refresh token is issued.
 *
 * @param state - A random CSRF-protection string.
 * @returns The full Google authorisation URL.
 * @throws If GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI env vars are missing.
 */
export function getGoogleAuthUrl(state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId) {
    throw new Error('getGoogleAuthUrl: GOOGLE_CLIENT_ID environment variable is required.');
  }
  if (!redirectUri) {
    throw new Error('getGoogleAuthUrl: GOOGLE_REDIRECT_URI environment variable is required.');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    state,
    access_type: 'offline',
    prompt: 'consent',
  });

  return `${GOOGLE_AUTH_BASE}?${params.toString()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Token exchange and refresh
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exchanges a Google authorisation code for an access + refresh token pair.
 *
 * @param code - The code query parameter from the OAuth callback.
 * @returns A GoogleCalendarTokens bundle.
 * @throws If the token exchange request fails.
 */
export async function exchangeGoogleCode(code: string): Promise<GoogleCalendarTokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'exchangeGoogleCode: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI are required.',
    );
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`exchangeGoogleCode: token exchange failed (${response.status}): ${body}`);
  }

  return mapGoogleTokenResponse(await response.json() as Record<string, unknown>);
}

/**
 * Refreshes an expired Google access token using the stored refresh token.
 *
 * Google does not always return a new refresh_token on refresh — the existing
 * one is preserved when the response omits it.
 *
 * @param refreshToken - The refresh token from the previous bundle.
 * @returns A new GoogleCalendarTokens bundle.
 * @throws If the refresh request fails.
 */
export async function refreshGoogleToken(refreshToken: string): Promise<GoogleCalendarTokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'refreshGoogleToken: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required.',
    );
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`refreshGoogleToken: token refresh failed (${response.status}): ${body}`);
  }

  const data = await response.json() as Record<string, unknown>;
  return {
    ...mapGoogleTokenResponse(data),
    refreshToken: (data.refresh_token as string | undefined) ?? refreshToken,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Event fetching and classification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches all calendar events from the primary and all visible secondary
 * calendars within the given time window, following pagination.
 *
 * @param tokens  - Current Google token bundle (auto-refreshed if near expiry).
 * @param timeMin - Inclusive window start.
 * @param timeMax - Exclusive window end.
 * @returns An array of CalendarEvent objects mapped from the raw API shape.
 * @throws If the Google Calendar API returns a non-2xx response.
 */
export async function fetchCalendarEvents(
  tokens: GoogleCalendarTokens,
  timeMin: Date,
  timeMax: Date,
): Promise<CalendarEvent[]> {
  const liveTokens = await maybeRefreshGoogleTokens(tokens);
  const headers = { Authorization: `Bearer ${liveTokens.accessToken}` };

  const calendars = await fetchCalendarList(headers);
  const allEvents: CalendarEvent[] = [];

  for (const calendar of calendars) {
    const rawEvents = await fetchEventsForCalendar(calendar.id, headers, timeMin, timeMax);
    allEvents.push(...rawEvents.map((raw) => mapRawEvent(raw)));
  }

  return allEvents;
}

/**
 * Classifies a Google Calendar event using attendee count and title heuristics.
 *
 * Priority:
 *  1. meeting  — 2 or more attendees
 *  2. focus    — title contains a focus keyword
 *  3. social   — title contains a social keyword
 *  4. personal — no attendees, title has no work meeting pattern
 *  5. unknown  — none of the above
 *
 * @param raw - Raw Google Calendar event object.
 * @returns Classification string.
 */
export function classifyEvent(
  raw: GoogleCalendarEventRaw,
): 'meeting' | 'focus' | 'social' | 'personal' | 'unknown' {
  const attendeeCount = raw.attendees?.length ?? 0;

  if (attendeeCount >= 2) return 'meeting';

  const title = (raw.summary ?? '').toLowerCase();

  for (const kw of FOCUS_KEYWORDS) {
    if (title.includes(kw)) return 'focus';
  }

  for (const kw of SOCIAL_KEYWORDS) {
    if (title.includes(kw)) return 'social';
  }

  if (
    attendeeCount === 0 &&
    !title.match(/\b(meeting|call|sync|review|standup|stand-up)\b/)
  ) {
    return 'personal';
  }

  return 'unknown';
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync pipeline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full Google Calendar sync pipeline: fetches events since the last sync,
 * extracts normalised features, persists them, and updates the sync log.
 *
 * Defaults to a 14-day lookback window on first sync.
 *
 * @param userId   - UUID of the authenticated user.
 * @param supabase - Supabase client with appropriate permissions.
 * @param tokens   - Current Google Calendar token bundle.
 * @returns Object with recordsProcessed count and extracted features array.
 * @throws If the Google API or Supabase calls fail irrecoverably.
 */
export async function syncGoogleCalendar(
  userId: string,
  supabase: SupabaseClient,
  tokens: GoogleCalendarTokens,
): Promise<{ recordsProcessed: number; features: NormalisedFeature[] }> {
  const now = new Date();
  const lastSync = await getLastSyncDate(supabase, userId, 'google_calendar');
  const syncFrom = lastSync ?? new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const events = await fetchCalendarEvents(tokens, syncFrom, now);

  let features: NormalisedFeature[] = [];
  if (events.length > 0) {
    features = extractCalendarFeatures(events);
    await storeFeatures(supabase, userId, features);
  }

  await upsertSyncLog(supabase, userId, 'google_calendar', {
    recordsProcessed: events.length,
    syncedAt: now,
    status: 'success',
  });

  return { recordsProcessed: events.length, features };
}

// ─────────────────────────────────────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────────────────────────────────────

async function maybeRefreshGoogleTokens(
  tokens: GoogleCalendarTokens,
): Promise<GoogleCalendarTokens> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (tokens.expiresAt - nowSeconds <= REFRESH_BUFFER_SECONDS) {
    return refreshGoogleToken(tokens.refreshToken);
  }
  return tokens;
}

/**
 * Retrieves all accessible calendars for the authenticated user.
 *
 * @param headers - Authorization headers.
 * @returns Array of CalendarListEntry objects.
 * @throws If the API request fails.
 */
async function fetchCalendarList(
  headers: Record<string, string>,
): Promise<CalendarListEntry[]> {
  const response = await fetch(
    `${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList?maxResults=250&showHidden=false`,
    { headers },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`fetchCalendarList: Google API error (${response.status}): ${body}`);
  }

  const data = await response.json() as { items?: CalendarListEntry[] };
  return data.items ?? [];
}

/**
 * Fetches all events from a single calendar within the date window, following
 * pagination via nextPageToken.
 *
 * 403/404 responses are silently skipped (calendar access may be restricted).
 *
 * @param calendarId - Calendar ID (e.g. 'primary').
 * @param headers    - Authorization headers.
 * @param timeMin    - Window start date.
 * @param timeMax    - Window end date.
 * @returns Array of raw event objects.
 */
async function fetchEventsForCalendar(
  calendarId: string,
  headers: Record<string, string>,
  timeMin: Date,
  timeMax: Date,
): Promise<GoogleCalendarEventRaw[]> {
  const allRaw: GoogleCalendarEventRaw[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(
      `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
    );
    url.searchParams.set('timeMin', timeMin.toISOString());
    url.searchParams.set('timeMax', timeMax.toISOString());
    url.searchParams.set('maxResults', String(MAX_RESULTS_PER_PAGE));
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      if (response.status === 403 || response.status === 404) break;
      const body = await response.text();
      throw new Error(
        `fetchEventsForCalendar: API error for "${calendarId}" (${response.status}): ${body}`,
      );
    }

    const data = await response.json() as {
      items?: GoogleCalendarEventRaw[];
      nextPageToken?: string;
    };

    if (data.items) allRaw.push(...data.items);
    pageToken = data.nextPageToken;
  } while (pageToken);

  return allRaw;
}

/**
 * Maps a raw Google Calendar event to the CalendarEvent interface.
 *
 * All-day events use the date field; timed events use dateTime. Attendee count
 * is taken directly from the attendees array length.
 *
 * @param raw - Raw Google Calendar event object.
 * @returns A CalendarEvent compatible with extractCalendarFeatures.
 */
function mapRawEvent(raw: GoogleCalendarEventRaw): CalendarEvent {
  const startRaw = raw.start.dateTime ?? raw.start.date ?? '';
  const endRaw = raw.end.dateTime ?? raw.end.date ?? '';

  return {
    summary: raw.summary ?? '(no title)',
    start: new Date(startRaw),
    end: new Date(endRaw),
    attendees: raw.attendees?.length,
    isRecurring: Array.isArray(raw.recurrence) && raw.recurrence.length > 0,
  };
}

/**
 * Maps a Google token endpoint response to GoogleCalendarTokens.
 * Google returns expires_in (seconds from now) rather than an absolute timestamp.
 */
function mapGoogleTokenResponse(data: Record<string, unknown>): GoogleCalendarTokens {
  const expiresIn = (data.expires_in as number | undefined) ?? 3600;
  return {
    accessToken: data.access_token as string,
    refreshToken: (data.refresh_token as string | undefined) ?? '',
    expiresAt: Math.floor(Date.now() / 1000) + expiresIn,
  };
}

/** Queries connector_sync_log for the most recent successful sync timestamp. */
async function getLastSyncDate(
  supabase: SupabaseClient,
  userId: string,
  provider: string,
): Promise<Date | null> {
  const { data } = await supabase
    .from('connector_sync_log')
    .select('synced_at')
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('status', 'success')
    .order('synced_at', { ascending: false })
    .limit(1)
    .single();

  if (!data?.synced_at) return null;
  return new Date(data.synced_at as string);
}

/** Inserts a sync run record. Failures are non-fatal. */
async function upsertSyncLog(
  supabase: SupabaseClient,
  userId: string,
  provider: string,
  payload: { recordsProcessed: number; syncedAt: Date; status: string },
): Promise<void> {
  const { error } = await supabase.from('connector_sync_log').insert({
    user_id: userId,
    provider,
    records_processed: payload.recordsProcessed,
    synced_at: payload.syncedAt.toISOString(),
    status: payload.status,
    event: 'sync',
  });

  if (error) {
    console.warn(
      `upsertSyncLog: failed to write sync log for ${provider} — ${error.message}`,
    );
  }
}
