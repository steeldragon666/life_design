import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
  })),
}));

import {
  getInsights,
  saveInsight,
  dismissInsight,
} from '@/lib/services/insights-service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getInsights', () => {
  it('returns undismissed insights for a user ordered by date', async () => {
    const insights = [
      { id: 'i-1', title: 'Health improving', type: 'trend' },
      { id: 'i-2', title: 'Try meditation', type: 'suggestion' },
    ];
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: insights, error: null }),
            }),
          }),
        }),
      }),
    });

    const result = await getInsights('u-1');

    expect(result.data).toEqual(insights);
    expect(result.error).toBeNull();
    expect(mockFrom).toHaveBeenCalledWith('insights');
  });
});

describe('saveInsight', () => {
  it('inserts an insight into the database', async () => {
    const insight = {
      id: 'i-3',
      user_id: 'u-1',
      type: 'trend',
      title: 'Career trend',
      body: 'Your career scores are rising.',
      dimension: 'career',
    };
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: insight, error: null }),
        }),
      }),
    });

    const result = await saveInsight('u-1', {
      type: 'trend',
      title: 'Career trend',
      body: 'Your career scores are rising.',
      dimension: 'career',
    });

    expect(result.data).toEqual(insight);
    expect(mockFrom).toHaveBeenCalledWith('insights');
  });
});

describe('dismissInsight', () => {
  it('marks an insight as dismissed', async () => {
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });

    const result = await dismissInsight('i-1');

    expect(result.error).toBeNull();
    expect(mockFrom).toHaveBeenCalledWith('insights');
  });
});
