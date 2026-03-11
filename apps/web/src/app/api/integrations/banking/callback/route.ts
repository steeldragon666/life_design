import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForTokens, OPENBANKING_CONFIG } from '@/lib/integrations/oauth';
import { connectIntegration } from '@/lib/services/integration-service';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/settings?error=auth_denied`);
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${appUrl}/login`);
    }

    const redirectUri = `${appUrl}/api/integrations/banking/callback`;
    const tokens = await exchangeCodeForTokens(OPENBANKING_CONFIG, code, redirectUri);

    await connectIntegration(
      user.id,
      'banking',
      tokens.access_token,
      tokens.refresh_token,
    );

    return NextResponse.redirect(`${appUrl}/settings?connected=banking`);
  } catch (err) {
    console.error('Open Banking callback error:', err);
    return NextResponse.redirect(`${appUrl}/settings?error=exchange_failed`);
  }
}
