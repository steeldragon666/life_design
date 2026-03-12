import { NextRequest, NextResponse } from 'next/server';
import { STRAVA_CONFIG } from '@/lib/integrations/oauth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/settings?error=strava_denied`);
  }

  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: STRAVA_CONFIG.clientId,
        client_secret: STRAVA_CONFIG.clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const tokens = await response.json();
    
    const tokenData = encodeURIComponent(JSON.stringify({
      provider: 'strava',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at * 1000,
      athlete: tokens.athlete,
    }));

    return NextResponse.redirect(`${appUrl}/settings?connected=strava&token=${tokenData}`);
  } catch (err) {
    console.error('Strava callback error:', err);
    return NextResponse.redirect(`${appUrl}/settings?error=strava_failed`);
  }
}
