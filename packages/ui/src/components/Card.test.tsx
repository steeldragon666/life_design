import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Content</Card>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
  it('applies default variant styles', () => {
    const { container } = render(<Card>Default</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-white');
    expect(card.className).toContain('border-stone-200');
  });
  it('applies raised variant', () => {
    const { container } = render(<Card variant="raised">Raised</Card>);
    expect((container.firstChild as HTMLElement).className).toContain('shadow-[0_4px_12px');
  });
  it('applies sunken variant', () => {
    const { container } = render(<Card variant="sunken">Sunken</Card>);
    expect((container.firstChild as HTMLElement).className).toContain('bg-stone-100');
  });
  it('applies dimension variant with tinted border', () => {
    const { container } = render(<Card variant="dimension" dimension="career">Career</Card>);
    expect((container.firstChild as HTMLElement).className).toContain('border');
  });
  it('merges custom className', () => {
    const { container } = render(<Card className="mt-8">Styled</Card>);
    expect((container.firstChild as HTMLElement).className).toContain('mt-8');
  });
  it('applies hover classes when hoverable', () => {
    const { container } = render(<Card hoverable>Hover me</Card>);
    expect((container.firstChild as HTMLElement).className).toContain('hover:scale-[1.01]');
  });
});
