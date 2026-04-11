import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BottomNav } from './BottomNav';

const mockItems = [
  { icon: <span data-testid="icon-home">H</span>, label: 'Home', href: '/', active: true },
  { icon: <span data-testid="icon-settings">S</span>, label: 'Settings', href: '/settings' },
];

describe('BottomNav', () => {
  it('renders all nav items', () => {
    render(<BottomNav items={mockItems} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders icons', () => {
    render(<BottomNav items={mockItems} />);
    expect(screen.getByTestId('icon-home')).toBeInTheDocument();
    expect(screen.getByTestId('icon-settings')).toBeInTheDocument();
  });

  it('applies active styles to active item', () => {
    render(<BottomNav items={mockItems} />);
    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink?.className).toContain('text-sage-600');
  });

  it('applies inactive styles to non-active item', () => {
    render(<BottomNav items={mockItems} />);
    const settingsLink = screen.getByText('Settings').closest('a');
    expect(settingsLink?.className).toContain('text-stone-400');
  });

  it('renders correct hrefs', () => {
    render(<BottomNav items={mockItems} />);
    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('merges custom className', () => {
    const { container } = render(<BottomNav items={mockItems} className="custom" />);
    expect(container.firstChild).toHaveClass('custom');
  });
});
