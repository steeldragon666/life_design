import { NextResponse } from 'next/server';
import { buildAuthorizationUrl, INSTAGRAM_CONFIG, validateOAuthConfig } from '@/lib/integrations/oauth';
import { randomBytes } from 'crypto';

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  // Validate OAuth configuration
  if (!validateOAuthConfig(INSTAGRAM_CONFIG)) {
    console.error('Instagram OAuth not configured. Please set INSTAGRAM_CLIENT_ID and INSTAGRAM_CLIENT_SECRET environment variables.');
    return NextResponse.redirect(`${appUrl}/settings?error=instagram_not_configured`);
  }

  const state = randomBytes(16).toString('hex');
  const redirectUri = `${appUrl}/api/integrations/instagram/callback`;
  const url = buildAuthorizationUrl(INSTAGRAM_CONFIG, redirectUri, state);

  return NextResponse.redirect(url);
}
