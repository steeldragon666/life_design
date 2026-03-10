import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();

vi.mock('../client', () => ({
  getAnthropicClient: vi.fn(() => ({
    messages: {
      create: mockCreate,
    },
  })),
}));

import { sendMentorMessage } from '../chat';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('sendMentorMessage', () => {
  it('sends messages to Claude API with system prompt', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Hello, I am your mentor.' }],
    });

    const result = await sendMentorMessage(
      [{ role: 'user', content: 'How do I stay motivated?' }],
      'You are a life coach.',
    );

    expect(result.text).toBe('Hello, I am your mentor.');
    expect(mockCreate).toHaveBeenCalledWith({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: 'You are a life coach.',
      messages: [{ role: 'user', content: 'How do I stay motivated?' }],
    });
  });

  it('handles multi-turn conversations', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Great progress!' }],
    });

    const messages = [
      { role: 'user' as const, content: 'I scored 8 on career today' },
      { role: 'assistant' as const, content: 'That is wonderful!' },
      { role: 'user' as const, content: 'What should I focus on next?' },
    ];

    const result = await sendMentorMessage(messages, 'System prompt');

    expect(result.text).toBe('Great progress!');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages,
      }),
    );
  });

  it('returns error message on API failure', async () => {
    mockCreate.mockRejectedValue(new Error('API rate limit'));

    const result = await sendMentorMessage(
      [{ role: 'user', content: 'Hello' }],
      'System prompt',
    );

    expect(result.text).toBeNull();
    expect(result.error).toBe('API rate limit');
  });

  it('handles empty content blocks', async () => {
    mockCreate.mockResolvedValue({
      content: [],
    });

    const result = await sendMentorMessage(
      [{ role: 'user', content: 'Hello' }],
      'System prompt',
    );

    expect(result.text).toBe('');
    expect(result.error).toBeNull();
  });
});
