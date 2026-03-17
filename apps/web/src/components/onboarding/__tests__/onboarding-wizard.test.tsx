import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FlowStateProvider } from '../flow-state';
import OnboardingWizard from '../onboarding-wizard';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/onboarding',
}));

// Mock guest context
const mockSetProfile = vi.fn();
const mockSetMentorProfile = vi.fn();
vi.mock('@/lib/guest-context', () => ({
  useGuest: () => ({
    profile: null,
    setProfile: mockSetProfile,
    setMentorProfile: mockSetMentorProfile,
    addGoal: vi.fn(),
    addCheckin: vi.fn(),
    appendConversationKeyFact: vi.fn(),
    appendConversationSummary: vi.fn(),
    addIntegration: vi.fn(),
    removeIntegration: vi.fn(),
    setVoicePreference: vi.fn(),
    setSoundscape: vi.fn(),
    setMicroMoments: vi.fn(),
    clearGuestData: vi.fn(),
    goals: [],
    checkins: [],
    conversationMemory: [],
    integrations: [],
    voicePreference: 'calm-british-female',
    mentorProfile: {
      archetype: 'therapist',
      characterName: 'Eleanor',
      voiceId: 'calm-british-female',
      style: { opening: '', affirmation: '', promptStyle: '' },
    },
    soundscape: { enabled: true, volume: 0.18, humEnabled: true, humFrequency: 100 },
    microMoments: { enabled: true, cadence: 'balanced' },
    isGuest: true,
    isHydrated: true,
  }),
  GuestProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock speechSynthesis
Object.defineProperty(window, 'speechSynthesis', {
  value: {
    speak: vi.fn(),
    cancel: vi.fn(),
    getVoices: () => [],
  },
});

function renderWizard() {
  return render(
    <FlowStateProvider>
      <OnboardingWizard />
    </FlowStateProvider>,
  );
}

describe('OnboardingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('renders the welcome step initially', () => {
    renderWizard();
    expect(screen.getByText('Life Design')).toBeInTheDocument();
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });

  it('advances to the name step when Get Started is clicked', async () => {
    renderWizard();
    fireEvent.click(screen.getByText('Get Started'));

    await waitFor(() => {
      expect(screen.getByText(/What should we call you/)).toBeInTheDocument();
    });
  });

  it('disables continue on name step until name is entered', async () => {
    renderWizard();
    fireEvent.click(screen.getByText('Get Started'));

    await waitFor(() => {
      expect(screen.getByText(/What should we call you/)).toBeInTheDocument();
    });

    const continueBtn = screen.getByText('Continue');
    expect(continueBtn).toBeDisabled();

    const input = screen.getByPlaceholderText('Your first name');
    fireEvent.change(input, { target: { value: 'Aaron' } });

    expect(continueBtn).not.toBeDisabled();
  });

  it('shows back button on non-welcome steps', async () => {
    renderWizard();

    // Welcome step should not have back button
    expect(screen.queryByLabelText('Go back')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Get Started'));

    await waitFor(() => {
      expect(screen.getByLabelText('Go back')).toBeInTheDocument();
    });
  });

  it('navigates back from name step to welcome step', async () => {
    renderWizard();
    fireEvent.click(screen.getByText('Get Started'));

    await waitFor(() => {
      expect(screen.getByText(/What should we call you/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Go back'));

    await waitFor(() => {
      expect(screen.getByText('Life Design')).toBeInTheDocument();
      expect(screen.getByText('Get Started')).toBeInTheDocument();
    });
  });
});
