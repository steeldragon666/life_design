import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dimension, DIMENSION_LABELS } from '@life-design/core';
import WheelOfLife from '@/components/dashboard/wheel-of-life';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: any }) => (
      <div style={{ width: 800, height: 600 }}>{children}</div>
    ),
  };
});

// Recharts uses ResizeObserver internally
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

describe('WheelOfLife', () => {
  const scores = [
    { dimension: Dimension.Career, score: 8 },
    { dimension: Dimension.Finance, score: 6 },
    { dimension: Dimension.Health, score: 7 },
    { dimension: Dimension.Fitness, score: 5 },
    { dimension: Dimension.Family, score: 9 },
    { dimension: Dimension.Social, score: 4 },
    { dimension: Dimension.Romance, score: 6 },
    { dimension: Dimension.Growth, score: 8 },
  ];

  it('renders without crashing', () => {
    const { container } = render(<WheelOfLife scores={scores} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders a heading', () => {
    render(<WheelOfLife scores={scores} />);
    expect(screen.getByText(/wheel of life/i)).toBeInTheDocument();
  });

  it('renders with empty scores', () => {
    const { container } = render(<WheelOfLife scores={[]} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows "No data" message when scores are empty', () => {
    render(<WheelOfLife scores={[]} />);
    expect(screen.getByText(/complete a check-in to visualize your dimensions/i)).toBeInTheDocument();
  });
});
