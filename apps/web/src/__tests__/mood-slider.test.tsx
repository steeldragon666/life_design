import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MoodSlider from '@/components/checkin/mood-slider';

describe('MoodSlider', () => {
  it('renders with default value', () => {
    render(<MoodSlider value={5} onChange={() => {}} />);

    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveValue('5');
  });

  it('displays the current mood value', () => {
    render(<MoodSlider value={7} onChange={() => {}} />);

    expect(screen.getByText(/7/)).toBeInTheDocument();
  });

  it('calls onChange when slider value changes', () => {
    const onChange = vi.fn();
    render(<MoodSlider value={5} onChange={onChange} />);

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '8' } });

    expect(onChange).toHaveBeenCalledWith(8);
  });

  it('has min 1 and max 10', () => {
    render(<MoodSlider value={5} onChange={() => {}} />);

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '1');
    expect(slider).toHaveAttribute('max', '10');
  });

  it('shows low mood emoji for values 1-3', () => {
    render(<MoodSlider value={2} onChange={() => {}} />);
    expect(screen.getByText(/😔/)).toBeInTheDocument();
  });

  it('shows neutral emoji for values 4-6', () => {
    render(<MoodSlider value={5} onChange={() => {}} />);
    expect(screen.getByText(/😐/)).toBeInTheDocument();
  });

  it('shows happy emoji for values 7-10', () => {
    render(<MoodSlider value={9} onChange={() => {}} />);
    expect(screen.getByText(/😊/)).toBeInTheDocument();
  });

  it('displays "Mood" label', () => {
    render(<MoodSlider value={5} onChange={() => {}} />);
    expect(screen.getByText('Mood')).toBeInTheDocument();
  });
});
