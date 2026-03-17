import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatBubble, { TypingIndicator } from '@/components/mentors/chat-bubble';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, priority, ...rest } = props;
    return <img {...rest} />;
  },
}));

describe('ChatBubble', () => {
  it('renders the message content', () => {
    render(<ChatBubble role="user" content="Hello mentor!" />);
    expect(screen.getByText('Hello mentor!')).toBeDefined();
  });

  it('applies user styling for user messages', () => {
    const { container } = render(<ChatBubble role="user" content="My message" />);
    const bubble = container.querySelector('[style*="linear-gradient"]');
    expect(bubble).not.toBeNull();
  });

  it('applies assistant styling for assistant messages', () => {
    const { container } = render(<ChatBubble role="assistant" content="AI response" />);
    const bubble = container.querySelector('[class*="bg-white/5"]');
    expect(bubble).not.toBeNull();
  });

  it('aligns user messages to the right', () => {
    const { container } = render(<ChatBubble role="user" content="Right aligned" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toMatch(/justify-end/);
  });

  it('aligns assistant messages to the left', () => {
    const { container } = render(<ChatBubble role="assistant" content="Left aligned" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toMatch(/justify-start/);
  });

  it('renders MentorAvatar for assistant messages when archetype is provided', () => {
    const { container } = render(
      <ChatBubble role="assistant" content="Hello" archetype="therapist" />
    );
    expect(container.querySelector('[aria-label*="Eleanor"]')).not.toBeNull();
  });

  it('renders speak button for assistant messages when onSpeak is provided', () => {
    const onSpeak = vi.fn();
    render(
      <ChatBubble role="assistant" content="Hello" archetype="therapist" onSpeak={onSpeak} />
    );
    const speakBtn = screen.getByLabelText('Speak this message');
    expect(speakBtn).toBeDefined();
  });

  it('renders TypingIndicator with MentorAvatar in thinking state', () => {
    const { container } = render(
      <TypingIndicator archetype="sage" />
    );
    expect(container.querySelector('[aria-label*="Maya"]')).not.toBeNull();
    expect(container.querySelector('[aria-label*="thinking"]')).not.toBeNull();
  });
});
