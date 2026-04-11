/**
 * GET /api/connect/google/callback
 *
 * Handles the Google OAuth2 callback after the user grants calendar access.
 *
 * Validation steps:
 *  1. Verify auth session exists.
 *  2. Validate CSRF state token against the cookie set during initiation.
 *  3. Exchange the authorisation code for tokens.
 *  4. Encrypt and store tokens via the OAuth manager.
 *  5. Redirect to /settings/connections.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { exchangeGoogleCode } from '@life-design/core';
import { storeTokens } from '@life-design/core';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const redirectBase = `${appUrl}/settings/connections`;

  // User denied access on the Google side.
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
  const storedState = request.cookies.get('google_oauth_state')?.value;
  if (!storedState || storedState !== state) {
    console.warn(`Google callback: CSRF state mismatch for user ${user.id}`);
    return NextResponse.redirect(`${redirectBase}?error=state_mismatch`);
  }

  try {
    // ── Token exchange ─────────────────────────────────────────────────────
    const tokens = await exchangeGoogleCode(code);

    // ── Store encrypted tokens ─────────────────────────────────────────────
    // Use the service role client — user_connections INSERT requires service_role
    // (RLS intentionally restricts authenticated users to SELECT/DELETE only).
    const serviceSupabase = createServiceRoleClient();

    await storeTokens(
      serviceSupabase,
      { provider: 'google_calendar', userId: user.id },
      {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      },
    );

    const response = NextResponse.redirect(`${redirectBase}?connected=google_calendar`);
    response.cookies.delete('google_oauth_state');
    return response;
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(`${redirectBase}?error=exchange_failed`);
  }
}
