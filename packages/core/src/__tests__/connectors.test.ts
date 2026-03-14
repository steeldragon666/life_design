/**
 * connectors.test.ts
 *
 * Unit tests for the Strava connector, Google Calendar connector, and shared
 * OAuth manager. All external HTTP calls are replaced with vi.fn() stubs.
 * The Supabase client is mocked with a chainable builder pattern.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Feature-extraction mock ─────────────────────────────────────────────────
// Mock the feature-extraction module to isolate connector sync logic from the
// full ML pipeline. The actual extraction logic is tested in its own suite.
vi.mock('../feature-extraction', () => ({
  extractStravaFeatures: vi.fn(() => [
    { feature: 'weekly_distance_km', dimension: 'fitness', value: 35, source: 'strava', confidence: 1.0, recordedAt: new Date() },
  ]),
  extractCalendarFeatures: vi.fn(() => [
    { feature: 'meeting_hours', dimension: 'career', value: 8, source: 'google_calendar', confidence: 1.0, recordedAt: new Date() },
  ]),
  storeFeatures: vi.fn().mockResolvedValue(undefined),
}));

// ─── Modules under test ──────────────────────────────────────────────────────
import {
  getStravaAuthUrl,
  exchangeStravaCode,
  refreshStravaToken,
  fetchStravaActivities,
  syncStrava,
} from '../connectors/strava';
import type { StravaTokens, StravaActivityRaw } from '../connectors/strava';

import {
  getGoogleAuthUrl,
  exchangeGoogleCode,
  refreshGoogleToken,
  fetchCalendarEvents,
  syncGoogleCalendar,
  classifyEvent,
} from '../connectors/google-calendar';
import type {
  GoogleCalendarTokens,
  GoogleCalendarEventRaw,
} from '../connectors/google-calendar';

import { storeTokens, getTokens, revokeTokens } from '../connectors/oauth-manager';

// ─────────────────────────────────────────────────────────────────────────────
// Shared test fixtures
// ─────────────────────────────────────────────────────────────────────────────

const NOW_UNIX = 1_720_000_000;

// Use a far-future expiry (year 2099) so maybeRefresh* never triggers during
// tests. Tests that specifically test the token-refresh path will override
// this with an expired fixture.
const FAR_FUTURE_EXPIRY = 4_102_444_800; // 2100-01-01 00:00:00 UTC

const STRAVA_TOKENS: StravaTokens = {
  accessToken: 'strava_access',
  refreshToken: 'strava_refresh',
  expiresAt: FAR_FUTURE_EXPIRY,
  athleteId: 12345,
};

const GOOGLE_TOKENS: GoogleCalendarTokens = {
  accessToken: 'google_access',
  refreshToken: 'google_refresh',
  expiresAt: FAR_FUTURE_EXPIRY,
};

function makeStravaRaw(overrides: Partial<StravaActivityRaw> = {}): StravaActivityRaw {
  return {
    id: overrides.id ?? 1,
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

function makeGoogleEvent(overrides: Partial<GoogleCalendarEventRaw> = {}): GoogleCalendarEventRaw {
  return {
    id: 'evt1',
    summary: 'Team Standup',
    start: { dateTime: '2024-06-03T09:00:00Z' },
    end: { dateTime: '2024-06-03T09:30:00Z' },
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase mock factory
// ─────────────────────────────────────────────────────────────────────────────

function makeSupabaseMock(
  response: { data: unknown; error: unknown } = { data: null, error: null },
): SupabaseClient {
  const chain: Record<string, unknown> = {};
  const terminal = () => Promise.resolve(response);

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
  chain.then = vi.fn((resolve: (v: unknown) => unknown) =>
    Promise.resolve(response).then(resolve),
  );

  return chain as unknown as SupabaseClient;
}

// ─────────────────────────────────────────────────────────────────────────────
// Environment helpers
// ─────────────────────────────────────────────────────────────────────────────

function setStravaEnv() {
  process.env.STRAVA_CLIENT_ID = 'test_strava_id';
  process.env.STRAVA_CLIENT_SECRET = 'test_strava_secret';
  process.env.STRAVA_REDIRECT_URI = 'http://localhost:3000/api/connect/strava/callback';
}

function setGoogleEnv() {
  process.env.GOOGLE_CLIENT_ID = 'test_google_id';
  process.env.GOOGLE_CLIENT_SECRET = 'test_google_secret';
  process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/connect/google/callback';
}

function setEncryptionKeyEnv() {
  process.env.ENCRYPTION_KEY = 'a'.repeat(64);
}

// ─────────────────────────────────────────────────────────────────────────────
// getStravaAuthUrl
// ─────────────────────────────────────────────────────────────────────────────

describe('getStravaAuthUrl', () => {
  beforeEach(setStravaEnv);

  it('returns a URL pointing to the Strava authorisation endpoint', () => {
    const url = getStravaAuthUrl('state-abc');
    expect(url).toContain('https://www.strava.com/oauth/authorize');
  });

  it('includes the activity:read_all scope', () => {
    const url = getStravaAuthUrl('state-abc');
    expect(url).toContain('activity%3Aread_all');
  });

  it('includes the state parameter verbatim', () => {
    const url = getStravaAuthUrl('my-csrf-token');
    expect(url).toContain('state=my-csrf-token');
  });

  it('includes the redirect_uri from STRAVA_REDIRECT_URI', () => {
    const url = getStravaAuthUrl('x');
    expect(url).toContain(encodeURIComponent('http://localhost:3000/api/connect/strava/callback'));
  });

  it('throws when STRAVA_CLIENT_ID is absent', () => {
    delete process.env.STRAVA_CLIENT_ID;
    expect(() => getStravaAuthUrl('x')).toThrow('STRAVA_CLIENT_ID');
  });

  it('throws when STRAVA_REDIRECT_URI is absent', () => {
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
    const url = getGoogleAuthUrl('state-xyz');
    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
  });

  it('includes the calendar.readonly scope', () => {
    const url = getGoogleAuthUrl('state-xyz');
    expect(url).toContain('calendar.readonly');
  });

  it('requests offline access for refresh tokens', () => {
    const url = getGoogleAuthUrl('state-xyz');
    expect(url).toContain('access_type=offline');
  });

  it('includes the state parameter', () => {
    const url = getGoogleAuthUrl('my-state');
    expect(url).toContain('state=my-state');
  });

  it('throws when GOOGLE_CLIENT_ID is absent', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    expect(() => getGoogleAuthUrl('x')).toThrow('GOOGLE_CLIENT_ID');
  });

  it('throws when GOOGLE_REDIRECT_URI is absent', () => {
    setGoogleEnv();
    delete process.env.GOOGLE_REDIRECT_URI;
    expect(() => getGoogleAuthUrl('x')).toThrow('GOOGLE_REDIRECT_URI');
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
  afterEach(() => vi.unstubAllGlobals());

  it('returns a StravaTokens object with the correct structure', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: 'new_access',
          refresh_token: 'new_refresh',
          expires_at: NOW_UNIX + 21600,
          athlete: { id: 99 },
        }),
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
  afterEach(() => vi.unstubAllGlobals());

  it('sends grant_type=refresh_token and returns new tokens', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: 'refreshed_access',
          refresh_token: 'refreshed_refresh',
          expires_at: NOW_UNIX + 21600,
          athlete: { id: 12345 },
        }),
    });

    const tokens = await refreshStravaToken('old-refresh');
    expect(tokens.accessToken).toBe('refreshed_access');

    const body = JSON.parse(
      (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string,
    );
    expect(body.grant_type).toBe('refresh_token');
    expect(body.refresh_token).toBe('old-refresh');
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
  afterEach(() => vi.unstubAllGlobals());

  it('stops paginating when a page has fewer than 100 results', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) =>
      makeStravaRaw({ id: i, start_date: '2024-06-01T07:00:00Z' }),
    );
    const page2 = Array.from({ length: 3 }, (_, i) =>
      makeStravaRaw({ id: 100 + i, start_date: '2024-06-02T07:00:00Z' }),
    );

    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(page1) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(page2) });

    const activities = await fetchStravaActivities(
      STRAVA_TOKENS,
      new Date('2024-05-25T00:00:00Z'),
      new Date('2024-06-03T00:00:00Z'),
    );

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
    const raw = makeStravaRaw({
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

  it('retries after HTTP 429 and eventually succeeds', async () => {
    const activity = makeStravaRaw();

    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate Limited'),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([activity]) });

    const promise = fetchStravaActivities(
      STRAVA_TOKENS,
      new Date('2024-06-01T00:00:00Z'),
      new Date('2024-06-02T00:00:00Z'),
    );

    await vi.runAllTimersAsync();
    const activities = await promise;

    expect(activities).toHaveLength(1);
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(2);
  });

  it('throws after exhausting all retries on persistent 429', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Rate Limited'),
    });

    // Attach a catch handler immediately so the rejection is always handled —
    // prevents Node's "unhandled rejection" warning when fake timers fire the
    // final sleep and the error propagates before the await assertion runs.
    const promise = fetchStravaActivities(
      STRAVA_TOKENS,
      new Date('2024-06-01T00:00:00Z'),
      new Date('2024-06-02T00:00:00Z'),
    ).catch((e: unknown) => e);

    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toMatch(/429/);
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// classifyEvent — Google Calendar
// ─────────────────────────────────────────────────────────────────────────────

describe('classifyEvent', () => {
  it('classifies an event with 2+ attendees as "meeting"', () => {
    expect(
      classifyEvent(
        makeGoogleEvent({
          attendees: [{ email: 'a@co.com' }, { email: 'b@co.com' }],
        }),
      ),
    ).toBe('meeting');
  });

  it('does not classify a single-attendee event as "meeting"', () => {
    expect(
      classifyEvent(makeGoogleEvent({ attendees: [{ email: 'a@co.com' }] })),
    ).not.toBe('meeting');
  });

  it('classifies "Deep Work Session" as "focus"', () => {
    expect(classifyEvent(makeGoogleEvent({ summary: 'Deep Work Session' }))).toBe('focus');
  });

  it('classifies "Focus Time" as "focus"', () => {
    expect(classifyEvent(makeGoogleEvent({ summary: 'Focus Time' }))).toBe('focus');
  });

  it('classifies "Blocked — no meetings" as "focus"', () => {
    expect(classifyEvent(makeGoogleEvent({ summary: 'Blocked — no meetings' }))).toBe('focus');
  });

  it('classifies "Lunch with Sarah" as "social"', () => {
    expect(classifyEvent(makeGoogleEvent({ summary: 'Lunch with Sarah' }))).toBe('social');
  });

  it('classifies "Team Happy Hour" as "social"', () => {
    expect(classifyEvent(makeGoogleEvent({ summary: 'Team Happy Hour' }))).toBe('social');
  });

  it('classifies "Coffee with Alex" as "social"', () => {
    expect(classifyEvent(makeGoogleEvent({ summary: 'Coffee with Alex' }))).toBe('social');
  });

  it('classifies a no-attendee, non-keyword event as "personal"', () => {
    expect(classifyEvent(makeGoogleEvent({ summary: 'Dentist appointment' }))).toBe('personal');
  });

  it('classifies a single-attendee work-keyword event as "unknown"', () => {
    // 1 attendee (not 2) and title has "standup" — not focus, social, or personal
    const result = classifyEvent(
      makeGoogleEvent({ summary: 'Standup', attendees: [{ email: 'a@b.com' }] }),
    );
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
  afterEach(() => vi.unstubAllGlobals());

  it('returns a GoogleCalendarTokens object with future expiry', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: 'goog_access',
          refresh_token: 'goog_refresh',
          expires_in: 3600,
        }),
    });

    const tokens = await exchangeGoogleCode('google-auth-code');
    expect(tokens.accessToken).toBe('goog_access');
    expect(tokens.refreshToken).toBe('goog_refresh');
    expect(tokens.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('throws on non-2xx response', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve('invalid_client'),
    });
    await expect(exchangeGoogleCode('bad')).rejects.toThrow('401');
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
  afterEach(() => vi.unstubAllGlobals());

  it('preserves the existing refresh token when Google omits it', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: 'new_access',
          expires_in: 3600,
          // No refresh_token in response
        }),
    });

    const tokens = await refreshGoogleToken('original-refresh');
    expect(tokens.accessToken).toBe('new_access');
    expect(tokens.refreshToken).toBe('original-refresh');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// OAuth manager — encryption round-trip
// ─────────────────────────────────────────────────────────────────────────────

describe('oauth-manager — encryption round-trip', () => {
  beforeEach(setEncryptionKeyEnv);

  it('stores and retrieves tokens with identical values', async () => {
    const original = {
      accessToken: 'test_access_abc',
      refreshToken: 'test_refresh_xyz',
      expiresAt: NOW_UNIX + 3600,
    };

    let capturedEncrypted: Buffer | null = null;
    let capturedIv: Buffer | null = null;

    const supabaseMock = {
      from: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockImplementation(async (rows: Record<string, unknown>) => {
        capturedEncrypted = rows.encrypted_tokens as Buffer;
        capturedIv = rows.token_iv as Buffer;
        return { error: null };
      }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockImplementation(async () => ({
        data: {
          encrypted_tokens: capturedEncrypted,
          token_iv: capturedIv,
          expires_at: new Date(original.expiresAt * 1000).toISOString(),
        },
        error: null,
      })),
    };

    await storeTokens(
      supabaseMock as unknown as SupabaseClient,
      { provider: 'strava', userId: 'uid-1' },
      original,
    );

    const retrieved = await getTokens(
      supabaseMock as unknown as SupabaseClient,
      { provider: 'strava', userId: 'uid-1' },
    );

    expect(retrieved).not.toBeNull();
    expect(retrieved!.accessToken).toBe(original.accessToken);
    expect(retrieved!.refreshToken).toBe(original.refreshToken);
    expect(retrieved!.expiresAt).toBe(original.expiresAt);
  });

  it('returns null when no row exists', async () => {
    const mock = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    };

    const result = await getTokens(
      mock as unknown as SupabaseClient,
      { provider: 'strava', userId: 'no-such-user' },
    );
    expect(result).toBeNull();
  });

  it('throws when ENCRYPTION_KEY is missing', async () => {
    delete process.env.ENCRYPTION_KEY;
    await expect(
      storeTokens(
        makeSupabaseMock(),
        { provider: 'strava', userId: 'u1' },
        { accessToken: 'a', refreshToken: 'r', expiresAt: NOW_UNIX },
      ),
    ).rejects.toThrow('ENCRYPTION_KEY');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// syncStrava
// ─────────────────────────────────────────────────────────────────────────────

describe('syncStrava', () => {
  beforeEach(() => {
    setStravaEnv();
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('returns recordsProcessed and features when activities exist', async () => {
    const activities = Array.from({ length: 5 }, (_, i) =>
      makeStravaRaw({
        id: i,
        type: 'Run',
        distance: 5000 + i * 1000,
        moving_time: 1800 + i * 60,
        start_date: `2024-06-0${i + 1}T07:00:00Z`,
      }),
    );

    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(activities) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

    const mock = {
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
      'user-sync',
      mock as unknown as SupabaseClient,
      STRAVA_TOKENS,
    );

    expect(result.recordsProcessed).toBe(5);
    expect(result.features.length).toBeGreaterThan(0);
    for (const f of result.features) {
      expect(f.source).toBe('strava');
    }
  });

  it('returns zero records and empty features when no activities', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const mock = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    const result = await syncStrava(
      'user-empty',
      mock as unknown as SupabaseClient,
      STRAVA_TOKENS,
    );

    expect(result.recordsProcessed).toBe(0);
    expect(result.features).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// syncGoogleCalendar
// ─────────────────────────────────────────────────────────────────────────────

describe('syncGoogleCalendar', () => {
  beforeEach(() => {
    setGoogleEnv();
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('returns recordsProcessed and features when events exist', async () => {
    const calendarList = {
      items: [{ id: 'primary', summary: 'Primary', primary: true, accessRole: 'owner' }],
    };

    const baseDate = new Date('2024-06-03T00:00:00Z'); // Monday
    const eventItems = Array.from({ length: 5 }, (_, i) => {
      const day = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
      return makeGoogleEvent({
        id: `evt${i}`,
        summary: i % 2 === 0 ? 'Team Meeting' : 'Focus Time',
        start: { dateTime: new Date(day.getTime() + 9 * 3600 * 1000).toISOString() },
        end: { dateTime: new Date(day.getTime() + 10 * 3600 * 1000).toISOString() },
        attendees:
          i % 2 === 0
            ? [{ email: 'a@co.com' }, { email: 'b@co.com' }]
            : undefined,
      });
    });

    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(calendarList),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: eventItems }),
      });

    const mock = {
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
      'user-gcal',
      mock as unknown as SupabaseClient,
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
  afterEach(() => vi.unstubAllGlobals());

  it('calls the provider revocation endpoint and deletes the row', async () => {
    // Build an encrypted token fixture synchronously using Node crypto.
    const crypto = await import('crypto');
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const payload = JSON.stringify({
      accessToken: 'access_to_revoke',
      refreshToken: 'refresh_to_revoke',
      expiresAt: FAR_FUTURE_EXPIRY,
    });
    const ct = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const encBuf = Buffer.concat([tag, ct]);

    // Mock: getTokens decrypts the fixture; delete chain resolves; log insert resolves.
    let deleteEqCalled = false;
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = {
      eq: vi.fn().mockImplementation((_col: string, _val: string) => {
        deleteEqCalled = true;
        return { eq: vi.fn().mockResolvedValue({ error: null }) };
      }),
    };

    const mock = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'connector_sync_log') {
          return { insert: insertMock };
        }
        // user_connections — must support select chain and delete chain
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { encrypted_tokens: encBuf, token_iv: iv, expires_at: null },
            error: null,
          }),
          delete: vi.fn().mockReturnValue(deleteMock),
        };
      }),
    };

    // Simulate a successful revocation HTTP call from the provider.
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });

    await revokeTokens(
      mock as unknown as SupabaseClient,
      { provider: 'strava', userId: 'user-revoke' },
    );

    // The provider revocation fetch should have been called.
    expect(fetch).toHaveBeenCalled();
    // The delete chain's eq() should have been called (row was deleted).
    expect(deleteEqCalled).toBe(true);
  });
});
