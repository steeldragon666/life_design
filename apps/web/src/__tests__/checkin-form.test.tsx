import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ALL_DIMENSIONS, DIMENSION_LABELS } from '@life-design/core';
import CheckInForm from '@/components/checkin/checkin-form';

describe('CheckInForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
  };

  it('renders mood slider', () => {
    render(<CheckInForm {...defaultProps} />);
    expect(screen.getByText('Mood')).toBeInTheDocument();
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('renders all 8 dimension cards', () => {
    render(<CheckInForm {...defaultProps} />);
    for (const dim of ALL_DIMENSIONS) {
      expect(screen.getByText(DIMENSION_LABELS[dim])).toBeInTheDocument();
    }
  });

  it('renders quick/deep mode toggle', () => {
    render(<CheckInForm {...defaultProps} />);
    expect(screen.getByRole('button', { name: /quick/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /deep/i })).toBeInTheDocument();
  });

  it('shows note textareas in deep mode', () => {
    render(<CheckInForm {...defaultProps} />);

    // Switch to deep mode
    fireEvent.click(screen.getByRole('button', { name: /deep/i }));

    const textareas = screen.getAllByPlaceholderText(/note/i);
    expect(textareas.length).toBe(8);
  });

  it('does not show note textareas in quick mode', () => {
    render(<CheckInForm {...defaultProps} />);
    expect(screen.queryByPlaceholderText(/note/i)).not.toBeInTheDocument();
  });

  it('renders a submit button', () => {
    render(<CheckInForm {...defaultProps} />);
    expect(screen.getByRole('button', { name: /submit|save/i })).toBeInTheDocument();
  });

  it('calls onSubmit with form data when submitted', () => {
    const onSubmit = vi.fn();
    render(<CheckInForm {...defaultProps} onSubmit={onSubmit} />);

    // Set mood
    fireEvent.change(screen.getByRole('slider'), { target: { value: '8' } });

    // Set a dimension score
    const careerButtons = screen.getByText('Career')
      .closest('div')!
      .querySelectorAll('button');
    // Click button "7" (index 6, since buttons are 1-10)
    fireEvent.click(careerButtons[6]);

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /submit|save/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const callArg = onSubmit.mock.calls[0][0];
    expect(callArg.mood).toBe(8);
    expect(callArg.scores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dimension: 'career', score: 7 }),
      ]),
    );
  });
});
