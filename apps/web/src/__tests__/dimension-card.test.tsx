import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dimension, DIMENSION_LABELS } from '@life-design/core';
import DimensionCard from '@/components/checkin/dimension-card';

describe('DimensionCard', () => {
  const defaultProps = {
    dimension: Dimension.Career,
    score: 0,
    onScoreChange: vi.fn(),
  };

  it('displays the dimension label', () => {
    render(<DimensionCard {...defaultProps} />);
    expect(screen.getByText(DIMENSION_LABELS[Dimension.Career])).toBeInTheDocument();
  });

  it('renders score buttons 1 through 10', () => {
    render(<DimensionCard {...defaultProps} />);
    for (let i = 1; i <= 10; i++) {
      expect(screen.getByRole('button', { name: String(i) })).toBeInTheDocument();
    }
  });

  it('calls onScoreChange when a score button is clicked', () => {
    const onScoreChange = vi.fn();
    render(<DimensionCard {...defaultProps} onScoreChange={onScoreChange} />);

    fireEvent.click(screen.getByRole('button', { name: '7' }));
    expect(onScoreChange).toHaveBeenCalledWith(Dimension.Career, 7);
  });

  it('highlights the selected score button', () => {
    render(<DimensionCard {...defaultProps} score={5} />);

    const selectedBtn = screen.getByRole('button', { name: '5' });
    expect(selectedBtn.style.backgroundColor).toBeTruthy();
  });

  it('renders optional note textarea when showNote is true', () => {
    render(<DimensionCard {...defaultProps} showNote note="" onNoteChange={() => {}} />);
    expect(screen.getByPlaceholderText(/note/i)).toBeInTheDocument();
  });

  it('does not render note textarea by default', () => {
    render(<DimensionCard {...defaultProps} />);
    expect(screen.queryByPlaceholderText(/note/i)).not.toBeInTheDocument();
  });

  it('calls onNoteChange when note textarea changes', () => {
    const onNoteChange = vi.fn();
    render(
      <DimensionCard
        {...defaultProps}
        showNote
        note=""
        onNoteChange={onNoteChange}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText(/note/i), {
      target: { value: 'Feeling productive' },
    });
    expect(onNoteChange).toHaveBeenCalledWith(Dimension.Career, 'Feeling productive');
  });
});
