import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Hoisted mocks ---
const mocks = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGenerateContent: vi.fn(),
  mockSendMessage: vi.fn(),
  mockSendMessageStream: vi.fn(),
  mockStartChat: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mocks.mockGetUser,
    },
  })),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mocks.mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  })),
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: vi.fn(() => ({
      startChat: mocks.mockStartChat.mockReturnValue({
        sendMessage: mocks.mockSendMessage,
        sendMessageStream: mocks.mockSendMessageStream,
      }),
    })),
  })),
}));

// Set required env vars before importing route
vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'test-api-key');
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');

// Import AFTER mocks
const { POST } = await import('@/app/api/chat/route');

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/chat', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Chat route crisis detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    });
    mocks.mockSendMessage.mockResolvedValue({
      response: Promise.resolve({ text: () => 'normal response' }),
    });
    mocks.mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    });
  });

  it('returns crisis response for a crisis message', async () => {
    const req = makeRequest({ message: 'I want to kill myself' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.crisis).toBeDefined();
    expect(json.crisis.level).toBe('high');
    expect(json.text).toBeTruthy();
    expect(json.crisis.resources).toBeInstanceOf(Array);
    expect(json.crisis.resources.length).toBeGreaterThan(0);
  });

  it('does NOT return crisis response for a normal message', async () => {
    const req = makeRequest({ message: 'How can I improve my morning routine?' });
    const res = await POST(req);
    const json = await res.json();

    expect(json.crisis).toBeUndefined();
    expect(json.text).toBe('normal response');
  });

  it('includes Lifeline in crisis resources', async () => {
    const req = makeRequest({ message: 'I want to end my life' });
    const res = await POST(req);
    const json = await res.json();

    const lifeline = json.crisis.resources.find(
      (r: { name: string }) => r.name === 'Lifeline'
    );
    expect(lifeline).toBeDefined();
    expect(lifeline.phone).toBe('13 11 14');
  });

  it('does NOT call the LLM when crisis is detected', async () => {
    const req = makeRequest({ message: 'I want to kill myself' });
    await POST(req);

    expect(mocks.mockStartChat).not.toHaveBeenCalled();
    expect(mocks.mockSendMessage).not.toHaveBeenCalled();
    expect(mocks.mockSendMessageStream).not.toHaveBeenCalled();
  });

  it('logs crisis event to supabase', async () => {
    const req = makeRequest({ message: 'I want to kill myself' });
    await POST(req);

    // Allow fire-and-forget promise to resolve
    await new Promise((r) => setTimeout(r, 10));

    expect(mocks.mockFrom).toHaveBeenCalledWith('crisis_events');
  });
});
