import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { NavBar } from './NavBar';

describe('NavBar', () => {
  it('renders logo when provided', () => {
    render(<NavBar logo={<span data-testid="logo">Logo</span>} />);
    expect(screen.getByTestId('logo')).toBeInTheDocument();
  });

  it('renders nav links', () => {
    const links = [
      { label: 'Dashboard', href: '/dashboard', active: true },
      { label: 'Settings', href: '/settings' },
    ];
    render(<NavBar links={links} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('applies active styles to active link', () => {
    const links = [
      { label: 'Dashboard', href: '/dashboard', active: true },
      { label: 'Settings', href: '/settings' },
    ];
    render(<NavBar links={links} />);
    const activeLink = screen.getByText('Dashboard');
    expect(activeLink.className).toContain('text-sage-600');
  });

  it('renders user avatar slot', () => {
    render(<NavBar userAvatar={<span data-testid="avatar">A</span>} />);
    expect(screen.getByTestId('avatar')).toBeInTheDocument();
  });

  it('renders actions slot', () => {
    render(<NavBar actions={<button data-testid="action">Action</button>} />);
    expect(screen.getByTestId('action')).toBeInTheDocument();
  });

  it('merges custom className', () => {
    const { container } = render(<NavBar className="custom-nav" />);
    expect(container.firstChild).toHaveClass('custom-nav');
  });
});
