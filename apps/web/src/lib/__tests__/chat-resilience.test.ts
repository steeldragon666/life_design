import { describe, expect, it, vi } from 'vitest';
import { createAssistantFallbackMessage, fetchWithTimeout } from '@/lib/chat-resilience';

describe('chat-resilience', () => {
  it('returns context-safe fallback copy', () => {
    expect(createAssistantFallbackMessage('onboarding')).toMatch(/ready to continue/i);
    expect(createAssistantFallbackMessage('default')).toMatch(/I'm here/i);
  });

  it('throws a timeout error when request exceeds threshold', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn(async (_input, init) => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      if ((init?.signal as AbortSignal | undefined)?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      return new Response('{}', { status: 200 });
    }) as typeof fetch;

    await expect(fetchWithTimeout('/api/chat', { method: 'POST' }, 1)).rejects.toThrow(
      /timed out/i,
    );

    global.fetch = originalFetch;
  });

  it('resolves successfully when fetch returns in time', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn(async () => new Response('{"ok":true}', { status: 200 })) as typeof fetch;

    const response = await fetchWithTimeout('/api/chat', { method: 'POST' }, 100);
    expect(response.ok).toBe(true);

    global.fetch = originalFetch;
  });
});
