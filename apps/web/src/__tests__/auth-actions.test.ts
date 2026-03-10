import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSignUp, mockSignInWithPassword, mockSignOut, mockRedirect } = vi.hoisted(() => ({
  mockSignUp: vi.fn(),
  mockSignInWithPassword: vi.fn(),
  mockSignOut: vi.fn(),
  mockRedirect: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
    },
  })),
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

import { signUp, signIn, signOut } from '@/app/(auth)/actions';

beforeEach(() => {
  vi.clearAllMocks();
  mockRedirect.mockImplementation(() => {
    throw new Error('NEXT_REDIRECT');
  });
});

describe('signUp', () => {
  it('calls supabase auth.signUp with email and password', async () => {
    mockSignUp.mockResolvedValue({ error: null });

    const formData = new FormData();
    formData.set('email', 'test@example.com');
    formData.set('password', 'password123');

    try {
      await signUp(formData);
    } catch (e: unknown) {
      if (e instanceof Error && e.message !== 'NEXT_REDIRECT') throw e;
    }

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('returns error message on failure', async () => {
    mockSignUp.mockResolvedValue({
      error: { message: 'User already exists' },
    });

    const formData = new FormData();
    formData.set('email', 'test@example.com');
    formData.set('password', 'password123');

    const result = await signUp(formData);
    expect(result).toEqual({ error: 'User already exists' });
  });
});

describe('signIn', () => {
  it('calls supabase auth.signInWithPassword', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });

    const formData = new FormData();
    formData.set('email', 'test@example.com');
    formData.set('password', 'password123');

    try {
      await signIn(formData);
    } catch (e: unknown) {
      if (e instanceof Error && e.message !== 'NEXT_REDIRECT') throw e;
    }

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('returns error message on failure', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid credentials' },
    });

    const formData = new FormData();
    formData.set('email', 'test@example.com');
    formData.set('password', 'wrong');

    const result = await signIn(formData);
    expect(result).toEqual({ error: 'Invalid credentials' });
  });
});

describe('signOut', () => {
  it('calls supabase auth.signOut', async () => {
    mockSignOut.mockResolvedValue({ error: null });

    try {
      await signOut();
    } catch (e: unknown) {
      if (e instanceof Error && e.message !== 'NEXT_REDIRECT') throw e;
    }

    expect(mockSignOut).toHaveBeenCalled();
  });
});
