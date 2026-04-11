import { render, screen } from '@testing-library/react';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('renders image when src provided', () => {
    render(<Avatar src="https://example.com/photo.jpg" alt="Jane Doe" />);
    const img = screen.getByAltText('Jane Doe');
    expect(img).toBeInTheDocument();
    expect(img.tagName).toBe('IMG');
  });

  it('renders initials fallback when no src', () => {
    render(<Avatar alt="Jane Doe" />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders status indicator when status provided', () => {
    const { container } = render(<Avatar alt="Jane Doe" status="online" />);
    const statusDot = container.querySelector('[data-status="online"]');
    expect(statusDot).toBeInTheDocument();
  });

  it('applies size variants', () => {
    const { container } = render(<Avatar alt="Jane Doe" size="lg" />);
    expect(container.firstChild).toHaveClass('w-12');
  });
});
