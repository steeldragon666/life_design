import { render, screen } from '@testing-library/react';
import { ProgressRing } from './ProgressRing';

describe('ProgressRing', () => {
  it('renders the score value', () => {
    render(<ProgressRing value={7.2} max={10} />);
    expect(screen.getByText('7.2')).toBeInTheDocument();
  });

  it('renders "of 10" caption', () => {
    render(<ProgressRing value={7.2} max={10} />);
    expect(screen.getByText('of 10')).toBeInTheDocument();
  });

  it('renders SVG with circles', () => {
    const { container } = render(<ProgressRing value={5} max={10} />);
    expect(container.querySelectorAll('circle').length).toBeGreaterThanOrEqual(2);
  });
});
