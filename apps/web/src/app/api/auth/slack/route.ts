import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildAuthorizationUrl, SLACK_CONFIG } from '@/lib/integrations/oauth';
import { randomBytes } from 'crypto';

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  const state = randomBytes(16).toString('hex');
  const redirectUri = `${appUrl}/api/integrations/slack/callback`;
  const url = buildAuthorizationUrl(SLACK_CONFIG, redirectUri, state);

  return NextResponse.redirect(url);
}
