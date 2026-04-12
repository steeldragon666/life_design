/**
 * GET /api/integrations/google/callback
 *
 * Handles Google OAuth2 callback: validates CSRF state, exchanges code for
 * tokens, and persists encrypted tokens to the database.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { exchangeGoogleCode, storeTokens } from '@life-design/core';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state') ?? '';

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/settings?error=google_denied`);
  }

  // ── CSRF state validation ────────────────────────────────────────────────
  const expectedState = request.cookies.get('oauth_state_google')?.value;
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${appUrl}/settings?error=google_invalid_state`);
  }

  // State format: "scope:random" — extract which Google service was requested
  const provider = state.split(':')[0] || 'google';

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
    const tokens = await exchangeGoogleCode(code);

    // ── Persist encrypted tokens to Supabase ───────────────────────────────
    const serviceSupabase = createServiceRoleClient();
    await storeTokens(
      serviceSupabase,
      { provider, userId: user.id },
      {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      },
    );

    const response = NextResponse.redirect(`${appUrl}/settings?connected=${provider}`);
    // Clear the CSRF state cookie
    response.cookies.set('oauth_state_google', '', { path: '/', maxAge: 0 });
    return response;
  } catch (err) {
    console.error('Google callback error:', err);
    return NextResponse.redirect(`${appUrl}/settings?error=google_failed`);
  }
}
