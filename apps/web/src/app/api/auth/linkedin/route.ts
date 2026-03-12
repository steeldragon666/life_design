import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  
  const clientId = process.env.LINKEDIN_CLIENT_ID ?? '';
  const state = randomBytes(16).toString('hex');
  const redirectUri = `${appUrl}/api/integrations/linkedin/callback`;
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email r_basicprofile r_liteprofile',
    state,
  });
  
  const url = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  return NextResponse.redirect(url);
}
