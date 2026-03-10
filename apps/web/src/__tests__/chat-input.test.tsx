import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatInput from '@/components/mentors/chat-input';

describe('ChatInput', () => {
  it('renders a text input and send button', () => {
    render(<ChatInput onSend={vi.fn()} disabled={false} />);
    expect(screen.getByPlaceholderText(/message/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /send/i })).toBeDefined();
  });

  it('calls onSend with input value on submit', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} disabled={false} />);

    const input = screen.getByPlaceholderText(/message/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Hello!' } });
    fireEvent.submit(input.closest('form')!);

    expect(onSend).toHaveBeenCalledWith('Hello!');
  });

  it('clears the input after sending', () => {
    render(<ChatInput onSend={vi.fn()} disabled={false} />);

    const input = screen.getByPlaceholderText(/message/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Hello!' } });
    fireEvent.submit(input.closest('form')!);

    expect(input.value).toBe('');
  });

  it('does not send empty messages', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} disabled={false} />);

    fireEvent.submit(screen.getByPlaceholderText(/message/i).closest('form')!);

    expect(onSend).not.toHaveBeenCalled();
  });

  it('disables input and button when disabled prop is true', () => {
    render(<ChatInput onSend={vi.fn()} disabled={true} />);

    const input = screen.getByPlaceholderText(/message/i) as HTMLInputElement;
    const button = screen.getByRole('button', { name: /send/i }) as HTMLButtonElement;

    expect(input.disabled).toBe(true);
    expect(button.disabled).toBe(true);
  });
});
