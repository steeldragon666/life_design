import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TrendSparkline from '@/components/dashboard/trend-sparkline';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: any }) => (
      <div style={{ width: 800, height: 600 }}>{children}</div>
    ),
  };
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

describe('TrendSparkline', () => {
  it('renders without crashing', () => {
    const data = [
      { date: '2025-06-13', score: 6 },
      { date: '2025-06-14', score: 7 },
      { date: '2025-06-15', score: 8 },
    ];
    const { container } = render(
      <TrendSparkline data={data} label="Career" />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('displays the label', () => {
    const data = [{ date: '2025-06-15', score: 7 }];
    render(<TrendSparkline data={data} label="Health" />);
    expect(screen.getByText('Health')).toBeInTheDocument();
  });

  it('shows trend direction indicator for improving trend', () => {
    const data = [
      { date: '2025-06-13', score: 4 },
      { date: '2025-06-14', score: 6 },
      { date: '2025-06-15', score: 8 },
    ];
    render(<TrendSparkline data={data} label="Career" />);
    expect(screen.getByText(/▲/)).toBeInTheDocument();
  });

  it('shows trend direction indicator for declining trend', () => {
    const data = [
      { date: '2025-06-13', score: 8 },
      { date: '2025-06-14', score: 6 },
      { date: '2025-06-15', score: 4 },
    ];
    render(<TrendSparkline data={data} label="Career" />);
    expect(screen.getByText(/▼/)).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    render(<TrendSparkline data={[]} label="Career" />);
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });
});
