import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DimensionGrid } from './DimensionGrid';

const mockDimensions = [
  { name: 'health', label: 'Health', score: 7.5, trend: 'up' as const },
  { name: 'career', label: 'Career', score: 8.0, trend: 'down' as const },
  { name: 'finance', label: 'Finance', score: 6.0 },
];

describe('DimensionGrid', () => {
  it('renders all dimension cards', () => {
    render(<DimensionGrid dimensions={mockDimensions} />);
    expect(screen.getByText('Health')).toBeInTheDocument();
    expect(screen.getByText('Career')).toBeInTheDocument();
    expect(screen.getByText('Finance')).toBeInTheDocument();
  });

  it('renders scores', () => {
    render(<DimensionGrid dimensions={mockDimensions} />);
    expect(screen.getByText('7.5')).toBeInTheDocument();
    expect(screen.getByText('8.0')).toBeInTheDocument();
  });

  it('handles empty dimensions array', () => {
    const { container } = render(<DimensionGrid dimensions={[]} />);
    expect(container.querySelector('.grid')?.children.length).toBe(0);
  });

  it('calls onClick handler on dimension', () => {
    const handleClick = vi.fn();
    render(
      <DimensionGrid
        dimensions={[{ name: 'health', label: 'Health', score: 7, onClick: handleClick }]}
      />
    );
    fireEvent.click(screen.getByText('Health'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('merges custom className', () => {
    const { container } = render(
      <DimensionGrid dimensions={[]} className="custom-grid" />
    );
    expect(container.firstChild).toHaveClass('custom-grid');
  });
});
