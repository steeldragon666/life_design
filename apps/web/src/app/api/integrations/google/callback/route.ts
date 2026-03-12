import { NextRequest, NextResponse } from 'next/server';
import { GOOGLE_CONFIG } from '@/lib/integrations/oauth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state') ?? '';

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/settings?error=google_denied`);
  }

  // State format: "scope:random" — extract which Google service was requested
  const provider = state.split(':')[0] || 'google';

  try {
    const redirectUri = `${appUrl}/api/integrations/google/callback`;
    
    // Google token exchange
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CONFIG.clientId,
        client_secret: GOOGLE_CONFIG.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const tokens = await response.json();

    // For guest mode, redirect with tokens in URL
    const tokenData = encodeURIComponent(JSON.stringify({
      provider: provider,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + (tokens.expires_in * 1000),
      scope: tokens.scope,
    }));

    return NextResponse.redirect(`${appUrl}/settings?connected=${provider}&token=${tokenData}`);
  } catch (err) {
    console.error('Google callback error:', err);
    return NextResponse.redirect(`${appUrl}/settings?error=google_failed`);
  }
}
