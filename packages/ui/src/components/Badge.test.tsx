import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders text', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
  it('applies sage variant by default', () => {
    const { container } = render(<Badge>Default</Badge>);
    expect((container.firstChild as HTMLElement).className).toContain('bg-sage-100');
  });
  it('applies warm variant', () => {
    const { container } = render(<Badge variant="warm">Warm</Badge>);
    expect((container.firstChild as HTMLElement).className).toContain('bg-warm-100');
  });
  it('applies destructive variant', () => {
    const { container } = render(<Badge variant="destructive">Error</Badge>);
    expect((container.firstChild as HTMLElement).className).toContain('bg-red-50');
  });
});
