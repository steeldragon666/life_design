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
    
    // For guest mode, redirect with tokens in URL (will be stored in localStorage by client)
    // In production, you'd want to use a more secure method
    const tokenData = encodeURIComponent(JSON.stringify({
      provider: 'spotify',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + (tokens.expires_in * 1000),
    }));

    return NextResponse.redirect(`${appUrl}/settings?connected=spotify&token=${tokenData}`);
  } catch (err) {
    console.error('Spotify callback error:', err);
    return NextResponse.redirect(`${appUrl}/settings?error=spotify_failed`);
  }
}
