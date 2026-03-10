import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Dimension, DurationType } from '@life-design/core';

const { mockGetUser, mockCreateCheckIn, mockGetCheckInByDate } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockCreateCheckIn: vi.fn(),
  mockGetCheckInByDate: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock('@/lib/services/checkin-service', () => ({
  createCheckIn: mockCreateCheckIn,
  getCheckInByDate: mockGetCheckInByDate,
}));

import { submitCheckIn } from '@/app/(protected)/checkin/actions';

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-1' } },
  });
});

describe('submitCheckIn', () => {
  const validInput = {
    date: '2025-06-15',
    mood: 7,
    durationType: DurationType.Quick,
    scores: [
      { dimension: Dimension.Career, score: 8 },
      { dimension: Dimension.Health, score: 6 },
    ],
  };

  it('creates check-in for authenticated user', async () => {
    mockGetCheckInByDate.mockResolvedValue({ data: null, error: null });
    mockCreateCheckIn.mockResolvedValue({
      data: { id: 'checkin-1' },
      error: null,
    });

    const result = await submitCheckIn(validInput);

    expect(result.error).toBeNull();
    expect(mockCreateCheckIn).toHaveBeenCalledWith('user-1', validInput);
  });

  it('returns error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await submitCheckIn(validInput);

    expect(result.error).toBe('Not authenticated');
    expect(mockCreateCheckIn).not.toHaveBeenCalled();
  });

  it('returns error when check-in already exists for date', async () => {
    mockGetCheckInByDate.mockResolvedValue({
      data: { id: 'existing-checkin' },
      error: null,
    });

    const result = await submitCheckIn(validInput);

    expect(result.error).toBe('Check-in already exists for this date');
    expect(mockCreateCheckIn).not.toHaveBeenCalled();
  });

  it('validates mood score is between 1 and 10', async () => {
    mockGetCheckInByDate.mockResolvedValue({ data: null, error: null });

    const result = await submitCheckIn({
      ...validInput,
      mood: 11,
    });

    expect(result.error).toBe('Mood must be an integer between 1 and 10');
    expect(mockCreateCheckIn).not.toHaveBeenCalled();
  });

  it('validates dimension scores are between 1 and 10', async () => {
    mockGetCheckInByDate.mockResolvedValue({ data: null, error: null });

    const result = await submitCheckIn({
      ...validInput,
      scores: [{ dimension: Dimension.Career, score: 0 }],
    });

    expect(result.error).toBe('All dimension scores must be integers between 1 and 10');
    expect(mockCreateCheckIn).not.toHaveBeenCalled();
  });

  it('returns error from service layer', async () => {
    mockGetCheckInByDate.mockResolvedValue({ data: null, error: null });
    mockCreateCheckIn.mockResolvedValue({
      data: null,
      error: 'Database error',
    });

    const result = await submitCheckIn(validInput);

    expect(result.error).toBe('Database error');
  });
});
