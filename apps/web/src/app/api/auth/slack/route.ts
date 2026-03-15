import { NextResponse } from 'next/server';
import { buildAuthorizationUrl, SLACK_CONFIG, validateOAuthConfig } from '@/lib/integrations/oauth';
import { randomBytes } from 'crypto';

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  // Validate OAuth configuration
  if (!validateOAuthConfig(SLACK_CONFIG)) {
    console.error('Slack OAuth not configured. Please set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET environment variables.');
    return NextResponse.redirect(`${appUrl}/settings?error=slack_not_configured`);
  }

  const state = randomBytes(16).toString('hex');
  const redirectUri = `${appUrl}/api/integrations/slack/callback`;
  const url = buildAuthorizationUrl(SLACK_CONFIG, redirectUri, state);

  const response = NextResponse.redirect(url);
  response.cookies.set('oauth_state_slack', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10, // 10 minutes
  });
  return response;
}
