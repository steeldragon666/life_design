import { NextResponse } from 'next/server';
import { STRAVA_CONFIG, validateOAuthConfig } from '@/lib/integrations/oauth';
import { randomBytes } from 'crypto';

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  
  // Validate OAuth configuration
  if (!validateOAuthConfig(STRAVA_CONFIG)) {
    console.error('Strava OAuth not configured. Please set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET environment variables.');
    return NextResponse.redirect(`${appUrl}/settings?error=strava_not_configured`);
  }
  
  const state = randomBytes(16).toString('hex');
  const redirectUri = `${appUrl}/api/integrations/strava/callback`;
  
  const params = new URLSearchParams({
    client_id: STRAVA_CONFIG.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: STRAVA_CONFIG.scopes.join(','),
    state,
  });
  
  const url = `https://www.strava.com/oauth/authorize?${params.toString()}`;
  const response = NextResponse.redirect(url);
  response.cookies.set('oauth_state_strava', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10, // 10 minutes
  });
  return response;
}
