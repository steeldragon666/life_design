/**
 * sync-connectors — Supabase Edge Function (Deno)
 *
 * Scheduled cron job (every 6 hours) that syncs data for all users who have
 * at least one enabled provider connection in user_connections.
 *
 * Processing flow per connection:
 *  1. Decrypt and load stored tokens.
 *  2. Refresh the access token if it is within 5 minutes of expiry.
 *  3. Fetch new data from the provider API.
 *  4. Extract normalised features and upsert them into feature_store.
 *  5. Write a sync log entry to connector_sync_log.
 *  6. On error: retry once, then increment consecutive_failures. If
 *     consecutive_failures >= 3, set sync_enabled = false.
 *
 * Response body: { processed: number; total: number; errors: number }
 *
 * Required environment variables (Supabase secrets):
 *   SUPABASE_URL              — project URL
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (bypasses RLS)
 *   STRAVA_CLIENT_ID          — Strava OAuth client ID
 *   STRAVA_CLIENT_SECRET      — Strava OAuth client secret
 *   GOOGLE_CLIENT_ID          — Google OAuth client ID
 *   GOOGLE_CLIENT_SECRET      — Google OAuth client secret
 *   ENCRYPTION_KEY            — 32-byte hex key for AES-256-GCM token decryption
 */

// deno-lint-ignore-file no-explicit-any
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─────────────────────────────────────────────────────────────────────────────
// Types (self-contained — Edge Functions cannot import from packages/)
// ─────────────────────────────────────────────────────────────────────────────

interface UserConnection {
  id: string;
  user_id: string;
  provider: string;
  encrypted_tokens: Uint8Array | string;
  token_iv: Uint8Array | string;
  expires_at: string | null;
  last_sync_at: string | null;
  consecutive_failures: number;
}

interface ProviderTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface StravaActivityRaw {
  id: number;
  type: string;
  start_date: string;
  moving_time: number;
  distance: number;
  average_heartrate: number | null;
  max_heartrate: number | null;
  suffer_score: number | null;
}

interface GoogleEventRaw {
  id: string;
  summary?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: Array<{ email: string }>;
  recurrence?: string[];
}

interface SyncResult {
  connectionId: string;
  userId: string;
  provider: string;
  success: boolean;
  recordsProcessed: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const REFRESH_BUFFER_SECONDS = 300;
const MAX_CONSECUTIVE_FAILURES = 3;
const ACTIVITIES_PER_PAGE = 100;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─────────────────────────────────────────────────────────────────────────────
// Encryption helpers (Deno Web Crypto API)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Imports the ENCRYPTION_KEY env var as a CryptoKey for AES-256-GCM.
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const hexKey = Deno.env.get('ENCRYPTION_KEY') ?? '';
  if (hexKey.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string.');
  }
  const keyBytes = hexToBytes(hexKey);
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
}

/**
 * Decrypts an AES-256-GCM token bundle.
 * Packed format: [ authTag (16 bytes) | ciphertext (variable) ]
 */
async function decryptTokens(
  encryptedBuffer: Uint8Array,
  ivBuffer: Uint8Array,
): Promise<ProviderTokens> {
  const key = await getEncryptionKey();

  // authTag is the first 16 bytes; the rest is ciphertext.
  // Web Crypto AES-GCM appends the authTag to the end of the ciphertext,
  // so we reconstruct the combined buffer in [ciphertext | authTag] order.
  const authTag = encryptedBuffer.slice(0, 16);
  const ciphertext = encryptedBuffer.slice(16);
  // Web Crypto expects [ ciphertext || authTag ]
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext);
  combined.set(authTag, ciphertext.length);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer, tagLength: 128 },
    key,
    combined,
  );

  const json = new TextDecoder().decode(plaintext);
  return JSON.parse(json) as ProviderTokens;
}

// ─────────────────────────────────────────────────────────────────────────────
// Token refresh helpers
// ─────────────────────────────────────────────────────────────────────────────

async function refreshStravaToken(refreshToken: string): Promise<ProviderTokens> {
  const response = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: Deno.env.get('STRAVA_CLIENT_ID') ?? '',
      client_secret: Deno.env.get('STRAVA_CLIENT_SECRET') ?? '',
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Strava token refresh failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresAt: data.expires_at as number,
  };
}

