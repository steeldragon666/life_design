import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Dimension } from '@life-design/core';

const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

import {
  getLatestScores,
  getScoreHistory,
  getStreakData,
} from '@/lib/services/dashboard-service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getLatestScores', () => {
  it('returns dimension scores from the most recent check-in', async () => {
    const scores = [
      { dimension: 'career', score: 8 },
      { dimension: 'health', score: 6 },
    ];

    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: mockSingle.mockResolvedValue({
                data: { dimension_scores: scores },
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    const result = await getLatestScores('user-1');

    expect(result.data).toEqual(scores);
    expect(result.error).toBeNull();
    expect(mockFrom).toHaveBeenCalledWith('checkins');
  });

  it('returns empty array when no check-ins exist', async () => {
    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: mockSingle.mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'not found' },
              }),
            }),
          }),
        }),
      }),
    });

    const result = await getLatestScores('user-1');

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });
});

describe('getScoreHistory', () => {
  it('returns check-ins with scores for the given period', async () => {
    const rows = [
      {
        date: '2025-06-15',
        mood: 7,
        dimension_scores: [{ dimension: 'career', score: 8 }],
      },
      {
        date: '2025-06-14',
        mood: 6,
        dimension_scores: [{ dimension: 'career', score: 7 }],
      },
    ];

    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: rows,
              error: null,
            }),
          }),
        }),
      }),
    });

    const result = await getScoreHistory('user-1', 7);

    expect(result.data).toEqual(rows);
    expect(result.error).toBeNull();
  });
});

describe('getStreakData', () => {
  it('returns array of check-in dates', async () => {
    const rows = [
      { date: '2025-06-15' },
      { date: '2025-06-14' },
      { date: '2025-06-13' },
    ];

    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: rows,
              error: null,
            }),
          }),
        }),
      }),
    });

    const result = await getStreakData('user-1');

    expect(result.data).toEqual(['2025-06-15', '2025-06-14', '2025-06-13']);
    expect(result.error).toBeNull();
  });

  it('returns empty array when no check-ins', async () => {
    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    });

    const result = await getStreakData('user-1');

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });
});
