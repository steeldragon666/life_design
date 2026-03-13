/**
 * connectors.test.ts
 *
 * Unit tests for the Strava connector, Google Calendar connector, and shared
 * OAuth manager.
 *
 * All external HTTP calls are replaced with vi.fn() stubs on the global fetch.
 * The Supabase client is mocked with a chainable builder pattern matching the
 * real client interface.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Module under test ───────────────────────────────────────────────────────
import {
  getStravaAuthUrl,
  exchangeStravaCode,
  refreshStravaToken,
  fetchStravaActivities,
  syncStrava,
} from '../connectors/strava.js';
import type { StravaTokens } from '../connectors/strava.js';

import {
  getGoogleAuthUrl,
  exchangeGoogleCode,
  refreshGoogleToken,
  fetchCalendarEvents,
  syncGoogleCalendar,
  classifyEvent,
} from '../connectors/google-calendar.js';
import type { GoogleCalendarTokens, GoogleCalendarEventRaw } from '../connectors/google-calendar.js';

import { storeTokens, getTokens, revokeTokens } from '../connectors/oauth-manager.js';

// ─────────────────────────────────────────────────────────────────────────────
// Shared test fixtures
// ─────────────────────────────────────────────────────────────────────────────

const NOW_UNIX = 1_720_000_000; // deterministic "now"

const STRAVA_TOKENS: StravaTokens = {
  accessToken: 'strava_access_token',
  refreshToken: 'strava_refresh_token',
  expiresAt: NOW_UNIX + 3600,
  athleteId: 12345,
};

const GOOGLE_TOKENS: GoogleCalendarTokens = {
  accessToken: 'google_access_token',
  refreshToken: 'google_refresh_token',
  expiresAt: NOW_UNIX + 3600,
};

/** Builds a minimal raw Strava activity for testing. */
function makeStravaActivityRaw(overrides: Partial<{
  id: number;
  type: string;
  distance: number;
  moving_time: number;
  start_date: string;
  average_heartrate: number | null;
  max_heartrate: number | null;
  suffer_score: number | null;
}> = {}) {
  return {
    id: 1,
    name: 'Morning Run',
    type: overrides.type ?? 'Run',
    start_date: overrides.start_date ?? '2024-06-01T07:00:00Z',
    elapsed_time: 3600,
    moving_time: overrides.moving_time ?? 3600,
    distance: overrides.distance ?? 10000,
    total_elevation_gain: 50,
    average_heartrate: overrides.average_heartrate ?? 145,
    max_heartrate: overrides.max_heartrate ?? 175,
    suffer_score: overrides.suffer_score ?? 42,
    average_speed: 2.78,
    ...overrides,
  };
}

