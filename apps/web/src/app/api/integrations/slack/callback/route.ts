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

    // For guest mode, redirect with tokens in URL
    const tokenData = encodeURIComponent(JSON.stringify({
      provider: 'slack',
      access_token: data.access_token,
      team_id: data.team?.id,
      team_name: data.team?.name,
      scope: data.scope,
    }));

    return NextResponse.redirect(`${appUrl}/settings?connected=slack&token=${tokenData}`);
  } catch (err) {
    console.error('Slack callback error:', err);
    return NextResponse.redirect(`${appUrl}/settings?error=slack_failed`);
  }
}
