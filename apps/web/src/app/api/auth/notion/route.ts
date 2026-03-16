import { NextResponse } from 'next/server';
import { NOTION_CONFIG, validateOAuthConfig } from '@/lib/integrations/oauth';
import { randomBytes } from 'crypto';

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  
  // Validate OAuth configuration
  if (!validateOAuthConfig(NOTION_CONFIG)) {
    console.error('Notion OAuth not configured. Please set NOTION_CLIENT_ID and NOTION_CLIENT_SECRET environment variables.');
    return NextResponse.redirect(`${appUrl}/settings?error=notion_not_configured`);
  }
  
  const state = randomBytes(16).toString('hex');
  const redirectUri = `${appUrl}/api/integrations/notion/callback`;
  
  const params = new URLSearchParams({
    client_id: NOTION_CONFIG.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
  });
  
  const url = `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
  const response = NextResponse.redirect(url);
  response.cookies.set('oauth_state_notion', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10, // 10 minutes
  });
  return response;
}
