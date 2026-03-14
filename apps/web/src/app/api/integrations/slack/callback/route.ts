import { NextRequest, NextResponse } from 'next/server';
import { SLACK_CONFIG } from '@/lib/integrations/oauth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/settings?error=slack_denied`);
  }

  // Validate CSRF state
  const state = searchParams.get('state');
  const expectedState = request.cookies.get('oauth_state_slack')?.value;
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${appUrl}/settings?error=slack_invalid_state`);
  }

  try {
    const redirectUri = `${appUrl}/api/integrations/slack/callback`;
    
    // Slack OAuth v2 token exchange
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: SLACK_CONFIG.clientId,
        client_secret: SLACK_CONFIG.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    if (typeof data.access_token !== 'string' || !data.access_token) {
      throw new Error('slack returned no access token');
    }

    const tokenPayload = {
      provider: 'slack',
      access_token: data.access_token,
      team_id: data.team?.id,
      team_name: data.team?.name,
      scope: data.scope,
    };
    const encodedToken = Buffer.from(JSON.stringify(tokenPayload), 'utf8').toString('base64url');
    const redirectResponse = NextResponse.redirect(`${appUrl}/settings?connected=slack`);
    redirectResponse.cookies.set('life-design-oauth-slack', encodedToken, {
      httpOnly: true,
      secure: request.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 5,
    });
    // Clear the CSRF state cookie
    redirectResponse.cookies.set('oauth_state_slack', '', { path: '/', maxAge: 0 });
    return redirectResponse;
  } catch (err) {
    console.error('Slack callback error:', err);
    return NextResponse.redirect(`${appUrl}/settings?error=slack_failed`);
  }
}
