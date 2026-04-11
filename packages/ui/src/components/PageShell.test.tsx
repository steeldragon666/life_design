import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PageShell } from './PageShell';

describe('PageShell', () => {
  it('renders children inside main with id="main"', () => {
    render(<PageShell>Page content</PageShell>);
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main');
    expect(main).toHaveTextContent('Page content');
  });

  it('renders skip-to-content link', () => {
    render(<PageShell>Content</PageShell>);
    const skipLink = screen.getByText('Skip to content');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main');
  });

  it('renders header when provided', () => {
    render(<PageShell header={<div>My Header</div>}>Content</PageShell>);
    const header = screen.getByRole('banner');
    expect(header).toHaveTextContent('My Header');
  });

  it('renders footer when provided', () => {
    render(<PageShell footer={<div>My Footer</div>}>Content</PageShell>);
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent('My Footer');
  });

  it('does not render header or footer when not provided', () => {
    render(<PageShell>Content</PageShell>);
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });

  it('applies centered layout variant by default', () => {
    const { container } = render(<PageShell>Content</PageShell>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('items-center');
  });

  it('applies sidebar layout variant', () => {
    const { container } = render(<PageShell layout="sidebar">Content</PageShell>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('lg:flex-row');
  });

  it('applies custom className', () => {
    const { container } = render(<PageShell className="bg-red-500">Content</PageShell>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('bg-red-500');
  });
});
