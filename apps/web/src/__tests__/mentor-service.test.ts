import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
  })),
}));

import {
  listMentors,
  activateMentor,
  getUserMentors,
  getChatHistory,
  saveChatMessage,
} from '@/lib/services/mentor-service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listMentors', () => {
  it('returns all available mentors', async () => {
    const mentors = [
      { id: '1', name: 'The Stoic', type: 'stoic' },
      { id: '2', name: 'The Coach', type: 'coach' },
    ];
    mockFrom.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: mentors, error: null }),
    });

    const result = await listMentors();

    expect(result.data).toEqual(mentors);
    expect(result.error).toBeNull();
    expect(mockFrom).toHaveBeenCalledWith('mentors');
  });

  it('returns error on failure', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      }),
    });

    const result = await listMentors();

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'DB error' });
  });
});

describe('activateMentor', () => {
  it('creates a user-mentor relationship', async () => {
    const userMentor = { id: 'um-1', user_id: 'u-1', mentor_id: 'm-1', is_active: true };
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: userMentor, error: null }),
        }),
      }),
    });

    const result = await activateMentor('u-1', 'm-1');

    expect(result.data).toEqual(userMentor);
    expect(result.error).toBeNull();
    expect(mockFrom).toHaveBeenCalledWith('user_mentors');
  });
});

describe('getUserMentors', () => {
  it('returns mentors activated by the user', async () => {
    const userMentors = [
      { id: 'um-1', mentor: { id: 'm-1', name: 'The Stoic', type: 'stoic' }, is_active: true },
    ];
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: userMentors, error: null }),
      }),
    });

    const result = await getUserMentors('u-1');

    expect(result.data).toEqual(userMentors);
    expect(result.error).toBeNull();
    expect(mockFrom).toHaveBeenCalledWith('user_mentors');
  });
});

describe('getChatHistory', () => {
  it('returns messages for a user-mentor pair ordered by created_at', async () => {
    const messages = [
      { id: 'msg-1', role: 'user', content: 'Hello' },
      { id: 'msg-2', role: 'assistant', content: 'Hi there!' },
    ];
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: messages, error: null }),
          }),
        }),
      }),
    });

    const result = await getChatHistory('um-1', 50);

    expect(result.data).toEqual(messages);
    expect(result.error).toBeNull();
    expect(mockFrom).toHaveBeenCalledWith('mentor_messages');
  });
});

describe('saveChatMessage', () => {
  it('inserts a message into mentor_messages', async () => {
    const message = { id: 'msg-3', user_mentor_id: 'um-1', role: 'user', content: 'How are you?' };
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: message, error: null }),
        }),
      }),
    });

    const result = await saveChatMessage('um-1', 'user', 'How are you?');

    expect(result.data).toEqual(message);
    expect(result.error).toBeNull();
    expect(mockFrom).toHaveBeenCalledWith('mentor_messages');
  });
});
