import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Hello</Card>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('applies default variant classes', () => {
    const { container } = render(<Card>Content</Card>);
    const el = container.firstElementChild!;
    expect(el.className).toContain('bg-white');
    expect(el.className).toContain('border');
  });

  it('applies raised variant classes', () => {
    const { container } = render(<Card variant="raised">Content</Card>);
    expect(container.firstElementChild!.className).toContain('bg-white');
  });

  it('applies sunken variant classes', () => {
    const { container } = render(<Card variant="sunken">Content</Card>);
    expect(container.firstElementChild!.className).toContain('bg-stone-100');
  });

  it('includes hover-lift class when hoverable', () => {
    const { container } = render(<Card hoverable>Hoverable</Card>);
    const el = container.firstElementChild!;
    expect(el.className).toContain('hover-lift');
    expect(el.className).toContain('cursor-pointer');
  });

  it('does not include hover-lift when not hoverable', () => {
    const { container } = render(<Card>Static</Card>);
    expect(container.firstElementChild!.className).not.toContain('hover-lift');
  });

  it('merges custom className', () => {
    const { container } = render(<Card className="mt-4">Styled</Card>);
    expect(container.firstElementChild!.className).toContain('mt-4');
  });
});
