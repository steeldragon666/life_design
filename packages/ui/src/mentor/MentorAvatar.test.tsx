import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MentorAvatar } from './MentorAvatar';

describe('MentorAvatar', () => {
  it('renders with name initials when no src', () => {
    render(<MentorAvatar name="Life Mentor" />);
    expect(screen.getByText('LM')).toBeInTheDocument();
  });

  it('defaults to idle status', () => {
    const { container } = render(<MentorAvatar name="Mentor" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).not.toContain('animate-pulse');
  });

  it('applies pulse animation for speaking status', () => {
    const { container } = render(<MentorAvatar name="Mentor" status="speaking" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('animate-pulse');
  });

  it('shows thinking dots for thinking status', () => {
    const { container } = render(<MentorAvatar name="Mentor" status="thinking" />);
    const dots = container.querySelectorAll('.animate-bounce');
    expect(dots.length).toBe(3);
  });

  it('merges custom className', () => {
    const { container } = render(<MentorAvatar name="Mentor" className="custom" />);
    expect(container.firstChild).toHaveClass('custom');
  });
});