async function refreshGoogleToken(refreshToken: string): Promise<ProviderTokens & { refreshToken: string }> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(`Google token refresh failed: ${response.status}`);
  }

  const data = await response.json();
  const expiresIn = (data.expires_in as number | undefined) ?? 3600;

  return {
    accessToken: data.access_token as string,
    refreshToken: (data.refresh_token as string | undefined) ?? refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + expiresIn,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider sync implementations
// ─────────────────────────────────────────────────────────────────────────────

async function syncStravaConnection(
  supabase: SupabaseClient,
  connection: UserConnection,
  tokens: ProviderTokens,
): Promise<number> {
  const now = new Date();
  const lastSync = connection.last_sync_at
    ? new Date(connection.last_sync_at)
    : new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

  const afterUnix = Math.floor(lastSync.getTime() / 1000);
  const beforeUnix = Math.floor(now.getTime() / 1000);

  const allActivities: StravaActivityRaw[] = [];
  let page = 1;

  while (true) {
    const url = new URL(`${STRAVA_API_BASE}/athlete/activities`);
    url.searchParams.set('after', String(afterUnix));
    url.searchParams.set('before', String(beforeUnix));
    url.searchParams.set('per_page', String(ACTIVITIES_PER_PAGE));
    url.searchParams.set('page', String(page));

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Strava API error: ${response.status}`);
    }

    const page_data = await response.json() as StravaActivityRaw[];
    allActivities.push(...page_data);

    if (page_data.length < ACTIVITIES_PER_PAGE) break;
    page++;
  }

  if (allActivities.length === 0) return 0;

  // Store minimal feature rows for each activity.
  const featureRows = allActivities.map((a) => ({
    user_id: connection.user_id,
    dimension: 'fitness',
    feature: 'activity_moving_time_min',
    value: a.moving_time / 60,
    source: 'strava',
    confidence: 1.0,
    recorded_at: a.start_date,
  }));

  const { error } = await supabase
    .from('feature_store')
    .upsert(featureRows, { onConflict: 'user_id,feature,recorded_at' });

  if (error) {
    throw new Error(`feature_store upsert failed: ${error.message}`);
  }

  return allActivities.length;
}

async function syncGoogleCalendarConnection(
  supabase: SupabaseClient,
  connection: UserConnection,
  tokens: ProviderTokens,
): Promise<number> {
  const now = new Date();
  const lastSync = connection.last_sync_at
    ? new Date(connection.last_sync_at)
    : new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Fetch calendar list
  const calListResponse = await fetch(
    `${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList?maxResults=250`,
    { headers: { Authorization: `Bearer ${tokens.accessToken}` } },
  );

  if (!calListResponse.ok) {
    throw new Error(`Google calendar list error: ${calListResponse.status}`);
  }

  const calListData = await calListResponse.json() as { items?: Array<{ id: string }> };
  const calendarIds = (calListData.items ?? []).map((c) => c.id);

  let totalEvents = 0;
  const featureRows: Array<Record<string, unknown>> = [];

  for (const calendarId of calendarIds) {
    let pageToken: string | undefined;

    do {
      const url = new URL(
        `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
      );
      url.searchParams.set('timeMin', lastSync.toISOString());
      url.searchParams.set('timeMax', now.toISOString());
      url.searchParams.set('maxResults', '2500');
      url.searchParams.set('singleEvents', 'true');
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const eventsResponse = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });

      if (!eventsResponse.ok) {
        if (eventsResponse.status === 403 || eventsResponse.status === 404) break;
        throw new Error(`Google events API error: ${eventsResponse.status}`);
      }

      const eventsData = await eventsResponse.json() as {
        items?: GoogleEventRaw[];
        nextPageToken?: string;
      };

      for (const event of eventsData.items ?? []) {
        const startStr = event.start.dateTime ?? event.start.date ?? '';
        if (!startStr) continue;

        featureRows.push({
          user_id: connection.user_id,
          dimension: 'career',
          feature: 'calendar_event_count',
          value: 1,
          source: 'google_calendar',
          confidence: 1.0,
          recorded_at: new Date(startStr).toISOString(),
        });

        totalEvents++;
      }

      pageToken = eventsData.nextPageToken;
    } while (pageToken);
  }

  if (featureRows.length > 0) {
    const { error } = await supabase
      .from('feature_store')
      .upsert(featureRows, { onConflict: 'user_id,feature,recorded_at' });

    if (error) {
      throw new Error(`feature_store upsert failed: ${error.message}`);
    }
  }

  return totalEvents;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main processing loop
// ─────────────────────────────────────────────────────────────────────────────

