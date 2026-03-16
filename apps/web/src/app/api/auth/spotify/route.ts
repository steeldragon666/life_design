import { NextResponse } from 'next/server';
import { SPOTIFY_CONFIG, validateOAuthConfig } from '@/lib/integrations/oauth';
import { randomBytes } from 'crypto';

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  
  // Validate OAuth configuration
  if (!validateOAuthConfig(SPOTIFY_CONFIG)) {
    console.error('Spotify OAuth not configured. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.');
    return NextResponse.redirect(`${appUrl}/settings?error=spotify_not_configured`);
  }
  
  const state = randomBytes(16).toString('hex');
  const redirectUri = `${appUrl}/api/integrations/spotify/callback`;
  
  const params = new URLSearchParams({
    client_id: SPOTIFY_CONFIG.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SPOTIFY_CONFIG.scopes.join(' '),
    state,
  });
  
  const url = `https://accounts.spotify.com/authorize?${params.toString()}`;
  const response = NextResponse.redirect(url);
  response.cookies.set('oauth_state_spotify', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10, // 10 minutes
  });
  return response;
}
