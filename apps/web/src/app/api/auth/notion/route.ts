import { NextResponse } from 'next/server';
import { NOTION_CONFIG } from '@/lib/integrations/oauth';
import { randomBytes } from 'crypto';

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  
  const state = randomBytes(16).toString('hex');
  const redirectUri = `${appUrl}/api/integrations/notion/callback`;
  
  const params = new URLSearchParams({
    client_id: NOTION_CONFIG.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
  });
  
  const url = `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
  return NextResponse.redirect(url);
}