async function processConnection(
  supabase: SupabaseClient,
  connection: UserConnection,
): Promise<SyncResult> {
  const base: Omit<SyncResult, 'success' | 'recordsProcessed' | 'error'> = {
    connectionId: connection.id,
    userId: connection.user_id,
    provider: connection.provider,
  };

  // Attempt the sync once; on failure, retry exactly once before recording an error.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      // ── Decrypt tokens ───────────────────────────────────────────────────
      const encryptedBuffer = toUint8Array(connection.encrypted_tokens);
      const ivBuffer = toUint8Array(connection.token_iv);
      let tokens = await decryptTokens(encryptedBuffer, ivBuffer);

      // ── Refresh if near expiry ───────────────────────────────────────────
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (tokens.expiresAt - nowSeconds <= REFRESH_BUFFER_SECONDS) {
        if (connection.provider === 'strava') {
          tokens = await refreshStravaToken(tokens.refreshToken);
        } else if (connection.provider === 'google_calendar') {
          tokens = await refreshGoogleToken(tokens.refreshToken);
        }
      }

      // ── Run provider sync ────────────────────────────────────────────────
      let recordsProcessed = 0;
      if (connection.provider === 'strava') {
        recordsProcessed = await syncStravaConnection(supabase, connection, tokens);
      } else if (connection.provider === 'google_calendar') {
        recordsProcessed = await syncGoogleCalendarConnection(supabase, connection, tokens);
      }

      // ── Update last_sync_at and reset consecutive_failures ───────────────
      await supabase
        .from('user_connections')
        .update({ last_sync_at: new Date().toISOString(), consecutive_failures: 0 })
        .eq('id', connection.id);

      await writeSyncLog(supabase, connection, 'success', recordsProcessed);

      return { ...base, success: true, recordsProcessed };
    } catch (err) {
      if (attempt === 0) {
        // First attempt failed — retry immediately.
        console.warn(
          `Sync attempt 1 failed for ${connection.provider}/${connection.user_id}: ${(err as Error).message}. Retrying...`,
        );
        continue;
      }

      // Both attempts failed — record the failure.
      const errorMessage = (err as Error).message;
      const newFailureCount = (connection.consecutive_failures ?? 0) + 1;
      const autoDisable = newFailureCount >= MAX_CONSECUTIVE_FAILURES;

      await supabase
        .from('user_connections')
        .update({
          consecutive_failures: newFailureCount,
          ...(autoDisable ? { sync_enabled: false } : {}),
        })
        .eq('id', connection.id);

      await writeSyncLog(supabase, connection, 'error', 0, errorMessage);

      if (autoDisable) {
        console.error(
          `Auto-disabled sync for ${connection.provider}/${connection.user_id} after ${MAX_CONSECUTIVE_FAILURES} consecutive failures.`,
        );
      }

      return { ...base, success: false, recordsProcessed: 0, error: errorMessage };
    }
  }

  // Unreachable but required by TypeScript.
  return { ...base, success: false, recordsProcessed: 0, error: 'Unexpected loop exit' };
}

async function writeSyncLog(
  supabase: SupabaseClient,
  connection: UserConnection,
  status: 'success' | 'error',
  recordsProcessed: number,
  errorMessage?: string,
): Promise<void> {
  await supabase.from('connector_sync_log').insert({
    user_id: connection.user_id,
    provider: connection.provider,
    event: 'sync',
    status,
    records_processed: recordsProcessed,
    error_message: errorMessage ?? null,
    synced_at: new Date().toISOString(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Load all enabled connections (all providers).
    const { data: connections, error: fetchError } = await supabase
      .from('user_connections')
      .select('*')
      .eq('sync_enabled', true);

    if (fetchError) {
      throw new Error(`Failed to load user_connections: ${fetchError.message}`);
    }

    const rows = (connections as UserConnection[]) ?? [];

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, total: 0, errors: 0, message: 'No enabled connections.' }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Process connections sequentially to avoid overwhelming provider APIs.
    const results: SyncResult[] = [];
    for (const connection of rows) {
      const result = await processConnection(supabase, connection);
      results.push(result);
    }

    const processed = results.filter((r) => r.success).length;
    const errors = results.filter((r) => !r.success).length;

    console.log(
      `sync-connectors complete: ${processed}/${rows.length} succeeded, ${errors} errors.`,
    );

    return new Response(
      JSON.stringify({ processed, total: rows.length, errors }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('sync-connectors fatal error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: (err as Error).message }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      },
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Utility functions
// ─────────────────────────────────────────────────────────────────────────────

/** Converts a hex string (with or without \x prefix) to Uint8Array. */
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('\\x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Converts a Postgres bytea value (hex string or Uint8Array) to Uint8Array.
 * Supabase returns bytea columns as hex strings prefixed with `\x`.
 */
function toUint8Array(value: Uint8Array | string): Uint8Array {
  if (value instanceof Uint8Array) return value;
  return hexToBytes(value as string);
}
