import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DimensionCard } from './DimensionCard';

describe('DimensionCard', () => {
  it('renders dimension label and score', () => {
    render(<DimensionCard dimension="health" label="Health" score={7.5} />);
    expect(screen.getByText('Health')).toBeInTheDocument();
    expect(screen.getByText('7.5')).toBeInTheDocument();
  });

  it('shows trend indicator', () => {
    render(<DimensionCard dimension="career" label="Career" score={8} trend="up" />);
    expect(screen.getByText('↑')).toBeInTheDocument();
  });

  it('shows down trend indicator', () => {
    render(<DimensionCard dimension="finance" label="Finance" score={5} trend="down" />);
    expect(screen.getByText('↓')).toBeInTheDocument();
  });

  it('shows flat trend indicator', () => {
    render(<DimensionCard dimension="social" label="Social" score={6} trend="flat" />);
    expect(screen.getByText('→')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<DimensionCard dimension="health" label="Health" score={7} onClick={handleClick} />);
    fireEvent.click(screen.getByText('Health'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('renders icon slot', () => {
    render(
      <DimensionCard
        dimension="growth"
        label="Growth"
        score={9}
        icon={<span data-testid="dim-icon">icon</span>}
      />
    );
    expect(screen.getByTestId('dim-icon')).toBeInTheDocument();
  });

  it('uses dimension color token for score', () => {
    render(<DimensionCard dimension="health" label="Health" score={8.5} />);
    const scoreEl = screen.getByText('8.5');
    expect(scoreEl.style.color).toBe('var(--color-dim-health)');
  });
});
