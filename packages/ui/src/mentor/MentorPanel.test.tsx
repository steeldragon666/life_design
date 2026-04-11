import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MentorPanel } from './MentorPanel';

const mockMessages = [
  { id: '1', message: 'Hello!', sender: 'user' as const, timestamp: '10:00 AM' },
  { id: '2', message: 'Hi there, how can I help?', sender: 'mentor' as const, timestamp: '10:01 AM' },
];

describe('MentorPanel', () => {
  it('renders mentor name in header', () => {
    render(<MentorPanel mentorName="Life Coach" messages={[]} onSend={vi.fn()} />);
    expect(screen.getByText('Life Coach')).toBeInTheDocument();
  });

  it('renders messages', () => {
    render(<MentorPanel mentorName="Coach" messages={mockMessages} onSend={vi.fn()} />);
    expect(screen.getByText('Hello!')).toBeInTheDocument();
    expect(screen.getByText('Hi there, how can I help?')).toBeInTheDocument();
  });

  it('shows Online status when not loading', () => {
    render(<MentorPanel mentorName="Coach" messages={[]} onSend={vi.fn()} />);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('shows Thinking status when loading', () => {
    render(<MentorPanel mentorName="Coach" messages={[]} onSend={vi.fn()} isLoading />);
    expect(screen.getByText('Thinking...')).toBeInTheDocument();
  });

  it('calls onSend with message and clears input', () => {
    const onSend = vi.fn();
    render(<MentorPanel mentorName="Coach" messages={[]} onSend={onSend} />);

    const input = screen.getByLabelText('Message input');
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(screen.getByLabelText('Send message'));

    expect(onSend).toHaveBeenCalledWith('Test message');
    expect(input).toHaveValue('');
  });

  it('does not send empty messages', () => {
    const onSend = vi.fn();
    render(<MentorPanel mentorName="Coach" messages={[]} onSend={onSend} />);
    fireEvent.click(screen.getByLabelText('Send message'));
    expect(onSend).not.toHaveBeenCalled();
  });

  it('disables input when loading', () => {
    render(<MentorPanel mentorName="Coach" messages={[]} onSend={vi.fn()} isLoading />);
    expect(screen.getByLabelText('Message input')).toBeDisabled();
  });

  it('has accessible chat log area', () => {
    render(<MentorPanel mentorName="Coach" messages={mockMessages} onSend={vi.fn()} />);
    expect(screen.getByRole('log')).toBeInTheDocument();
  });

  it('merges custom className', () => {
    const { container } = render(
      <MentorPanel mentorName="Coach" messages={[]} onSend={vi.fn()} className="custom" />
    );
    expect(container.firstChild).toHaveClass('custom');
  });
});
