import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
  })),
}));

import {
  getUserIntegrations,
  connectIntegration,
  disconnectIntegration,
} from '@/lib/services/integration-service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getUserIntegrations', () => {
  it('returns all integrations for a user', async () => {
    const integrations = [
      { id: 'int-1', provider: 'strava', status: 'connected' },
    ];
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: integrations, error: null }),
      }),
    });

    const result = await getUserIntegrations('u-1');
    expect(result.data).toEqual(integrations);
    expect(mockFrom).toHaveBeenCalledWith('integrations');
  });
});

describe('connectIntegration', () => {
  it('upserts an integration with connected status', async () => {
    const integration = { id: 'int-1', provider: 'strava', status: 'connected' };
    mockFrom.mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: integration, error: null }),
        }),
      }),
    });

    const result = await connectIntegration('u-1', 'strava', 'token-123', 'refresh-456');
    expect(result.data).toEqual(integration);
    expect(mockFrom).toHaveBeenCalledWith('integrations');
  });
});

describe('disconnectIntegration', () => {
  it('updates integration status to disconnected', async () => {
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });

    const result = await disconnectIntegration('int-1');
    expect(result.error).toBeNull();
    expect(mockFrom).toHaveBeenCalledWith('integrations');
  });
});
