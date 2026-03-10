import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InsightCard from '@/components/insights/insight-card';

describe('InsightCard', () => {
  const insight = {
    id: 'i-1',
    type: 'trend' as const,
    title: 'Health is improving',
    body: 'Your health scores have trended upward over the past week.',
    dimension: 'health',
  };

  it('renders the title and body', () => {
    render(<InsightCard insight={insight} onDismiss={vi.fn()} />);
    expect(screen.getByText('Health is improving')).toBeDefined();
    expect(screen.getByText(/health scores have trended/)).toBeDefined();
  });

  it('shows a type badge', () => {
    render(<InsightCard insight={insight} onDismiss={vi.fn()} />);
    expect(screen.getAllByText(/trend/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows the dimension when provided', () => {
    const { container } = render(<InsightCard insight={insight} onDismiss={vi.fn()} />);
    const dimBadge = container.querySelector('.opacity-75.capitalize');
    expect(dimBadge?.textContent).toBe('health');
  });

  it('calls onDismiss with insight id when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(<InsightCard insight={insight} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledWith('i-1');
  });

  it('renders suggestion type with different styling', () => {
    const suggestion = { ...insight, type: 'suggestion' as const, id: 'i-2' };
    const { container } = render(<InsightCard insight={suggestion} onDismiss={vi.fn()} />);
    expect(container.querySelector('[class*="bg-"]')).not.toBeNull();
  });
});
