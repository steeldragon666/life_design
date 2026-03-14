/**
 * POST /api/disconnect/[provider]
 *
 * Revokes the OAuth connection for the given provider. This calls the
 * provider's token revocation endpoint, deletes the encrypted token row
 * from user_connections, and logs the disconnection event.
 *
 * Supported provider values: 'strava' | 'google_calendar'
 *
 * Response:
 *   302 redirect to /settings/connections?disconnected=<provider>
 *   302 redirect to /settings/connections?error=<reason> on failure
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { revokeTokens } from '@life-design/core';

const SUPPORTED_PROVIDERS = new Set(['strava', 'google_calendar', 'apple_health']);

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ provider: string }> },
): Promise<NextResponse> {
  const { provider } = await context.params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const redirectBase = `${appUrl}/settings/connections`;

  // Validate provider param to prevent injection / abuse.
  if (!SUPPORTED_PROVIDERS.has(provider)) {
    return NextResponse.redirect(`${redirectBase}?error=unknown_provider`);
  }

  // ── Auth check ──────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  try {
    await revokeTokens(supabase, { provider, userId: user.id });

    return NextResponse.redirect(`${redirectBase}?disconnected=${provider}`);
  } catch (err) {
    console.error(`Disconnect error for provider "${provider}":`, err);
    return NextResponse.redirect(`${redirectBase}?error=revoke_failed`);
  }
}
