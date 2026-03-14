/**
 * GET /api/connect/google
 *
 * Initiates the Google Calendar OAuth2 flow. Generates a CSRF state token,
 * stores it in a short-lived HTTP-only cookie, and redirects the user to
 * the Google authorisation page requesting `calendar.readonly` scope with
 * offline access.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { getGoogleAuthUrl } from '@life-design/core';

/** Duration in seconds for the CSRF state cookie (10 minutes). */
const STATE_COOKIE_MAX_AGE_SECONDS = 600;

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  // Verify the user is authenticated before starting the OAuth flow.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  // Generate a cryptographically random CSRF state token.
  const state = randomBytes(32).toString('hex');

  try {
    const authUrl = getGoogleAuthUrl(state);

    const response = NextResponse.redirect(authUrl);

    response.cookies.set('google_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: STATE_COOKIE_MAX_AGE_SECONDS,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Google OAuth initiation error:', err);
    return NextResponse.redirect(
      `${appUrl}/settings/connections?error=config_error`,
    );
  }
}
