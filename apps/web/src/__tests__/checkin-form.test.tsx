import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ALL_DIMENSIONS, DIMENSION_LABELS, Dimension } from '@life-design/core';
import CheckInForm from '@/components/checkin/checkin-form';

describe('CheckInForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
  };

  it('renders one-tap mood control in quick mode', () => {
    render(<CheckInForm {...defaultProps} />);
    expect(screen.getByText('Mood')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /quick mood selection/i })).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('renders top 3 dimensions in quick mode', () => {
    render(<CheckInForm {...defaultProps} />);
    for (const dim of ALL_DIMENSIONS.slice(0, 3)) {
      expect(screen.getByText(DIMENSION_LABELS[dim])).toBeInTheDocument();
    }
    for (const dim of ALL_DIMENSIONS.slice(3)) {
      expect(screen.queryByText(DIMENSION_LABELS[dim])).not.toBeInTheDocument();
    }
  });

  it('renders quick/deep mode toggle', () => {
    render(<CheckInForm {...defaultProps} />);
    expect(screen.getByRole('tab', { name: /quick mode/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /deep mode/i })).toBeInTheDocument();
  });

  it('shows note textareas in deep mode', () => {
    render(<CheckInForm {...defaultProps} />);

    // Switch to deep mode
    fireEvent.click(screen.getByRole('tab', { name: /deep mode/i }));

    const textareas = screen.getAllByPlaceholderText(/note/i);
    expect(textareas.length).toBe(8);
  });

  it('does not show note textareas in quick mode', () => {
    render(<CheckInForm {...defaultProps} />);
    expect(screen.queryByPlaceholderText(/note/i)).not.toBeInTheDocument();
  });

  it('renders mood selector in deep mode', () => {
    render(<CheckInForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('tab', { name: /deep mode/i }));
    expect(screen.getByRole('radiogroup', { name: /mood selection/i })).toBeInTheDocument();
  });

  it('renders a submit button', () => {
    render(<CheckInForm {...defaultProps} />);
    expect(screen.getByRole('button', { name: /submit|save/i })).toBeInTheDocument();
  });

  it('calls onSubmit with form data when submitted', () => {
    const onSubmit = vi.fn();
    render(<CheckInForm {...defaultProps} onSubmit={onSubmit} />);

    // Set mood via quick mode segment
    fireEvent.click(screen.getByRole('radio', { name: /good mood 4 out of 5/i }));

    // Set a dimension score
    const careerButtons = screen.getByText('Career')
      .closest('div')!
      .querySelectorAll('button');
    // Click button for a dimension score (1-5 scale)
    fireEvent.click(careerButtons[3]);

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /submit|save/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const callArg = onSubmit.mock.calls[0][0];
    expect(callArg.mood).toBe(4);
    expect(callArg.scores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dimension: 'career', score: 4 }),
      ]),
    );
  });

  it('prefills mood and scores from initial values', () => {
    const onSubmit = vi.fn();
    render(
      <CheckInForm
        {...defaultProps}
        onSubmit={onSubmit}
        initialValues={{
          mood: 4,
          scores: {
            [Dimension.Career]: 4,
            [Dimension.Finance]: 3,
          },
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /save check-in/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const callArg = onSubmit.mock.calls[0][0];
    expect(callArg.mood).toBe(4);
    expect(callArg.scores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dimension: 'career', score: 4 }),
        expect.objectContaining({ dimension: 'finance', score: 3 }),
      ]),
    );
  });
});
