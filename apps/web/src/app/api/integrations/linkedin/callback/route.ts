import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/settings?error=linkedin_denied`);
  }

  // Validate CSRF state
  const state = searchParams.get('state');
  const expectedState = request.cookies.get('oauth_state_linkedin')?.value;
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${appUrl}/settings?error=linkedin_invalid_state`);
  }

  try {
    const clientId = process.env.LINKEDIN_CLIENT_ID ?? '';
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET ?? '';
    const redirectUri = `${appUrl}/api/integrations/linkedin/callback`;
    
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const tokens = await response.json();

    if (typeof tokens.access_token !== 'string' || !tokens.access_token) {
      throw new Error('linkedin returned no access token');
    }

    const tokenPayload = {
      provider: 'linkedin',
      access_token: tokens.access_token,
      expires_at: Date.now() + (tokens.expires_in * 1000),
    };
    const encodedToken = Buffer.from(JSON.stringify(tokenPayload), 'utf8').toString('base64url');
    const redirectResponse = NextResponse.redirect(`${appUrl}/settings?connected=linkedin`);
    redirectResponse.cookies.set('life-design-oauth-linkedin', encodedToken, {
      httpOnly: true,
      secure: request.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 5,
    });
    // Clear the CSRF state cookie
    redirectResponse.cookies.set('oauth_state_linkedin', '', { path: '/', maxAge: 0 });
    return redirectResponse;
  } catch (err) {
    console.error('LinkedIn callback error:', err);
    return NextResponse.redirect(`${appUrl}/settings?error=linkedin_failed`);
  }
}
