/**
 * GET /api/connect/strava/callback
 *
 * Handles the Strava OAuth2 callback after the user grants access.
 *
 * Validation steps:
 *  1. Verify auth session exists.
 *  2. Validate CSRF state token against the cookie set during initiation.
 *  3. Exchange the authorisation code for tokens.
 *  4. Encrypt and store tokens via the OAuth manager.
 *  5. Redirect to /settings/connections.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeStravaCode } from '@life-design/core';
import { storeTokens } from '@life-design/core';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const redirectBase = `${appUrl}/settings/connections`;

  // User denied access on the Strava side.
  if (errorParam || !code) {
    return NextResponse.redirect(`${redirectBase}?error=auth_denied`);
  }

  // ── Auth check ─────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  // ── CSRF state validation ──────────────────────────────────────────────────
  const storedState = request.cookies.get('strava_oauth_state')?.value;
  if (!storedState || storedState !== state) {
    console.warn(`Strava callback: CSRF state mismatch for user ${user.id}`);
    return NextResponse.redirect(`${redirectBase}?error=state_mismatch`);
  }

  try {
    // ── Token exchange ─────────────────────────────────────────────────────
    const tokens = await exchangeStravaCode(code);

    // ── Store encrypted tokens ─────────────────────────────────────────────
    // Use the service role client for writes to bypass RLS on user_connections.
    const { createClient: createServiceClient } = await import('@/lib/supabase/server');
    const serviceSupabase = await createServiceClient();

    await storeTokens(
      serviceSupabase,
      { provider: 'strava', userId: user.id },
      {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      },
    );

    // Clear the state cookie now that it has been consumed.
    const response = NextResponse.redirect(`${redirectBase}?connected=strava`);
    response.cookies.delete('strava_oauth_state');
    return response;
  } catch (err) {
    console.error('Strava OAuth callback error:', err);
    return NextResponse.redirect(`${redirectBase}?error=exchange_failed`);
  }
}
