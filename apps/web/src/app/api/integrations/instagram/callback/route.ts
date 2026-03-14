import { NextRequest, NextResponse } from 'next/server';
import { INSTAGRAM_CONFIG } from '@/lib/integrations/oauth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/settings?error=instagram_denied`);
  }

  // Validate CSRF state
  const state = searchParams.get('state');
  const expectedState = request.cookies.get('oauth_state_instagram')?.value;
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${appUrl}/settings?error=instagram_invalid_state`);
  }

  try {
    // Instagram uses form-encoded POST for token exchange
    const redirectUri = `${appUrl}/api/integrations/instagram/callback`;
    const response = await fetch(INSTAGRAM_CONFIG.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: INSTAGRAM_CONFIG.clientId,
        client_secret: INSTAGRAM_CONFIG.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const tokens = await response.json();

    if (typeof tokens.access_token !== 'string' || !tokens.access_token) {
      throw new Error('instagram returned no access token');
    }

    // Exchange short-lived token for long-lived token
    const longLivedRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${INSTAGRAM_CONFIG.clientSecret}&access_token=${tokens.access_token}`,
    );

    const longLived = longLivedRes.ok ? await longLivedRes.json() : tokens;

    const tokenPayload = {
      provider: 'instagram',
      access_token: longLived.access_token ?? tokens.access_token,
      expires_at: longLived.expires_in ? Date.now() + (longLived.expires_in * 1000) : undefined,
      user_id: tokens.user_id,
    };
    const encodedToken = Buffer.from(JSON.stringify(tokenPayload), 'utf8').toString('base64url');
    const redirectResponse = NextResponse.redirect(`${appUrl}/settings?connected=instagram`);
    redirectResponse.cookies.set('life-design-oauth-instagram', encodedToken, {
      httpOnly: true,
      secure: request.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 5,
    });
    // Clear the CSRF state cookie
    redirectResponse.cookies.set('oauth_state_instagram', '', { path: '/', maxAge: 0 });
    return redirectResponse;
  } catch (err) {
    console.error('Instagram callback error:', err);
    return NextResponse.redirect(`${appUrl}/settings?error=instagram_failed`);
  }
}
