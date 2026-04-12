'use server';

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

interface CompanionMessageResult {
  text: string | null;
  sessionId: string | null;
  safetyTier: number | null;
  error: string | null;
}

export async function sendCompanionMessage(
  message: string,
  sessionId: string | null,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>,
): Promise<CompanionMessageResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { text: null, sessionId: null, safetyTier: null, error: 'Not authenticated' };
  }

  try {
    // Get the origin from headers for internal fetch
    const headersList = await headers();
    const host = headersList.get('host') ?? 'localhost:3000';
    const protocol = headersList.get('x-forwarded-proto') ?? 'http';
    const origin = `${protocol}://${host}`;

    // Forward cookies for auth
    const cookieHeader = headersList.get('cookie') ?? '';

    const response = await fetch(`${origin}/api/companion/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        message,
        sessionId: sessionId ?? undefined,
        conversationHistory,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return {
        text: null,
        sessionId: null,
        safetyTier: null,
        error: (errorData as { error?: string }).error ?? `HTTP ${response.status}`,
      };
    }

    const data = await response.json() as {
      text: string;
      sessionId: string;
      safetyTier: number;
      modelUsed: string;
    };

    return {
      text: data.text,
      sessionId: data.sessionId,
      safetyTier: data.safetyTier,
      error: null,
    };
  } catch (err) {
    console.error('[companion/action] Error:', err);
    return {
      text: null,
      sessionId: null,
      safetyTier: null,
      error: err instanceof Error ? err.message : 'Failed to reach companion',
    };
  }
}
