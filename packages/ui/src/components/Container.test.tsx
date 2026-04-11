import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Container } from './Container';

describe('Container', () => {
  it('renders with default max-w-6xl', () => {
    const { container } = render(<Container>Content</Container>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('max-w-6xl');
  });

  it('applies sm size variant', () => {
    const { container } = render(<Container size="sm">Content</Container>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('max-w-lg');
  });

  it('applies md size variant', () => {
    const { container } = render(<Container size="md">Content</Container>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('max-w-4xl');
  });

  it('applies full size variant', () => {
    const { container } = render(<Container size="full">Content</Container>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('max-w-full');
  });

  it('renders children', () => {
    render(<Container>Hello world</Container>);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('merges custom className', () => {
    const { container } = render(<Container className="bg-blue-100">Content</Container>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('bg-blue-100');
    expect(wrapper.className).toContain('mx-auto');
  });
});