/** Builds a minimal raw Google Calendar event for testing. */
function makeGoogleEventRaw(overrides: Partial<GoogleCalendarEventRaw> = {}): GoogleCalendarEventRaw {
  return {
    id: 'evt1',
    summary: overrides.summary ?? 'Team Standup',
    start: overrides.start ?? { dateTime: '2024-06-03T09:00:00Z' },
    end: overrides.end ?? { dateTime: '2024-06-03T09:30:00Z' },
    attendees: overrides.attendees,
    recurrence: overrides.recurrence,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase mock factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a minimal chainable Supabase client mock.
 * Methods return `this` for chaining; terminal methods return a resolved
 * Promise with configurable data/error.
 */
function makeSupabaseMock(response: { data: unknown; error: unknown } = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};

  const terminal = () => Promise.resolve(response);
  const self = () => chain;

  chain.from = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.insert = vi.fn(terminal);
  chain.upsert = vi.fn(terminal);
  chain.update = vi.fn(() => chain);
  chain.delete = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.single = vi.fn(terminal);
  chain.then = vi.fn((resolve: (v: unknown) => unknown) => Promise.resolve(response).then(resolve));

  return chain as unknown as import('@supabase/supabase-js').SupabaseClient;
}

// ─────────────────────────────────────────────────────────────────────────────
// Environment setup helpers
// ─────────────────────────────────────────────────────────────────────────────

function setStravaEnv() {
  process.env.STRAVA_CLIENT_ID = 'test_client_id';
  process.env.STRAVA_CLIENT_SECRET = 'test_client_secret';
  process.env.STRAVA_REDIRECT_URI = 'http://localhost:3000/api/connect/strava/callback';
}

function setGoogleEnv() {
  process.env.GOOGLE_CLIENT_ID = 'google_client_id';
  process.env.GOOGLE_CLIENT_SECRET = 'google_client_secret';
  process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/connect/google/callback';
}

function setEncryptionKeyEnv() {
  // 32 bytes = 64 hex chars
  process.env.ENCRYPTION_KEY = 'a'.repeat(64);
}

// ─────────────────────────────────────────────────────────────────────────────
// getStravaAuthUrl
// ─────────────────────────────────────────────────────────────────────────────

describe('getStravaAuthUrl', () => {
  beforeEach(setStravaEnv);

  it('returns a URL pointing to the Strava authorisation endpoint', () => {
    const url = getStravaAuthUrl('csrf-state-123');
    expect(url).toContain('https://www.strava.com/oauth/authorize');
  });

  it('includes the activity:read_all scope', () => {
    const url = getStravaAuthUrl('csrf-state-123');
    expect(url).toContain('activity%3Aread_all');
  });

  it('includes the state parameter', () => {
    const url = getStravaAuthUrl('my-state-token');
    expect(url).toContain('state=my-state-token');
  });

  it('includes the redirect_uri from the environment', () => {
    const url = getStravaAuthUrl('x');
    expect(url).toContain(encodeURIComponent('http://localhost:3000/api/connect/strava/callback'));
  });

  it('throws when STRAVA_CLIENT_ID is missing', () => {
    delete process.env.STRAVA_CLIENT_ID;
    expect(() => getStravaAuthUrl('x')).toThrow('STRAVA_CLIENT_ID');
  });

  it('throws when STRAVA_REDIRECT_URI is missing', () => {
    setStravaEnv();
    delete process.env.STRAVA_REDIRECT_URI;
    expect(() => getStravaAuthUrl('x')).toThrow('STRAVA_REDIRECT_URI');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getGoogleAuthUrl
// ─────────────────────────────────────────────────────────────────────────────

describe('getGoogleAuthUrl', () => {
  beforeEach(setGoogleEnv);

  it('returns a URL pointing to the Google authorisation endpoint', () => {
    const url = getGoogleAuthUrl('csrf-state-456');
    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
  });

  it('includes the calendar.readonly scope', () => {
    const url = getGoogleAuthUrl('csrf-state-456');
    expect(url).toContain('calendar.readonly');
  });

  it('requests offline access for refresh tokens', () => {
    const url = getGoogleAuthUrl('csrf-state-456');
    expect(url).toContain('access_type=offline');
  });

  it('includes the state parameter', () => {
    const url = getGoogleAuthUrl('state-xyz');
    expect(url).toContain('state=state-xyz');
  });

  it('throws when GOOGLE_CLIENT_ID is missing', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    expect(() => getGoogleAuthUrl('x')).toThrow('GOOGLE_CLIENT_ID');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// exchangeStravaCode
// ─────────────────────────────────────────────────────────────────────────────

describe('exchangeStravaCode', () => {
  beforeEach(() => {
    setStravaEnv();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a StravaTokens object with the expected structure', async () => {
    const mockResponse = {
      access_token: 'new_access',
      refresh_token: 'new_refresh',
      expires_at: NOW_UNIX + 21600,
      athlete: { id: 99 },
    };

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const tokens = await exchangeStravaCode('auth-code-123');

    expect(tokens.accessToken).toBe('new_access');
    expect(tokens.refreshToken).toBe('new_refresh');
    expect(tokens.expiresAt).toBe(NOW_UNIX + 21600);
    expect(tokens.athleteId).toBe(99);
  });

  it('throws on a non-2xx response', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve('bad_verification_code'),
    });

    await expect(exchangeStravaCode('bad-code')).rejects.toThrow('400');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// refreshStravaToken
// ─────────────────────────────────────────────────────────────────────────────

describe('refreshStravaToken', () => {
  beforeEach(() => {
    setStravaEnv();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns new tokens using grant_type refresh_token', async () => {
    const mockResponse = {
      access_token: 'refreshed_access',
      refresh_token: 'refreshed_refresh',
      expires_at: NOW_UNIX + 21600,
      athlete: { id: 12345 },
    };

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const tokens = await refreshStravaToken('old-refresh-token');

    expect(tokens.accessToken).toBe('refreshed_access');
    expect(tokens.refreshToken).toBe('refreshed_refresh');

    const callBody = JSON.parse(
      (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string,
    );
    expect(callBody.grant_type).toBe('refresh_token');
    expect(callBody.refresh_token).toBe('old-refresh-token');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fetchStravaActivities — pagination
// ─────────────────────────────────────────────────────────────────────────────

describe('fetchStravaActivities — pagination', () => {
  beforeEach(() => {
    setStravaEnv();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stops paginating when a page returns fewer than 100 results', async () => {
    // Page 1: full page (100 items), page 2: partial page (3 items)
    const page1 = Array.from({ length: 100 }, (_, i) =>
      makeStravaActivityRaw({ id: i, start_date: '2024-06-01T07:00:00Z' }),
    );
    const page2 = Array.from({ length: 3 }, (_, i) =>
      makeStravaActivityRaw({ id: 100 + i, start_date: '2024-06-02T07:00:00Z' }),
    );

    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(page1) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(page2) });

    const after = new Date('2024-05-25T00:00:00Z');
    const before = new Date('2024-06-03T00:00:00Z');

    const activities = await fetchStravaActivities(STRAVA_TOKENS, after, before);

    expect(activities).toHaveLength(103);
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(2);
  });

  it('returns an empty array when the first page has zero results', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const activities = await fetchStravaActivities(
      STRAVA_TOKENS,
      new Date('2024-06-01T00:00:00Z'),
      new Date('2024-06-02T00:00:00Z'),
    );

    expect(activities).toHaveLength(0);
  });

  it('maps raw fields to StravaActivity correctly', async () => {
    const raw = makeStravaActivityRaw({
      type: 'Ride',
      distance: 25000,
      moving_time: 3600,
      average_heartrate: 140,
      max_heartrate: 170,
      suffer_score: 80,
    });

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([raw]),
    });

    const [activity] = await fetchStravaActivities(
      STRAVA_TOKENS,
      new Date('2024-06-01T00:00:00Z'),
      new Date('2024-06-02T00:00:00Z'),
    );

    expect(activity.type).toBe('Ride');
    expect(activity.distanceMeters).toBe(25000);
    expect(activity.movingTimeSeconds).toBe(3600);
    expect(activity.averageHeartRate).toBe(140);
    expect(activity.maxHeartRate).toBe(170);
    expect(activity.sufferedScore).toBe(80);
    expect(activity.startDate).toBeInstanceOf(Date);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fetchStravaActivities — rate limit backoff
// ─────────────────────────────────────────────────────────────────────────────

describe('fetchStravaActivities — rate limit backoff', () => {
  beforeEach(() => {
    setStravaEnv();
    vi.stubGlobal('fetch', vi.fn());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('retries after receiving HTTP 429 and eventually succeeds', async () => {
    const activity = makeStravaActivityRaw();

    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: false, status: 429, text: () => Promise.resolve('Rate Limited') })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([activity]) });

    const promise = fetchStravaActivities(
      STRAVA_TOKENS,
      new Date('2024-06-01T00:00:00Z'),
      new Date('2024-06-02T00:00:00Z'),
    );

    // Advance timers past the first backoff delay (1 second).
    await vi.runAllTimersAsync();

    const activities = await promise;
    expect(activities).toHaveLength(1);
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(2);
  });

  it('throws after exhausting all retries', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Rate Limited'),
    });

    const promise = fetchStravaActivities(
      STRAVA_TOKENS,
      new Date('2024-06-01T00:00:00Z'),
      new Date('2024-06-02T00:00:00Z'),
    );

    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow();
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Google Calendar event classification
// ─────────────────────────────────────────────────────────────────────────────

describe('classifyEvent', () => {
  it('classifies an event with 2 attendees as "meeting"', () => {
    const event = makeGoogleEventRaw({
      summary: 'Project Sync',
      attendees: [{ email: 'alice@example.com' }, { email: 'bob@example.com' }],
    });
    expect(classifyEvent(event)).toBe('meeting');
  });

  it('classifies an event with 1 attendee as "meeting" only if >= 2', () => {
    const event = makeGoogleEventRaw({
      summary: 'One-on-one',
      attendees: [{ email: 'alice@example.com' }],
    });
    // 1 attendee is not enough — should fall through to other checks
    expect(classifyEvent(event)).not.toBe('meeting');
  });

  it('classifies "Deep Work Session" as "focus"', () => {
    const event = makeGoogleEventRaw({ summary: 'Deep Work Session' });
    expect(classifyEvent(event)).toBe('focus');
  });

  it('classifies "Focus Time" as "focus"', () => {
    const event = makeGoogleEventRaw({ summary: 'Focus Time' });
    expect(classifyEvent(event)).toBe('focus');
  });

  it('classifies "Blocked — no meetings" as "focus"', () => {
    const event = makeGoogleEventRaw({ summary: 'Blocked — no meetings' });
    expect(classifyEvent(event)).toBe('focus');
  });

  it('classifies "Lunch with Sarah" as "social"', () => {
    const event = makeGoogleEventRaw({ summary: 'Lunch with Sarah' });
    expect(classifyEvent(event)).toBe('social');
  });

  it('classifies "Team Happy Hour" as "social"', () => {
    const event = makeGoogleEventRaw({ summary: 'Team Happy Hour' });
    expect(classifyEvent(event)).toBe('social');
  });

  it('classifies "Coffee with Alex" as "social"', () => {
    const event = makeGoogleEventRaw({ summary: 'Coffee with Alex' });
    expect(classifyEvent(event)).toBe('social');
  });

  it('classifies a single-attendee non-keyword event as "personal"', () => {
    const event = makeGoogleEventRaw({ summary: 'Dentist appointment' });
    expect(classifyEvent(event)).toBe('personal');
  });

  it('classifies an unknown event as "unknown" when there are attendees but no match', () => {
    // 0 attendees but title implies work → unknown (not personal, not focus, not social)
    const event = makeGoogleEventRaw({ summary: 'Standup', attendees: [{ email: 'a@b.com' }] });
    // 1 attendee + "standup" keyword → should be unknown since < 2 attendees
    const result = classifyEvent(event);
    // Not enough attendees for meeting; "standup" is not in keyword lists → unknown
    expect(result).toBe('unknown');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// exchangeGoogleCode
// ─────────────────────────────────────────────────────────────────────────────

describe('exchangeGoogleCode', () => {
  beforeEach(() => {
    setGoogleEnv();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a GoogleCalendarTokens object', async () => {
    const mockResponse = {
      access_token: 'google_access',
      refresh_token: 'google_refresh',
      expires_in: 3600,
      token_type: 'Bearer',
    };

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const tokens = await exchangeGoogleCode('google-auth-code');

    expect(tokens.accessToken).toBe('google_access');
    expect(tokens.refreshToken).toBe('google_refresh');
    expect(tokens.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('throws on non-2xx response', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve('invalid_client'),
    });

    await expect(exchangeGoogleCode('bad-code')).rejects.toThrow('401');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// refreshGoogleToken
// ─────────────────────────────────────────────────────────────────────────────

describe('refreshGoogleToken', () => {
  beforeEach(() => {
    setGoogleEnv();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns updated tokens and preserves refresh token when not re-issued', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        access_token: 'new_google_access',
        expires_in: 3600,
        // No refresh_token in this response (Google's normal behaviour)
      }),
    });

    const tokens = await refreshGoogleToken('original-refresh-token');

    expect(tokens.accessToken).toBe('new_google_access');
    expect(tokens.refreshToken).toBe('original-refresh-token');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Token encryption / decryption round-trip
// ─────────────────────────────────────────────────────────────────────────────

describe('OAuth manager — encryption round-trip', () => {
  beforeEach(() => {
    setEncryptionKeyEnv();
  });

  it('stores and retrieves tokens with identical values', async () => {
    const originalTokens = {
      accessToken: 'test_access_abc',
      refreshToken: 'test_refresh_xyz',
      expiresAt: NOW_UNIX + 3600,
    };

    let storedEncrypted: Buffer | null = null;
    let storedIv: Buffer | null = null;

    // Mock supabase upsert to capture the encrypted payload.
    const supabaseMock = {
      from: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockImplementation(async (rows: Array<Record<string, unknown>>) => {
        const row = rows[0] ?? rows;
        const r = Array.isArray(rows) ? rows[0] : rows;
        storedEncrypted = r.encrypted_tokens as Buffer;
        storedIv = r.token_iv as Buffer;
        return { error: null };
      }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockImplementation(async () => ({
        data: {
          encrypted_tokens: storedEncrypted,
          token_iv: storedIv,
          expires_at: new Date((originalTokens.expiresAt) * 1000).toISOString(),
        },
        error: null,
      })),
    };

    await storeTokens(
      supabaseMock as unknown as import('@supabase/supabase-js').SupabaseClient,
      { provider: 'strava', userId: 'user-uuid-1' },
      originalTokens,
    );

    const retrieved = await getTokens(
      supabaseMock as unknown as import('@supabase/supabase-js').SupabaseClient,
      { provider: 'strava', userId: 'user-uuid-1' },
    );

    expect(retrieved).not.toBeNull();
    expect(retrieved!.accessToken).toBe(originalTokens.accessToken);
    expect(retrieved!.refreshToken).toBe(originalTokens.refreshToken);
    expect(retrieved!.expiresAt).toBe(originalTokens.expiresAt);
  });

  it('returns null when no row exists for the user/provider', async () => {
    const supabaseMock = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    };

    const result = await getTokens(
      supabaseMock as unknown as import('@supabase/supabase-js').SupabaseClient,
      { provider: 'strava', userId: 'no-such-user' },
    );

    expect(result).toBeNull();
  });

  it('throws when ENCRYPTION_KEY is missing', async () => {
    delete process.env.ENCRYPTION_KEY;

    const supabaseMock = makeSupabaseMock();

    await expect(
      storeTokens(supabaseMock, { provider: 'strava', userId: 'u1' }, {
        accessToken: 'a',
        refreshToken: 'r',
        expiresAt: NOW_UNIX,
      }),
    ).rejects.toThrow('ENCRYPTION_KEY');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// syncStrava — feature extraction integration
// ─────────────────────────────────────────────────────────────────────────────

describe('syncStrava', () => {
  beforeEach(() => {
    setStravaEnv();
    setEncryptionKeyEnv();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns recordsProcessed and features arrays when activities exist', async () => {
    const activities = Array.from({ length: 5 }, (_, i) =>
      makeStravaActivityRaw({
        id: i,
        type: 'Run',
        distance: 5000 + i * 1000,
        moving_time: 1800 + i * 60,
        start_date: `2024-06-0${i + 1}T07:00:00Z`,
      }),
    );

    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(activities) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // second page empty

    const supabaseMock = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    const result = await syncStrava(
      'user-uuid-sync',
      supabaseMock as unknown as import('@supabase/supabase-js').SupabaseClient,
      STRAVA_TOKENS,
    );

    expect(result.recordsProcessed).toBe(5);
    expect(result.features.length).toBeGreaterThan(0);
    // All features should have source 'strava'
    for (const f of result.features) {
      expect(f.source).toBe('strava');
    }
  });

  it('returns zero records and empty features when no activities exist', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const supabaseMock = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    const result = await syncStrava(
      'user-uuid-empty',
      supabaseMock as unknown as import('@supabase/supabase-js').SupabaseClient,
      STRAVA_TOKENS,
    );

    expect(result.recordsProcessed).toBe(0);
    expect(result.features).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// syncGoogleCalendar — feature extraction integration
// ─────────────────────────────────────────────────────────────────────────────

describe('syncGoogleCalendar', () => {
  beforeEach(() => {
    setGoogleEnv();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns recordsProcessed and features when events exist', async () => {
    const calendarList = {
      items: [{ id: 'primary', summary: 'Primary', primary: true, accessRole: 'owner' }],
    };

    // Generate 5 weekday events spanning different categories
    const baseDate = new Date('2024-06-03T00:00:00Z'); // Monday
    const eventItems = Array.from({ length: 5 }, (_, i) => {
      const day = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
      return makeGoogleEventRaw({
        id: `evt${i}`,
        summary: i % 2 === 0 ? 'Team Meeting' : 'Focus Time',
        start: { dateTime: new Date(day.getTime() + 9 * 3600 * 1000).toISOString() },
        end: { dateTime: new Date(day.getTime() + 10 * 3600 * 1000).toISOString() },
        attendees: i % 2 === 0
          ? [{ email: 'a@co.com' }, { email: 'b@co.com' }]
          : undefined,
      });
    });

    const eventsResponse = { items: eventItems, nextPageToken: undefined };

    // Fetch calls: calendar list, then events page
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(calendarList) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(eventsResponse) });

    const supabaseMock = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    const result = await syncGoogleCalendar(
      'user-uuid-gcal',
      supabaseMock as unknown as import('@supabase/supabase-js').SupabaseClient,
      GOOGLE_TOKENS,
    );

    expect(result.recordsProcessed).toBe(5);
    expect(result.features.length).toBeGreaterThan(0);
    for (const f of result.features) {
      expect(f.source).toBe('google_calendar');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// revokeTokens
// ─────────────────────────────────────────────────────────────────────────────

describe('revokeTokens', () => {
  beforeEach(() => {
    setEncryptionKeyEnv();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls the provider revocation endpoint and deletes the row', async () => {
    // Mock the revocation HTTP call
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });

    const { encryptTokensForTest } = await buildEncryptedTokenFixture();

    const supabaseMock = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: encryptTokensForTest,
        error: null,
      }),
      delete: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
      then: vi.fn().mockResolvedValue({ error: null }),
    };

    await revokeTokens(
      supabaseMock as unknown as import('@supabase/supabase-js').SupabaseClient,
      { provider: 'strava', userId: 'user-revoke' },
    );

    // delete() chain should have been called
    expect(supabaseMock.delete).toHaveBeenCalled();
    // The provider revocation HTTP call should have been made
    expect(fetch).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers for revokeTokens test
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates an encrypted token fixture in the format stored in the DB so that
 * `getTokens` can decrypt it during the revokeTokens test.
 */
async function buildEncryptedTokenFixture() {
  const { randomBytes, createCipheriv } = await import('crypto');

  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const payload = JSON.stringify({
    accessToken: 'access_to_revoke',
    refreshToken: 'refresh_to_revoke',
    expiresAt: NOW_UNIX + 3600,
  });
  const ciphertext = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const encryptedBuffer = Buffer.concat([authTag, ciphertext]);

  return {
    encryptTokensForTest: {
      encrypted_tokens: encryptedBuffer,
      token_iv: iv,
      expires_at: new Date((NOW_UNIX + 3600) * 1000).toISOString(),
    },
  };
}
