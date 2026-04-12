import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MoodSlider from '@/components/checkin/mood-slider';

describe('MoodSlider', () => {
  it('renders with default value', () => {
    render(<MoodSlider value={3} onChange={() => {}} />);

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(5);
    // "Steady" (value 3) should be selected
    expect(screen.getByRole('radio', { name: /steady mood 3 out of 5/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('displays the current mood label', () => {
    render(<MoodSlider value={4} onChange={() => {}} />);

    expect(screen.getByRole('radio', { name: /good mood 4 out of 5/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onChange when a mood option is clicked', () => {
    const onChange = vi.fn();
    render(<MoodSlider value={3} onChange={onChange} />);

    fireEvent.click(screen.getByRole('radio', { name: /great mood 5 out of 5/i }));

    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('has 5 options for 1-5 scale', () => {
    render(<MoodSlider value={3} onChange={() => {}} />);

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(5);
  });

  it('shows low mood emoji for value 1', () => {
    render(<MoodSlider value={1} onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: /low mood 1 out of 5/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('shows steady emoji for value 3', () => {
    render(<MoodSlider value={3} onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: /steady mood 3 out of 5/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('shows great emoji for value 5', () => {
    render(<MoodSlider value={5} onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: /great mood 5 out of 5/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('displays "Mood" label', () => {
    render(<MoodSlider value={3} onChange={() => {}} />);
    expect(screen.getByText('Mood')).toBeInTheDocument();
  });
});
