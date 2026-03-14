/**
 * GET /api/health
 *
 * Liveness and readiness probe for Vercel, uptime monitors, and internal
 * load-balancer health checks.
 *
 * Response shape:
 * ```json
 * {
 *   "status": "healthy" | "degraded" | "down",
 *   "checks": {
 *     "supabase": true | false,
 *     "config":   true | false
 *   },
 *   "timestamp": "2026-03-13T00:00:00.000Z"
 * }
 * ```
 *
 * HTTP status codes:
 *   200 — healthy (all checks pass)
 *   503 — down (critical dependency unavailable)
 *
 * The response is cached for 30 seconds via Cache-Control so that high-frequency
 * polling from uptime monitors does not hammer Supabase.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

type HealthStatus = 'healthy' | 'degraded' | 'down';

interface HealthChecks {
  supabase: boolean;
  config: boolean;
}

interface HealthResponse {
  status: HealthStatus;
  checks: HealthChecks;
  timestamp: string;
}

// ─── Required env vars ────────────────────────────────────────────────────────

/**
 * The minimal set of variables required for the app to serve any request.
 * Monitoring vars are excluded — their absence is degraded, not down.
 */
const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'GOOGLE_AI_API_KEY',
  'ENCRYPTION_KEY',
  'NEXT_PUBLIC_APP_URL',
] as const;

// ─── Checks ──────────────────────────────────────────────────────────────────

/**
 * Verifies that all critical environment variables are non-empty.
 *
 * @returns `true` if every required variable is present, `false` otherwise.
 */
function checkConfig(): boolean {
  return REQUIRED_VARS.every((name) => {
    const value = process.env[name];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

/**
 * Performs a minimal read against Supabase to verify the connection is live.
 * Uses the service-role key so the probe is not affected by RLS policies.
 *
 * Queries a single row from `entitlements` — a small, static table that is
 * always populated after migrations run.
 *
 * @returns `true` if the query succeeds, `false` on any error.
 */
async function checkSupabase(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return false;

  try {
    const client = createClient(url, key, {
      auth: { persistSession: false },
    });

    const { error } = await client
      .from('entitlements')
      .select('id')
      .limit(1)
      .single();

    // PGRST116 = no rows found — table exists but is empty; treat as healthy.
    if (error && error.code !== 'PGRST116') {
      console.error('[health] Supabase check failed:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[health] Supabase check threw:', err);
    return false;
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

/**
 * Health check endpoint handler.
 *
 * Runs all checks in parallel for minimum latency, then derives the overall
 * status from the results.
 */
export async function GET(): Promise<NextResponse<HealthResponse>> {
  const [supabaseOk, configOk] = await Promise.all([
    checkSupabase(),
    Promise.resolve(checkConfig()),
  ]);

  const checks: HealthChecks = {
    supabase: supabaseOk,
    config: configOk,
  };

  const status: HealthStatus = !configOk || !supabaseOk ? 'down' : 'healthy';

  const body: HealthResponse = {
    status,
    checks,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    status: status === 'down' ? 503 : 200,
    headers: {
      // Cache for 30 seconds; stale-while-revalidate lets monitors receive
      // a fast cached response while a fresh check runs in the background.
      'Cache-Control': 'public, max-age=30, stale-while-revalidate=30',
    },
  });
}
