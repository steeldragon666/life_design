import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Dimension, DurationType } from '@life-design/core';

const mockFrom = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

import {
  createCheckIn,
  getCheckInByDate,
  getRecentCheckIns,
  updateCheckIn,
} from '@/lib/services/checkin-service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createCheckIn', () => {
  it('inserts check-in and dimension scores', async () => {
    const checkinRow = {
      id: 'checkin-1',
      user_id: 'user-1',
      date: '2025-06-15',
      mood: 7,
      duration_type: DurationType.Quick,
      journal_entry: null,
      created_at: '2025-06-15T10:00:00Z',
      updated_at: '2025-06-15T10:00:00Z',
    };

    // Mock checkins insert
    mockFrom.mockImplementation((table: string) => {
      if (table === 'checkins') {
        return {
          insert: mockInsert.mockReturnValue({
            select: mockSelect.mockReturnValue({
              single: mockSingle.mockResolvedValue({
                data: checkinRow,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'dimension_scores') {
        return {
          insert: mockInsert.mockResolvedValue({ data: null, error: null }),
        };
      }
      return {};
    });

    const result = await createCheckIn('user-1', {
      date: '2025-06-15',
      mood: 7,
      durationType: DurationType.Quick,
      scores: [
        { dimension: Dimension.Career, score: 8 },
        { dimension: Dimension.Health, score: 6 },
      ],
    });

    expect(result.data).toEqual(checkinRow);
    expect(result.error).toBeNull();
    expect(mockFrom).toHaveBeenCalledWith('checkins');
    expect(mockFrom).toHaveBeenCalledWith('dimension_scores');
  });

  it('returns error when checkin insert fails', async () => {
    mockFrom.mockReturnValue({
      insert: mockInsert.mockReturnValue({
        select: mockSelect.mockReturnValue({
          single: mockSingle.mockResolvedValue({
            data: null,
            error: { message: 'duplicate key' },
          }),
        }),
      }),
    });

    const result = await createCheckIn('user-1', {
      date: '2025-06-15',
      mood: 7,
      durationType: DurationType.Quick,
      scores: [{ dimension: Dimension.Career, score: 8 }],
    });

    expect(result.data).toBeNull();
    expect(result.error).toBe('duplicate key');
  });
});

describe('getCheckInByDate', () => {
  it('fetches check-in with dimension scores for a given date', async () => {
    const checkinWithScores = {
      id: 'checkin-1',
      date: '2025-06-15',
      mood: 7,
      dimension_scores: [
        { dimension: 'career', score: 8 },
      ],
    };

    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle.mockResolvedValue({
              data: checkinWithScores,
              error: null,
            }),
          }),
        }),
      }),
    });

    const result = await getCheckInByDate('user-1', '2025-06-15');

    expect(result.data).toEqual(checkinWithScores);
    expect(mockFrom).toHaveBeenCalledWith('checkins');
  });

  it('returns null when no check-in exists', async () => {
    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle.mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'not found' },
            }),
          }),
        }),
      }),
    });

    const result = await getCheckInByDate('user-1', '2025-06-15');

    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });
});

describe('getRecentCheckIns', () => {
  it('fetches recent check-ins ordered by date desc', async () => {
    const rows = [
      { id: 'c2', date: '2025-06-15', mood: 8 },
      { id: 'c1', date: '2025-06-14', mood: 6 },
    ];

    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: mockOrder.mockReturnValue({
            limit: mockLimit.mockResolvedValue({
              data: rows,
              error: null,
            }),
          }),
        }),
      }),
    });

    const result = await getRecentCheckIns('user-1', 7);

    expect(result.data).toEqual(rows);
    expect(result.error).toBeNull();
  });
});

describe('updateCheckIn', () => {
  it('updates mood and journal entry', async () => {
    const updated = { id: 'checkin-1', mood: 9, journal_entry: 'Great day' };

    mockFrom.mockReturnValue({
      update: mockUpdate.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: mockSelect.mockReturnValue({
            single: mockSingle.mockResolvedValue({
              data: updated,
              error: null,
            }),
          }),
        }),
      }),
    });

    const result = await updateCheckIn('checkin-1', {
      mood: 9,
      journalEntry: 'Great day',
    });

    expect(result.data).toEqual(updated);
    expect(result.error).toBeNull();
  });
});
