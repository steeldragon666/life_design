import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MentorCard from '@/components/mentors/mentor-card';

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
}));

// Mock useElevenLabsTTS hook
const mockSpeak = vi.fn().mockResolvedValue(undefined);
vi.mock('@/hooks/useElevenLabsTTS', () => ({
  useElevenLabsTTS: () => ({
    speak: mockSpeak,
    stop: vi.fn(),
    isSpeaking: false,
    isLoading: false,
    error: null,
  }),
}));

describe('MentorCard', () => {
  const mentor = {
    id: 'm-1',
    name: 'The Stoic',
    type: 'stoic',
    description: 'Ancient wisdom for modern life',
  };

  it('renders mentor name and description', () => {
    render(<MentorCard mentor={mentor} onActivate={vi.fn()} />);
    expect(screen.getByText('The Stoic')).toBeDefined();
    expect(screen.getByText('Ancient wisdom for modern life')).toBeDefined();
  });

  it('shows activate button when not active', () => {
    render(<MentorCard mentor={mentor} onActivate={vi.fn()} />);
    expect(screen.getByRole('button', { name: /activate/i })).toBeDefined();
  });

  it('calls onActivate with mentor id when clicked', () => {
    const onActivate = vi.fn();
    render(<MentorCard mentor={mentor} onActivate={onActivate} />);
    fireEvent.click(screen.getByRole('button', { name: /activate/i }));
    expect(onActivate).toHaveBeenCalledWith('m-1');
  });

  it('shows active state when isActive is true', () => {
    render(<MentorCard mentor={mentor} isActive onActivate={vi.fn()} />);
    expect(screen.getByText(/active/i)).toBeDefined();
  });

  it('shows chat link when isActive and userMentorId provided', () => {
    render(
      <MentorCard
        mentor={mentor}
        isActive
        userMentorId="um-1"
        onActivate={vi.fn()}
      />,
    );
    const chatLink = screen.getByRole('link', { name: /chat/i });
    expect(chatLink).toBeDefined();
    expect(chatLink.getAttribute('href')).toBe('/mentors/um-1/chat');
  });

  it('renders portrait image with MentorAvatar', () => {
    render(<MentorCard mentor={mentor} onActivate={vi.fn()} />);
    // MentorAvatar renders an img element (either from Image or fallback)
    const images = screen.getAllByRole('img');
    // Should have at least one image for the avatar
    expect(images.length).toBeGreaterThan(0);
  });

  it('shows Hear Voice button with aria-label', () => {
    render(<MentorCard mentor={mentor} onActivate={vi.fn()} />);
    const voiceButton = screen.getByRole('button', { name: /hear eleanor/i });
    expect(voiceButton).toBeDefined();
    expect(voiceButton.getAttribute('aria-label')).toBe("Hear Eleanor's voice");
  });

  it('calls speak when voice preview button is clicked', () => {
    mockSpeak.mockClear();
    render(<MentorCard mentor={mentor} onActivate={vi.fn()} />);
    const voiceButton = screen.getByRole('button', { name: /hear eleanor/i });
    fireEvent.click(voiceButton);
    expect(mockSpeak).toHaveBeenCalledTimes(1);
  });
});
