import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Label</Badge>);
    expect(screen.getByText('Label')).toBeInTheDocument();
  });

  it('applies sage variant by default', () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText('Default').className).toContain('bg-sage-100');
  });

  it('applies destructive variant with token class', () => {
    render(<Badge variant="destructive">Error</Badge>);
    const el = screen.getByText('Error');
    expect(el.className).toContain('text-destructive');
  });

  it('destructive variant does not contain hardcoded hex', () => {
    render(<Badge variant="destructive">Error</Badge>);
    const el = screen.getByText('Error');
    expect(el.className).not.toContain('#CC3333');
    expect(el.className).not.toContain('#cc3333');
  });

  it('merges custom className', () => {
    render(<Badge className="ml-2">Styled</Badge>);
    expect(screen.getByText('Styled').className).toContain('ml-2');
  });
});
