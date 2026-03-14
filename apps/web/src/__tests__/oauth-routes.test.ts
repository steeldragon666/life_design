import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock crypto.randomBytes before importing route modules
const mockRandomBytes = vi.fn(() => Buffer.from('a'.repeat(16)));
vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>();
  return { ...actual, randomBytes: (...args: any[]) => mockRandomBytes(...args) };
});

// Mock oauth config
vi.mock('@/lib/integrations/oauth', () => ({
  STRAVA_CONFIG: {
    name: 'strava',
    authUrl: 'https://www.strava.com/oauth/authorize',
    tokenUrl: 'https://www.strava.com/oauth/token',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    scopes: ['read', 'activity:read'],
  },
  validateOAuthConfig: vi.fn(() => true),
}));

// Mock global fetch for token exchange
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
});

describe('OAuth auth initiation (/api/auth/strava)', () => {
  it('sets an httpOnly CSRF state cookie on redirect', async () => {
    const { GET } = await import('@/app/api/auth/strava/route');
    const response = await GET();

    // Should redirect to Strava OAuth
    expect(response.status).toBe(307);
    const location = response.headers.get('location') ?? '';
    expect(location).toContain('strava.com/oauth/authorize');

    // Should include state param in URL
    const url = new URL(location);
    const state = url.searchParams.get('state');
    expect(state).toBeTruthy();

    // Should set httpOnly CSRF cookie
    const setCookieHeader = response.headers.getSetCookie();
    const stateCookie = setCookieHeader.find((c: string) => c.startsWith('oauth_state_strava='));
    expect(stateCookie).toBeDefined();
    expect(stateCookie).toContain('HttpOnly');
    expect(stateCookie?.toLowerCase()).toContain('samesite=lax');
  });

  it('redirects to settings with error when OAuth not configured', async () => {
    const { validateOAuthConfig } = await import('@/lib/integrations/oauth');
    vi.mocked(validateOAuthConfig).mockReturnValueOnce(false);

    const { GET } = await import('@/app/api/auth/strava/route');
    const response = await GET();

    expect(response.status).toBe(307);
    const location = response.headers.get('location') ?? '';
    expect(location).toContain('settings?error=strava_not_configured');
  });
});

describe('OAuth callback (/api/integrations/strava/callback)', () => {
  function makeRequest(params: Record<string, string>, cookies: Record<string, string> = {}) {
    const url = new URL('http://localhost:3000/api/integrations/strava/callback');
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    const req = new NextRequest(url);
    for (const [k, v] of Object.entries(cookies)) {
      req.cookies.set(k, v);
    }
    return req;
  }

  it('rejects requests with missing CSRF state', async () => {
    const { GET } = await import('@/app/api/integrations/strava/callback/route');
    const req = makeRequest({ code: 'auth-code' }); // no state param or cookie
    const response = await GET(req);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('error=strava_invalid_state');
  });

  it('rejects requests with mismatched CSRF state', async () => {
    const { GET } = await import('@/app/api/integrations/strava/callback/route');
    const req = makeRequest(
      { code: 'auth-code', state: 'attacker-state' },
      { oauth_state_strava: 'real-state' },
    );
    const response = await GET(req);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('error=strava_invalid_state');
  });

  it('rejects requests when OAuth provider returns error', async () => {
    const { GET } = await import('@/app/api/integrations/strava/callback/route');
    const req = makeRequest({ error: 'access_denied' });
    const response = await GET(req);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('error=strava_denied');
  });

  it('exchanges code for tokens and stores in httpOnly cookie', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_at: 1700000000,
        athlete: { id: 123 },
      }),
    });

    const { GET } = await import('@/app/api/integrations/strava/callback/route');
    const validState = 'matching-state-value';
    const req = makeRequest(
      { code: 'valid-auth-code', state: validState },
      { oauth_state_strava: validState },
    );
    const response = await GET(req);

    // Should redirect to settings with connected param
    expect(response.status).toBe(307);
    const location = response.headers.get('location') ?? '';
    expect(location).toContain('settings?connected=strava');
    // Should NOT include token in URL
    expect(location).not.toContain('token=');

    // Should set httpOnly token cookie
    const setCookieHeader = response.headers.getSetCookie();
    const tokenCookie = setCookieHeader.find((c: string) => c.startsWith('life-design-oauth-strava='));
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie).toContain('HttpOnly');

    // Should clear the CSRF state cookie
    const clearedState = setCookieHeader.find(
      (c: string) => c.startsWith('oauth_state_strava=') && c.includes('Max-Age=0'),
    );
    expect(clearedState).toBeDefined();
  });

  it('rejects when provider returns empty access_token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: '', refresh_token: 'r' }),
    });

    const { GET } = await import('@/app/api/integrations/strava/callback/route');
    const state = 'valid-state';
    const req = makeRequest(
      { code: 'valid-code', state },
      { oauth_state_strava: state },
    );
    const response = await GET(req);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('error=strava_failed');
  });

  it('handles token exchange failure gracefully', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, statusText: 'Bad Request' });

    const { GET } = await import('@/app/api/integrations/strava/callback/route');
    const state = 'valid-state';
    const req = makeRequest(
      { code: 'bad-code', state },
      { oauth_state_strava: state },
    );
    const response = await GET(req);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('error=strava_failed');
  });
});
