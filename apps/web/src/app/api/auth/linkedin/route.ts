import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  
  const clientId = process.env.LINKEDIN_CLIENT_ID ?? '';
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET ?? '';
  
  // Validate OAuth configuration
  if (!clientId || !clientSecret) {
    console.error('LinkedIn OAuth not configured. Please set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET environment variables.');
    return NextResponse.redirect(`${appUrl}/settings?error=linkedin_not_configured`);
  }
  
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
