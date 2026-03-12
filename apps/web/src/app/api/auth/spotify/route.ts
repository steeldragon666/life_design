import { NextResponse } from 'next/server';
import { SPOTIFY_CONFIG } from '@/lib/integrations/oauth';
import { randomBytes } from 'crypto';

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  
  const state = randomBytes(16).toString('hex');
  const redirectUri = `${appUrl}/api/integrations/spotify/callback`;
  
  const params = new URLSearchParams({
    client_id: SPOTIFY_CONFIG.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SPOTIFY_CONFIG.scopes.join(' '),
    state,
  });
  
  const url = `https://accounts.spotify.com/authorize?${params.toString()}`;
  return NextResponse.redirect(url);
}
