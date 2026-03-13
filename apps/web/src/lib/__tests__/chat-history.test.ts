import { describe, expect, it } from 'vitest';
import { buildBoundedHistory, type ChatHistoryItem } from '@/lib/chat-history';

describe('chat-history', () => {
  it('keeps most recent turns within character budget', () => {
    const history: ChatHistoryItem[] = Array.from({ length: 10 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: `turn-${index}-${'x'.repeat(400)}`,
    }));

    const bounded = buildBoundedHistory(history, 1200);
    expect(bounded.length).toBeLessThan(history.length);
    expect(bounded.at(-1)?.content.startsWith('turn-9-')).toBe(true);
  });

  it('normalizes assistant role to model for chat API', () => {
    const bounded = buildBoundedHistory(
      [
        { role: 'assistant', content: 'a' },
        { role: 'user', content: 'b' },
      ],
      1000,
    );

    expect(bounded[0].role).toBe('model');
    expect(bounded[1].role).toBe('user');
  });
});
