/**
 * GET /api/integrations/strava/callback
 *
 * Handles Strava OAuth2 callback: validates CSRF state, exchanges code for
 * tokens, and persists encrypted tokens to the database.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { exchangeStravaCode, storeTokens } from '@life-design/core';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/settings?error=strava_denied`);
  }

  // ── CSRF state validation ────────────────────────────────────────────────
  const state = searchParams.get('state');
  const expectedState = request.cookies.get('oauth_state_strava')?.value;
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${appUrl}/settings?error=strava_invalid_state`);
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
    // ── Token exchange via @life-design/core ────────────────────────────────
    const tokens = await exchangeStravaCode(code);

    // ── Persist encrypted tokens to Supabase ───────────────────────────────
    const serviceSupabase = createServiceRoleClient();
    await storeTokens(
      serviceSupabase,
      { provider: 'strava', userId: user.id },
      {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      },
    );

    const response = NextResponse.redirect(`${appUrl}/settings?connected=strava`);
    // Clear the CSRF state cookie
    response.cookies.set('oauth_state_strava', '', { path: '/', maxAge: 0 });
    return response;
  } catch (err) {
    console.error('Strava callback error:', err);
    return NextResponse.redirect(`${appUrl}/settings?error=strava_failed`);
  }
}
