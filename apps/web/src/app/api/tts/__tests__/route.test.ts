import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => mockFrom(),
        }),
      }),
      upsert: vi.fn().mockResolvedValue({}),
    }),
  }),
}));

// Mock fetch for ElevenLabs
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('/api/tts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ELEVENLABS_API_KEY = 'test-key';
  });

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: 'No user' });

    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/tts', {
      method: 'POST',
      body: JSON.stringify({ text: 'Hello', archetype: 'therapist' }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('returns 503 when API key is not configured', async () => {
    delete process.env.ELEVENLABS_API_KEY;
    mockGetUser.mockResolvedValue({ data: { user: { id: '123' } }, error: null });

    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/tts', {
      method: 'POST',
      body: JSON.stringify({ text: 'Hello', archetype: 'therapist' }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(503);
  });

  it('returns 400 for missing text', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '123' } }, error: null });
    mockFrom.mockResolvedValue({ data: null });

    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/tts', {
      method: 'POST',
      body: JSON.stringify({ archetype: 'therapist' }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 for text exceeding 5000 chars', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '123' } }, error: null });
    mockFrom.mockResolvedValue({ data: null });

    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/tts', {
      method: 'POST',
      body: JSON.stringify({ text: 'x'.repeat(5001), archetype: 'therapist' }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid archetype', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '123' } }, error: null });
    mockFrom.mockResolvedValue({ data: null });

    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/tts', {
      method: 'POST',
      body: JSON.stringify({ text: 'Hello', archetype: 'invalid' }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 429 when rate limit exceeded', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '123' } }, error: null });
    // Simulate a user who has already made 60 requests this hour
    mockFrom.mockResolvedValue({
      data: {
        request_count: 60,
        window_start: new Date().toISOString(), // current window, not expired
      },
    });

    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/tts', {
      method: 'POST',
      body: JSON.stringify({ text: 'Hello', archetype: 'therapist' }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(429);
  });

  it('returns audio stream on valid request', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '123' } }, error: null });
    mockFrom.mockResolvedValue({ data: null }); // no existing rate limit

    const mockBody = new ReadableStream();
    mockFetch.mockResolvedValue({
      ok: true,
      body: mockBody,
      status: 200,
    });

    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/tts', {
      method: 'POST',
      body: JSON.stringify({ text: 'Hello world', archetype: 'therapist' }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('audio/mpeg');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/text-to-speech/'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'xi-api-key': 'test-key' }),
      })
    );
  });
});
