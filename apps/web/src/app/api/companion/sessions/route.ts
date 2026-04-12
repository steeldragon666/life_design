/**
 * GET /api/companion/sessions?limit=20
 *
 * Returns the authenticated user's companion sessions ordered by most recent
 * first, with basic stats per session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// ── Supabase row shape ────────────────────────────────────────────────────────

interface CompanionSessionRow {
  id: string;
  user_id: string;
  started_at: string;
  message_count: number;
  input_tokens: number;
  output_tokens: number;
}

// ── Response shape ────────────────────────────────────────────────────────────

interface SessionSummary {
  id: string;
  startedAt: string;
  messageCount: number;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
}

// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse limit param — default 20, max 100
    const rawLimit = request.nextUrl.searchParams.get('limit');
    const limitParsed = rawLimit ? parseInt(rawLimit, 10) : 20;
    const limit =
      Number.isFinite(limitParsed) && limitParsed > 0
        ? Math.min(limitParsed, 100)
        : 20;

    const serviceClient = createServiceRoleClient();

    const { data, error } = await serviceClient
      .from('companion_sessions')
      .select('id, user_id, started_at, message_count, input_tokens, output_tokens')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(limit)
      .returns<CompanionSessionRow[]>();

    if (error) {
      console.error('[companion/sessions] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sessions: SessionSummary[] = (data ?? []).map((row) => ({
      id: row.id,
      startedAt: row.started_at,
      messageCount: row.message_count,
      tokensUsed: {
        input: row.input_tokens,
        output: row.output_tokens,
        total: row.input_tokens + row.output_tokens,
      },
    }));

    return NextResponse.json({ sessions, total: sessions.length });
  } catch (error) {
    console.error('[companion/sessions] Unhandled error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
