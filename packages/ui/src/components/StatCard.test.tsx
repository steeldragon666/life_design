import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatCard } from './StatCard';

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="Total Score" value={85} />);
    expect(screen.getByText('Total Score')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('shows trend icon and percentage when provided', () => {
    render(<StatCard label="Score" value={42} trend="up" changePercent={12.5} />);
    const trendEl = screen.getByLabelText('Trending up');
    expect(trendEl).toBeInTheDocument();
    expect(trendEl).toHaveTextContent('12.5%');
  });

  it('shows down trend with correct color class', () => {
    render(<StatCard label="Score" value={30} trend="down" changePercent={3.2} />);
    const trendEl = screen.getByLabelText('Trending down');
    expect(trendEl).toBeInTheDocument();
    expect(trendEl.className).toContain('text-destructive');
  });

  it('shows flat trend with correct color class', () => {
    render(<StatCard label="Score" value={50} trend="flat" />);
    const trendEl = screen.getByLabelText('No change');
    expect(trendEl).toBeInTheDocument();
    expect(trendEl.className).toContain('text-stone-400');
  });

  it('renders sparkline slot', () => {
    render(
      <StatCard
        label="Progress"
        value="78%"
        sparkline={<div data-testid="sparkline">sparkline chart</div>}
      />
    );
    expect(screen.getByTestId('sparkline')).toBeInTheDocument();
  });

  it('applies variant classes', () => {
    const { container } = render(
      <StatCard label="Score" value={100} variant="glass" />
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('backdrop-blur-md');
  });
});
