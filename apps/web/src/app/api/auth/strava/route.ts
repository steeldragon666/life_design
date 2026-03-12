import { NextResponse } from 'next/server';
import { STRAVA_CONFIG } from '@/lib/integrations/oauth';
import { randomBytes } from 'crypto';

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  
  const state = randomBytes(16).toString('hex');
  const redirectUri = `${appUrl}/api/integrations/strava/callback`;
  
  const params = new URLSearchParams({
    client_id: STRAVA_CONFIG.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: STRAVA_CONFIG.scopes.join(','),
    state,
  });
  
  const url = `https://www.strava.com/oauth/authorize?${params.toString()}`;
  return NextResponse.redirect(url);
}
