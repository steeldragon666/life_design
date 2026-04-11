import { render, screen } from '@testing-library/react';
import { Separator } from './Separator';

describe('Separator', () => {
  it('renders with separator role', () => {
    render(<Separator />);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('has aria-hidden when decorative', () => {
    const { container } = render(<Separator decorative />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveAttribute('aria-hidden', 'true');
  });

  it('horizontal has h-px class', () => {
    render(<Separator orientation="horizontal" />);
    expect(screen.getByRole('separator').className).toContain('h-px');
  });

  it('vertical has w-px class', () => {
    render(<Separator orientation="vertical" />);
    expect(screen.getByRole('separator').className).toContain('w-px');
  });
});
