import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GOOGLE_CONFIG, GOOGLE_SCOPES } from '@/lib/integrations/oauth';
import { randomBytes } from 'crypto';

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const scope = request.nextUrl.searchParams.get('scope') ?? 'google_calendar';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login`);
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
