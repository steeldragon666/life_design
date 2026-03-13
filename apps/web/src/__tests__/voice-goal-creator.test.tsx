import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import VoiceGoalCreator from '@/components/goals/voice-goal-creator';

const appendConversationSummary = vi.fn();

vi.mock('@/lib/guest-context', () => ({
  useGuest: () => ({
    profile: { id: 'guest-1' },
    mentorProfile: { characterName: 'Maya', archetype: 'coach' },
    checkins: [],
    conversationMemory: [],
    appendConversationSummary,
  }),
}));

vi.mock('@/lib/mentor-orchestrator', () => ({
  buildMentorSystemPrompt: () => 'System prompt',
}));

vi.mock('@/lib/mood-adapter', () => ({
  inferMoodAdaptation: () => ({ level: 'neutral' }),
}));

describe('VoiceGoalCreator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: null,
      }),
    );
  });

  it('sends bounded conversation history after prior turns', async () => {
    render(<VoiceGoalCreator onCreateGoal={vi.fn()} />);

    const input = screen.getByPlaceholderText(/speak or type your goal intention/i);
    const guideButton = screen.getByRole('button', { name: /guide/i });

    fireEvent.change(input, { target: { value: 'First goal thought' } });
    fireEvent.click(guideButton);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    fireEvent.change(input, { target: { value: 'Second goal thought' } });
    fireEvent.click(guideButton);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    const secondCall = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[1];
    const secondBody = JSON.parse(secondCall[1].body as string) as {
      history?: Array<{ role: string; content: string }>;
    };
    expect(Array.isArray(secondBody.history)).toBe(true);
    expect((secondBody.history ?? []).length).toBeGreaterThan(0);
  });

  it('shows graceful error message when chat request times out', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Request timed out after 20000ms'),
    );

    render(<VoiceGoalCreator onCreateGoal={vi.fn()} />);
    const input = screen.getByPlaceholderText(/speak or type your goal intention/i);
    const guideButton = screen.getByRole('button', { name: /guide/i });

    fireEvent.change(input, { target: { value: 'A difficult goal prompt' } });
    fireEvent.click(guideButton);

    await waitFor(() => {
      expect(
        screen.getByText(/connection was slow/i),
      ).toBeInTheDocument();
    });
  });
});
