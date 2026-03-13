import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StreakCounter from '@/components/dashboard/streak-counter';

describe('StreakCounter', () => {
  it('displays the streak count', () => {
    render(<StreakCounter streak={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('displays fire emoji for active streak', () => {
    render(<StreakCounter streak={3} />);
    expect(screen.getByLabelText(/active streak/i)).toBeInTheDocument();
  });

  it('displays "day streak" label', () => {
    render(<StreakCounter streak={7} />);
    expect(screen.getByText(/day streak/i)).toBeInTheDocument();
  });

  it('displays 0 streak without fire emoji', () => {
    render(<StreakCounter streak={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByLabelText(/no active streak/i)).toBeInTheDocument();
  });

  it('uses singular "day" for streak of 1', () => {
    render(<StreakCounter streak={1} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(/day streak/i)).toBeInTheDocument();
  });
});
