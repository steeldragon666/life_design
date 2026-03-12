import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/settings?error=linkedin_denied`);
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
    
    const tokenData = encodeURIComponent(JSON.stringify({
      provider: 'linkedin',
      access_token: tokens.access_token,
      expires_at: Date.now() + (tokens.expires_in * 1000),
    }));

    return NextResponse.redirect(`${appUrl}/settings?connected=linkedin&token=${tokenData}`);
  } catch (err) {
    console.error('LinkedIn callback error:', err);
    return NextResponse.redirect(`${appUrl}/settings?error=linkedin_failed`);
  }
}
