import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestChatText } from '@/lib/chat-client';

describe('chat-client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns text for successful chat response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ text: 'Hello from mentor' }),
      }),
    );

    const result = await requestChatText({
      payload: { message: 'hello' },
      fallbackText: 'fallback',
    });

    expect(result.text).toBe('Hello from mentor');
    expect(result.degraded).toBe(false);
  });

  it('returns fallback with timeout classification on timeout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Request timed out after 20000ms')),
    );

    const result = await requestChatText({
      payload: { message: 'hello' },
      fallbackText: 'fallback text',
    });

    expect(result.text).toBe('fallback text');
    expect(result.degraded).toBe(true);
    expect(result.reason).toBe('timeout');
  });

  it('returns fallback with network classification for non-timeout failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
      }),
    );

    const result = await requestChatText({
      payload: { message: 'hello' },
      fallbackText: 'fallback text',
    });

    expect(result.text).toBe('fallback text');
    expect(result.degraded).toBe(true);
    expect(result.reason).toBe('network');
  });
});
