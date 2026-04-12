/**
 * GET /api/integrations/spotify/callback
 *
 * Handles Spotify OAuth2 callback: validates CSRF state, exchanges code for
 * tokens, and persists encrypted tokens to the database.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { SPOTIFY_CONFIG } from '@/lib/integrations/oauth';
import { storeTokens } from '@life-design/core';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/settings?error=spotify_denied`);
  }

  // ── CSRF state validation ────────────────────────────────────────────────
  const state = searchParams.get('state');
  const expectedState = request.cookies.get('oauth_state_spotify')?.value;
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${appUrl}/settings?error=spotify_invalid_state`);
  }

  // ── Auth check ───────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login?from=/settings`);
  }

  try {
    const redirectUri = `${appUrl}/api/integrations/spotify/callback`;

    // Spotify uses Basic auth for token exchange
    const auth = Buffer.from(
      `${SPOTIFY_CONFIG.clientId}:${SPOTIFY_CONFIG.clientSecret}`,
    ).toString('base64');

    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
    }

    const tokens = await tokenResponse.json();

    if (typeof tokens.access_token !== 'string' || !tokens.access_token) {
      throw new Error('Spotify returned no access token');
    }

    // ── Persist encrypted tokens to Supabase ───────────────────────────────
    const expiresAtSeconds = Math.floor(Date.now() / 1000) + (tokens.expires_in ?? 3600);

    const serviceSupabase = createServiceRoleClient();
    await storeTokens(
      serviceSupabase,
      { provider: 'spotify', userId: user.id },
      {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: expiresAtSeconds,
      },
    );

    const response = NextResponse.redirect(`${appUrl}/settings?connected=spotify`);
    // Clear the CSRF state cookie
    response.cookies.set('oauth_state_spotify', '', { path: '/', maxAge: 0 });
    return response;
  } catch (err) {
    console.error('Spotify callback error:', err);
    return NextResponse.redirect(`${appUrl}/settings?error=spotify_failed`);
  }
}
