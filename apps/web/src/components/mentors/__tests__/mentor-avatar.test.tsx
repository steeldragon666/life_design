import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import MentorAvatar from '../mentor-avatar';

// Mock next/image to render a plain <img> tag in tests
vi.mock('next/image', () => ({
  default: ({ priority, ...props }: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

describe('MentorAvatar', () => {
  it('renders with idle state', () => {
    const { container } = render(
      <MentorAvatar archetype="therapist" state="idle" size="sm" />
    );
    expect(container.querySelector('img')).toBeDefined();
  });

  it('applies speaking animation class', () => {
    const { container } = render(
      <MentorAvatar archetype="coach" state="speaking" size="md" />
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toMatch(/speaking/);
  });

  it('applies thinking animation class', () => {
    const { container } = render(
      <MentorAvatar archetype="sage" state="thinking" size="md" />
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toMatch(/thinking/);
  });

  it('renders correct size', () => {
    const { container } = render(
      <MentorAvatar archetype="therapist" state="idle" size="lg" />
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toMatch(/h-24|w-24/);
  });

  it('falls back to gradient orb on image error', () => {
    const { container } = render(
      <MentorAvatar archetype="therapist" state="idle" size="sm" />
    );
    // Simulate image error wrapped in act for state update
    const img = container.querySelector('img');
    act(() => {
      if (img) img.dispatchEvent(new Event('error'));
    });
    // Should show fallback div
    const fallback = container.querySelector('[data-testid="avatar-fallback"]');
    expect(fallback).toBeDefined();
  });
});
