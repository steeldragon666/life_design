import { render, screen } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('renders with role="progressbar" and ARIA attributes', () => {
    render(<ProgressBar value={50} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveAttribute('aria-valuenow', '50');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('clamps value between 0 and 100', () => {
    const { container } = render(<ProgressBar value={150} />);
    const fill = container.querySelector('[role="progressbar"] > div') as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });

  it('clamps negative value to 0', () => {
    const { container } = render(<ProgressBar value={-20} />);
    const fill = container.querySelector('[role="progressbar"] > div') as HTMLElement;
    expect(fill.style.width).toBe('0%');
  });

  it('applies size variants', () => {
    render(<ProgressBar value={50} size="sm" />);
    const bar = screen.getByRole('progressbar');
    expect(bar.className).toContain('h-1');
  });

  it('applies label when provided', () => {
    render(<ProgressBar value={30} label="Loading progress" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-label', 'Loading progress');
  });

  it('supports custom max value', () => {
    render(<ProgressBar value={5} max={10} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemax', '10');
  });

  it('merges custom className', () => {
    render(<ProgressBar value={50} className="mt-4" />);
    const bar = screen.getByRole('progressbar');
    expect(bar.className).toContain('mt-4');
  });
});
