import { NextRequest, NextResponse } from 'next/server';
import { SPOTIFY_CONFIG } from '@/lib/integrations/oauth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/settings?error=spotify_denied`);
  }

  // Validate CSRF state
  const state = searchParams.get('state');
  const expectedState = request.cookies.get('oauth_state_spotify')?.value;
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${appUrl}/settings?error=spotify_invalid_state`);
  }

  try {
    const redirectUri = `${appUrl}/api/integrations/spotify/callback`;
    
    // Spotify uses Basic auth
    const auth = Buffer.from(`${SPOTIFY_CONFIG.clientId}:${SPOTIFY_CONFIG.clientSecret}`).toString('base64');
    
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const tokens = await response.json();

    if (typeof tokens.access_token !== 'string' || !tokens.access_token) {
      throw new Error('spotify returned no access token');
    }

    const tokenPayload = {
      provider: 'spotify',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + (tokens.expires_in * 1000),
    };
    const encodedToken = Buffer.from(JSON.stringify(tokenPayload), 'utf8').toString('base64url');
    const redirectResponse = NextResponse.redirect(`${appUrl}/settings?connected=spotify`);
    redirectResponse.cookies.set('life-design-oauth-spotify', encodedToken, {
      httpOnly: true,
      secure: request.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 5,
    });
    // Clear the CSRF state cookie
    redirectResponse.cookies.set('oauth_state_spotify', '', { path: '/', maxAge: 0 });
    return redirectResponse;
  } catch (err) {
    console.error('Spotify callback error:', err);
    return NextResponse.redirect(`${appUrl}/settings?error=spotify_failed`);
  }
}
