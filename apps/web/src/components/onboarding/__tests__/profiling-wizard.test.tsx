import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ProfilingWizard from '../profiling-wizard';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock fetch responses
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  // Default: new session, not started
  // Use mockResolvedValue as a fallback so any extra calls (e.g. from async effects
  // still in flight when a test ends) do not produce unhandled rejections.
  mockFetch
    .mockResolvedValue({
      json: () => Promise.resolve({}),
    })
    .mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 'not_started' }),
    })
    .mockResolvedValueOnce({
      json: () => Promise.resolve({ session_id: 'test-session', resumed: false }),
    });
});

describe('ProfilingWizard', () => {
  it('shows section intro after initialisation', async () => {
    render(<ProfilingWizard />);
    await waitFor(() => {
      expect(screen.getByText('Your Goal')).toBeInTheDocument();
    });
  });

  it('redirects to dashboard if onboarding already completed', async () => {
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValue({
        json: () => Promise.resolve({}),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ status: 'completed' }),
      });
    render(<ProfilingWizard />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });
});
