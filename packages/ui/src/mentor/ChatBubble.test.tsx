import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChatBubble } from './ChatBubble';

describe('ChatBubble', () => {
  it('renders user message', () => {
    render(<ChatBubble message="Hello!" sender="user" />);
    expect(screen.getByText('Hello!')).toBeInTheDocument();
  });

  it('renders mentor message', () => {
    render(<ChatBubble message="Hi there" sender="mentor" />);
    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });

  it('renders timestamp when provided', () => {
    render(<ChatBubble message="Hello" sender="user" timestamp="10:30 AM" />);
    expect(screen.getByText('10:30 AM')).toBeInTheDocument();
  });

  it('shows typing indicator when isTyping is true', () => {
    render(<ChatBubble message="" sender="mentor" isTyping />);
    expect(screen.getByLabelText('Typing indicator')).toBeInTheDocument();
  });

  it('does not show message content when typing', () => {
    render(<ChatBubble message="hidden" sender="mentor" isTyping />);
    expect(screen.queryByText('hidden')).not.toBeInTheDocument();
  });

  it('aligns user messages to the right', () => {
    const { container } = render(<ChatBubble message="Hello" sender="user" />);
    expect(container.firstChild).toHaveClass('justify-end');
  });

  it('aligns mentor messages to the left', () => {
    const { container } = render(<ChatBubble message="Hello" sender="mentor" />);
    expect(container.firstChild).toHaveClass('justify-start');
  });

  it('merges custom className', () => {
    const { container } = render(<ChatBubble message="Hi" sender="user" className="custom" />);
    expect(container.firstChild).toHaveClass('custom');
  });
});
