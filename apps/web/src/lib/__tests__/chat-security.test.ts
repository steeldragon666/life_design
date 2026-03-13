import { describe, expect, it, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  __unsafeGetChatRateLimitStoreSize,
  __unsafeResetChatRateLimitStore,
  applyChatRateLimit,
  validateAndNormalizeChatMetadata,
  validateAndNormalizeChatPayload,
} from '@/lib/chat-security';

function makeRequest(ip: string): NextRequest {
  return new NextRequest('https://example.test/api/chat', {
    headers: {
      'x-forwarded-for': ip,
    },
  });
}

describe('chat-security', () => {
  beforeEach(() => {
    __unsafeResetChatRateLimitStore();
    vi.restoreAllMocks();
  });

  it('tracks rate limit per ip with expected remaining count', () => {
    const request = makeRequest('10.0.0.1');
    const first = applyChatRateLimit(request);
    const second = applyChatRateLimit(request);

    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(19);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(18);
  });

  it('prunes stale rate-limit entries as time advances', () => {
    vi.spyOn(Date, 'now').mockReturnValue(0);
    for (let i = 0; i < 25; i += 1) {
      applyChatRateLimit(makeRequest(`10.0.0.${i}`));
    }
    expect(__unsafeGetChatRateLimitStoreSize()).toBe(25);

    vi.spyOn(Date, 'now').mockReturnValue(120_001);
    applyChatRateLimit(makeRequest('10.0.1.1'));

    expect(__unsafeGetChatRateLimitStoreSize()).toBe(1);
  });

  it('normalizes assistant role to model in history payload', () => {
    const payload = validateAndNormalizeChatPayload({
      message: 'hello',
      history: [{ role: 'assistant', content: 'hello back' }],
    });
    expect(payload.history[0].role).toBe('model');
  });

  it('sanitizes metadata and caps correlation insights', () => {
    const metadata = validateAndNormalizeChatMetadata({
      stream: true,
      persistConversation: true,
      includePersistedMemory: true,
      userId: ' user-1 ',
      source: ' onboarding ',
      systemPrompt: `  ${'x'.repeat(5000)}  `,
      correlationInsights: Array.from({ length: 20 }, (_, index) => ({
        dimensionA: `A-${index}`,
        dimensionB: `B-${index}`,
        coefficient: 0.6,
        lagDays: 1,
        confidence: 0.9,
      })),
    });

    expect(metadata.stream).toBe(true);
    expect(metadata.persistConversation).toBe(true);
    expect(metadata.includePersistedMemory).toBe(true);
    expect(metadata.userId).toBe('user-1');
    expect(metadata.source).toBe('onboarding');
    expect((metadata.systemPrompt ?? '').length).toBeLessThanOrEqual(2000);
    expect(metadata.correlationInsights).toHaveLength(5);
  });

  it('drops invalid metadata fields safely', () => {
    const metadata = validateAndNormalizeChatMetadata({
      stream: 'yes',
      persistConversation: 1,
      includePersistedMemory: 'true',
      userId: 42,
      source: [],
      systemPrompt: '',
      correlationInsights: [{ dimensionA: 12, coefficient: 'bad' }],
    });

    expect(metadata.stream).toBeUndefined();
    expect(metadata.persistConversation).toBeUndefined();
    expect(metadata.includePersistedMemory).toBeUndefined();
    expect(metadata.userId).toBeUndefined();
    expect(metadata.source).toBeUndefined();
    expect(metadata.systemPrompt).toBeUndefined();
    expect(metadata.correlationInsights).toEqual([]);
  });
});
