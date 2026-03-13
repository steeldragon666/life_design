/**
 * GET /api/connect/strava
 *
 * Initiates the Strava OAuth2 flow. Generates a CSRF state token, stores it
 * in a short-lived HTTP-only cookie, and redirects the user to the Strava
 * authorisation page.
 *
 * The state token is validated in the callback handler to prevent CSRF attacks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createClient } from '@/lib/supabase/server';

function getStravaAuthUrl(state: string): string {
  const clientId = process.env.STRAVA_CLIENT_ID;
  if (!clientId) throw new Error('STRAVA_CLIENT_ID is not configured');
  const redirectUri = process.env.STRAVA_REDIRECT_URI ?? `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/integrations/strava/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read',
    state,
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

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
    const authUrl = getStravaAuthUrl(state);

    const response = NextResponse.redirect(authUrl);

    // Store the state token in a secure, HTTP-only cookie for validation in
    // the callback. SameSite=Lax is sufficient here because the callback
    // redirects back from the provider.
    response.cookies.set('strava_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: STATE_COOKIE_MAX_AGE_SECONDS,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Strava OAuth initiation error:', err);
    return NextResponse.redirect(
      `${appUrl}/settings/connections?error=config_error`,
    );
  }
}
