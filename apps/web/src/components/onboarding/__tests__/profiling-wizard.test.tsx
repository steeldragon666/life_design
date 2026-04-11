import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import ProfilingWizard from '../profiling-wizard';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  }),
}));

// Mock GuestProvider's useGuest hook
const mockSetProfile = vi.fn();
vi.mock('@/lib/guest-context', () => ({
  useGuest: () => ({
    profile: null,
    setProfile: mockSetProfile,
    goals: [],
    setGoals: vi.fn(),
    checkins: [],
    addCheckin: vi.fn(),
    conversationMemory: [],
    addConversationMemory: vi.fn(),
    integrations: [],
    setIntegrations: vi.fn(),
    clearAll: vi.fn(),
  }),
}));

// Mock fetch responses
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('ProfilingWizard', () => {
  it('shows section intro after initialisation', async () => {
    // Guest mode: no saved session -> starts fresh
    render(<ProfilingWizard />);
    await waitFor(() => {
      expect(screen.getByText('Your Goal')).toBeInTheDocument();
    });
  });

  it('redirects to dashboard if onboarding already completed', async () => {
    // Guest mode: saved completed session
    localStorage.setItem('opt-in-onboarding-session', JSON.stringify({
      status: 'completed',
      raw_answers: {},
    }));
    render(<ProfilingWizard />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });
});
