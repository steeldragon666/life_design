import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the client module
vi.mock('../client', () => ({
  getGeminiClient: vi.fn(),
}));

import { getGeminiClient } from '../client';
import { sendMentorMessage } from '../chat';

const mockSendMessage = vi.fn();
const mockStartChat = vi.fn(() => ({
  sendMessage: mockSendMessage,
}));
const mockGetGenerativeModel = vi.fn(() => ({
  startChat: mockStartChat,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getGeminiClient).mockReturnValue({
    getGenerativeModel: mockGetGenerativeModel,
  } as any);
  mockSendMessage.mockResolvedValue({
    response: {
      text: () => 'Hello, I am your mentor.',
    },
  });
});

describe('sendMentorMessage', () => {
  it('sends messages to Gemini API with system prompt', async () => {
    mockSendMessage.mockResolvedValue({
      response: {
        text: () => 'Hello, I am your mentor.',
      },
    });

    const result = await sendMentorMessage(
      [{ role: 'user', content: 'How do I stay motivated?' }],
      'You are a life coach.',
    );

    expect(result.text).toBe('Hello, I am your mentor.');
    expect(mockGetGenerativeModel).toHaveBeenCalledWith({
      model: 'gemini-1.5-flash',
      systemInstruction: 'You are a life coach.',
    });
  });

  it('handles multi-turn conversations', async () => {
    mockSendMessage.mockResolvedValue({
      response: {
        text: () => 'Great progress!',
      },
    });

    const messages = [
      { role: 'user' as const, content: 'I scored 8 on career today' },
      { role: 'model' as const, content: 'That is wonderful!' },
      { role: 'user' as const, content: 'What should I focus on next?' },
    ];

    const result = await sendMentorMessage(messages, 'System prompt');

    expect(result.text).toBe('Great progress!');
    expect(mockStartChat).toHaveBeenCalledWith({
      history: expect.arrayContaining([
        expect.objectContaining({ role: 'user', parts: [{ text: 'I scored 8 on career today' }] }),
        expect.objectContaining({ role: 'model', parts: [{ text: 'That is wonderful!' }] }),
      ]),
    });
  });

  it('returns error message on API failure', async () => {
    mockSendMessage.mockRejectedValue(new Error('API rate limit'));

    const result = await sendMentorMessage(
      [{ role: 'user', content: 'Hello' }],
      'System prompt',
    );

    expect(result.text).toBeNull();
    expect(result.error).toBe('API rate limit');
  });

  it('handles empty response text', async () => {
    mockSendMessage.mockResolvedValue({
      response: {
        text: () => '',
      },
    });

    const result = await sendMentorMessage(
      [{ role: 'user', content: 'Hello' }],
      'System prompt',
    );

    expect(result.text).toBe('');
    expect(result.error).toBeNull();
  });
});
