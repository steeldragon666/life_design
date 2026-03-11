import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGetUserMentors: vi.fn(),
  mockGetChatHistory: vi.fn(),
  mockSaveChatMessage: vi.fn(),
  mockActivateMentor: vi.fn(),
  mockSendMentorMessage: vi.fn(),
  mockBuildSystemPrompt: vi.fn(),
  mockGetProfile: vi.fn(),
  mockGetGoals: vi.fn(),
  mockBuildWeatherContext: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mocks.mockGetUser },
    from: mocks.mockFrom,
  })),
}));

vi.mock('@/lib/services/mentor-service', () => ({
  getUserMentors: mocks.mockGetUserMentors,
  getChatHistory: mocks.mockGetChatHistory,
  saveChatMessage: mocks.mockSaveChatMessage,
  activateMentor: mocks.mockActivateMentor,
}));

vi.mock('@/lib/services/profile-service', () => ({
  getProfile: mocks.mockGetProfile,
}));

vi.mock('@/lib/services/goal-service', () => ({
  getGoals: mocks.mockGetGoals,
}));

vi.mock('@/lib/integrations/weather', () => ({
  buildWeatherContext: mocks.mockBuildWeatherContext,
}));

vi.mock('@life-design/ai', () => ({
  sendMentorMessage: mocks.mockSendMentorMessage,
  buildSystemPrompt: mocks.mockBuildSystemPrompt,
}));

import { sendMessage, activateUserMentor } from '@/app/(protected)/mentors/actions';

beforeEach(() => {
  vi.clearAllMocks();
  // Default mocks for profile and goals
  mocks.mockGetProfile.mockResolvedValue({ data: null, error: null });
  mocks.mockGetGoals.mockResolvedValue({ data: [], error: null });
  mocks.mockBuildWeatherContext.mockResolvedValue(null);
  // Mock supabase.from() for the latest checkin query
  mocks.mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    }),
  });
});

describe('sendMessage', () => {
  it('sends a message and saves both user and assistant messages', async () => {
    mocks.mockGetUser.mockResolvedValue({
      data: { user: { id: 'u-1' } },
    });
    mocks.mockGetChatHistory.mockResolvedValue({
      data: [
        { role: 'user', content: 'Previous message' },
        { role: 'assistant', content: 'Previous reply' },
      ],
      error: null,
    });
    mocks.mockBuildSystemPrompt.mockReturnValue('You are a stoic mentor.');
    mocks.mockSendMentorMessage.mockResolvedValue({
      text: 'Here is my advice.',
      error: null,
    });
    mocks.mockSaveChatMessage.mockResolvedValue({ data: {}, error: null });

    const result = await sendMessage('um-1', 'stoic', 'How do I handle stress?');

    expect(result.text).toBe('Here is my advice.');
    expect(result.error).toBeNull();
    // Should save both user message and assistant response
    expect(mocks.mockSaveChatMessage).toHaveBeenCalledTimes(2);
    expect(mocks.mockSaveChatMessage).toHaveBeenCalledWith('um-1', 'user', 'How do I handle stress?');
    expect(mocks.mockSaveChatMessage).toHaveBeenCalledWith('um-1', 'assistant', 'Here is my advice.');
  });

  it('returns error when not authenticated', async () => {
    mocks.mockGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await sendMessage('um-1', 'stoic', 'Hello');

    expect(result.error).toBe('Not authenticated');
    expect(result.text).toBeNull();
  });

  it('returns error when AI fails', async () => {
    mocks.mockGetUser.mockResolvedValue({
      data: { user: { id: 'u-1' } },
    });
    mocks.mockGetChatHistory.mockResolvedValue({ data: [], error: null });
    mocks.mockBuildSystemPrompt.mockReturnValue('System prompt');
    mocks.mockSendMentorMessage.mockResolvedValue({
      text: null,
      error: 'API rate limit',
    });
    mocks.mockSaveChatMessage.mockResolvedValue({ data: {}, error: null });

    const result = await sendMessage('um-1', 'stoic', 'Hello');

    expect(result.error).toBe('API rate limit');
    // Should still save the user message
    expect(mocks.mockSaveChatMessage).toHaveBeenCalledWith('um-1', 'user', 'Hello');
    // Should NOT save assistant message on failure
    expect(mocks.mockSaveChatMessage).toHaveBeenCalledTimes(1);
  });
});

describe('activateUserMentor', () => {
  it('activates a mentor for the authenticated user', async () => {
    mocks.mockGetUser.mockResolvedValue({
      data: { user: { id: 'u-1' } },
    });
    mocks.mockActivateMentor.mockResolvedValue({
      data: { id: 'um-1', user_id: 'u-1', mentor_id: 'm-1' },
      error: null,
    });

    const result = await activateUserMentor('m-1');

    expect(result.data).toEqual({ id: 'um-1', user_id: 'u-1', mentor_id: 'm-1' });
    expect(result.error).toBeNull();
    expect(mocks.mockActivateMentor).toHaveBeenCalledWith('u-1', 'm-1');
  });

  it('returns error when not authenticated', async () => {
    mocks.mockGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await activateUserMentor('m-1');

    expect(result.error).toBe('Not authenticated');
  });
});
