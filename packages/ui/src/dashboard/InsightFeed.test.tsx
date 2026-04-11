import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { InsightFeed } from './InsightFeed';

const mockInsights = [
  { id: '1', title: 'Insight One', body: 'Body of insight one', dimension: 'health', timestamp: '2 hours ago' },
  { id: '2', title: 'Insight Two', body: 'Body of insight two', timestamp: '1 day ago' },
];

describe('InsightFeed', () => {
  it('renders insight titles and bodies', () => {
    render(<InsightFeed insights={mockInsights} />);
    expect(screen.getByText('Insight One')).toBeInTheDocument();
    expect(screen.getByText('Body of insight one')).toBeInTheDocument();
    expect(screen.getByText('Insight Two')).toBeInTheDocument();
  });

  it('renders timestamps', () => {
    render(<InsightFeed insights={mockInsights} />);
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    expect(screen.getByText('1 day ago')).toBeInTheDocument();
  });

  it('returns null for empty insights array', () => {
    const { container } = render(<InsightFeed insights={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('merges custom className', () => {
    const { container } = render(
      <InsightFeed insights={mockInsights} className="custom-feed" />
    );
    expect(container.firstChild).toHaveClass('custom-feed');
  });
});
