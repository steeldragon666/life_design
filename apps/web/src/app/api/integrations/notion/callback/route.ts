import { NextRequest, NextResponse } from 'next/server';
import { NOTION_CONFIG } from '@/lib/integrations/oauth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/settings?error=notion_denied`);
  }

  try {
    const redirectUri = `${appUrl}/api/integrations/notion/callback`;
    
    // Notion uses Basic auth
    const auth = Buffer.from(`${NOTION_CONFIG.clientId}:${NOTION_CONFIG.clientSecret}`).toString('base64');
    
    const response = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const tokens = await response.json();
    
    const tokenData = encodeURIComponent(JSON.stringify({
      provider: 'notion',
      access_token: tokens.access_token,
      workspace_id: tokens.workspace_id,
      workspace_name: tokens.workspace_name,
    }));

    return NextResponse.redirect(`${appUrl}/settings?connected=notion&token=${tokenData}`);
  } catch (err) {
    console.error('Notion callback error:', err);
    return NextResponse.redirect(`${appUrl}/settings?error=notion_failed`);
  }
}
