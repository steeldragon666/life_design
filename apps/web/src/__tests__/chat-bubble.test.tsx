import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatBubble from '@/components/mentors/chat-bubble';

describe('ChatBubble', () => {
  it('renders the message content', () => {
    render(<ChatBubble role="user" content="Hello mentor!" />);
    expect(screen.getByText('Hello mentor!')).toBeDefined();
  });

  it('applies user styling for user messages', () => {
    const { container } = render(<ChatBubble role="user" content="My message" />);
    const bubble = container.querySelector('[class*="bg-indigo"]');
    expect(bubble).not.toBeNull();
  });

  it('applies assistant styling for assistant messages', () => {
    const { container } = render(<ChatBubble role="assistant" content="AI response" />);
    const bubble = container.querySelector('[class*="bg-gray"]');
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
});
