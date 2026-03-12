import { NextRequest, NextResponse } from 'next/server';
import { GOOGLE_CONFIG, GOOGLE_SCOPES, validateOAuthConfig } from '@/lib/integrations/oauth';
import { randomBytes } from 'crypto';

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const scope = request.nextUrl.searchParams.get('scope') ?? 'google_calendar';

  // Validate OAuth configuration
  if (!validateOAuthConfig(GOOGLE_CONFIG)) {
    console.error('Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
    return NextResponse.redirect(`${appUrl}/settings?error=google_not_configured`);
  }

  const scopes = GOOGLE_SCOPES[scope] ?? GOOGLE_SCOPES.google_calendar;
  const state = `${scope}:${randomBytes(16).toString('hex')}`;
  const redirectUri = `${appUrl}/api/integrations/google/callback`;

  const params = new URLSearchParams({
    client_id: GOOGLE_CONFIG.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    state,
    access_type: 'offline',
    prompt: 'consent',
  });

  return NextResponse.redirect(`${GOOGLE_CONFIG.authUrl}?${params.toString()}`);
}
